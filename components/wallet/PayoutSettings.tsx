'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, CreditCard, Building, AlertCircle, Settings } from 'lucide-react';
import { getCurrentUser, api, type UserData } from '@/lib/api-client';

export default function PayoutSettings() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupPayouts = async () => {
    setIsRedirecting(true);
    try {
      const response = await api.request<{ url: string }>('/stripe/connect/onboarding', {
        method: 'POST',
        body: JSON.stringify({ origin: window.location.origin }),
      });
      
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to get onboarding link');
      }
    } catch (error) {
      console.error('Error getting Stripe onboarding link:', error);
      alert('Failed to redirect to payout setup. Please try again.');
      setIsRedirecting(false);
    }
  };

  const handleManagePayouts = async () => {
    setIsRedirecting(true);
    try {
      // Open Stripe Express Dashboard for the user to manage their account
      const response = await api.request<{ url: string }>('/stripe/connect/dashboard', {
        method: 'POST',
        body: JSON.stringify({ origin: window.location.origin }),
      });
      
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to get dashboard link');
      }
    } catch (error) {
      console.error('Error getting Stripe dashboard link:', error);
      alert('Failed to open payout management. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payout Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentUser?.payouts_enabled ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">Payouts Enabled</AlertTitle>
                <AlertDescription className="text-green-800">
                  Your payout account is active and ready to receive funds.
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Bank Account</p>
                      <p className="text-sm text-slate-600">Connected via Stripe</p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Primary Method
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManagePayouts}
                    disabled={isRedirecting}
                  >
                    {isRedirecting ? 'Redirecting...' : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-blue-900">How Payouts Work</p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li>Funds are held securely until rental completion</li>
                      <li>7-day dispute resolution period after completion</li>
                      <li>Automatic payouts processed after dispute period</li>
                      <li>Funds typically arrive in 2-3 business days</li>
                      <li>15% platform fee deducted from earnings</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleManagePayouts}
                disabled={isRedirecting}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {isRedirecting ? 'Redirecting...' : 'Update Bank Details in Stripe'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-900">Setup Required</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  Connect a bank account to receive payouts from your rentals.
                </AlertDescription>
              </Alert>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Setup Your Payouts</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Connect your bank account securely through Stripe to start receiving payments
                    </p>
                  </div>
                  <Button
                    onClick={handleSetupPayouts}
                    disabled={isRedirecting}
                    size="lg"
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    {isRedirecting ? 'Redirecting...' : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect Bank Account
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Why Stripe?</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Bank-level security and encryption</li>
                  <li>Fast and reliable transfers</li>
                  <li>No setup fees or monthly charges</li>
                  <li>Support for all major banks</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Schedule Information */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Payout Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-700">1</span>
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">Rental Completed</p>
                <p className="text-xs text-slate-600 mt-1">Both parties confirm item return and condition</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-700">2</span>
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">7-Day Holding Period</p>
                <p className="text-xs text-slate-600 mt-1">Time window for dispute resolution</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-green-700">3</span>
              </div>
              <div>
                <p className="font-medium text-green-900 text-sm">Automatic Payout</p>
                <p className="text-xs text-green-800 mt-1">Funds transferred to your bank account (85% of rental amount)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}