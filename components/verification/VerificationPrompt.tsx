'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, Clock, XCircle, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type UserData, createVerificationSession } from '@/lib/api-client';

export interface VerificationUser extends UserData {
  verification_status?: 'verified' | 'pending' | 'failed' | 'unverified';
}

interface VerificationPromptProps {
  currentUser?: VerificationUser | null;
  message?: string;
}

export default function VerificationPrompt({ currentUser, message = "Verify your identity to unlock all features" }: VerificationPromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const response = await createVerificationSession();
      console.log('Verification session response:', response);
      
      if (response && response.url) {
        console.log('Redirecting to Stripe Identity:', response.url);
        window.location.href = response.url;
      } else {
        console.error('Invalid response structure:', response);
        alert("Failed to get verification URL. Please try again.");
      }
    } catch (error) {
      console.error("Error starting verification:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start verification: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (currentUser?.verification_status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Verification Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Verification Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200">
            <Shield className="w-3 h-3 mr-1" />
            Not Verified
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        {getStatusDisplay()}
      </div>
      
      <p className="text-sm text-slate-600">{message}</p>

      {currentUser?.verification_status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Your verification is being processed. This usually takes a few minutes. Please check back soon.
          </p>
        </div>
      )}

      {currentUser?.verification_status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 mb-3">
            Your verification was unsuccessful. Please try again with a valid government-issued ID.
          </p>
          <Button
            onClick={handleVerify}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Starting Verification...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </div>
      )}

      {(currentUser?.verification_status === 'unverified' || !currentUser?.verification_status) && (
        <Button
          onClick={handleVerify}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 h-12"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Starting Verification...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Verify Identity
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-slate-500 text-center">
        We use Stripe Identity to securely verify your identity. Your documents are encrypted and never stored by us.
      </p>
    </div>
  );
}