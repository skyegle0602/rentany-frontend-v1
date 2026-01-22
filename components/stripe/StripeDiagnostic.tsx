'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { api } from '@/lib/api-client';

interface StripeDiagnosticResult {
  success: boolean;
  keyType?: 'TEST' | 'LIVE';
  platformAccount?: {
    email?: string;
    chargesEnabled?: boolean;
    id?: string;
  };
  connectEnabled?: boolean;
  checkoutCapable?: boolean;
  diagnosis?: string;
  error?: string;
  details?: string;
  steps?: string[];
  connectError?: string;
}

export default function StripeDiagnostic() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StripeDiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await api.request<StripeDiagnosticResult>('/stripe/diagnostic', {
        method: 'POST',
      });
      
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setResult({
          success: false,
          error: response.error || 'Failed to run diagnostic',
          details: 'Server returned an error'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run diagnostic',
        details: 'Network or server error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) => ok ? (
    <CheckCircle className="w-5 h-5 text-green-600" />
  ) : (
    <XCircle className="w-5 h-5 text-red-600" />
  );

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-orange-600" />
          Stripe Configuration Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Run this diagnostic to check if Stripe is properly configured for payments.
        </p>

        <Button 
          onClick={runDiagnostic} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            'Run Stripe Diagnostic'
          )}
        </Button>

        {result && (
          <div className="space-y-4 pt-4 border-t border-orange-200">
            {/* Overall Status */}
            <div className={`p-4 rounded-lg ${
              result.connectEnabled && result.checkoutCapable 
                ? 'bg-green-100 border border-green-200' 
                : 'bg-red-100 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.connectEnabled && result.checkoutCapable ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`font-semibold ${
                    result.connectEnabled && result.checkoutCapable 
                      ? 'text-green-800' 
                      : 'text-red-800'
                  }`}>
                    {result.diagnosis || result.error}
                  </h4>
                  {result.details && (
                    <p className="text-sm text-slate-600 mt-1">{result.details}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Checks */}
            {result.success && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Diagnostic Results:</h4>
                
                {/* API Key */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={true} />
                    <span className="text-sm font-medium">API Key</span>
                  </div>
                  <Badge variant={result.keyType === 'TEST' ? 'secondary' : 'destructive'}>
                    {result.keyType} Mode
                  </Badge>
                </div>

                {/* Platform Account */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={result.platformAccount?.chargesEnabled ?? false} />
                    <span className="text-sm font-medium">Platform Account</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {result.platformAccount?.email || 'N/A'}
                  </span>
                </div>

                {/* Connect */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={result.connectEnabled ?? false} />
                    <span className="text-sm font-medium">Stripe Connect</span>
                  </div>
                  <Badge variant={result.connectEnabled ? 'default' : 'destructive'}>
                    {result.connectEnabled ? 'Enabled' : 'Not Enabled'}
                  </Badge>
                </div>

                {/* Checkout */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={result.checkoutCapable ?? false} />
                    <span className="text-sm font-medium">Checkout Sessions</span>
                  </div>
                  <Badge variant={result.checkoutCapable ? 'default' : 'destructive'}>
                    {result.checkoutCapable ? 'Working' : 'Error'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Fix Steps */}
            {result.steps && result.steps.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Steps to Fix:
                </h4>
                <ol className="space-y-2">
                  {result.steps.map((step, i) => (
                    <li key={i} className="text-sm text-yellow-800">{step}</li>
                  ))}
                </ol>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-4 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                  onClick={() => window.open('https://dashboard.stripe.com/settings/connect', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Connect Settings
                </Button>
              </div>
            )}

            {/* Connect Error Details */}
            {result.connectError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Connect Error:</h4>
                <p className="text-sm text-red-700 font-mono">{result.connectError}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}