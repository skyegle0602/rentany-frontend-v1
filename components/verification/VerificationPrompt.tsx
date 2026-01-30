'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, Clock, XCircle, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type UserData, api } from '@/lib/api-client';

export interface VerificationUser extends UserData {
  verification_status?: 'verified' | 'pending' | 'failed' | 'unverified';
}

interface VerificationPromptProps {
  currentUser?: VerificationUser | null;
  message?: string;
}

export default function VerificationPrompt({ currentUser, message = "Connect your payment account to unlock all features" }: VerificationPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRenter, setIsLoadingRenter] = useState(false);

  // Handler for owner payment verification (Stripe Connect)
  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Get the current path to redirect back after onboarding
      const returnPath = typeof window !== 'undefined' ? window.location.pathname : '/add-item';
      const response = await api.request<{ url: string }>('/stripe/connect/onboarding', {
        method: 'POST',
        body: JSON.stringify({ origin, return_path: returnPath }),
      });
      
      if (response.success && response.data && response.data.url) {
        console.log('Redirecting to Stripe Connect onboarding:', response.data.url);
        // Redirect to Stripe Connect onboarding in the same window
        window.location.href = response.data.url;
      } else {
        console.error('Invalid response structure:', response);
        alert("Failed to get payment connection URL. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error starting payment connection:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start payment connection: ${errorMessage}. Please try again.`);
      setIsLoading(false);
    }
  };

  // Handler for renter payment connection (setting up payment method for card)
  const handleConnectRenterPayment = async () => {
    setIsLoadingRenter(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Get the current path to redirect back after payment method setup
      const returnPath = typeof window !== 'undefined' ? window.location.pathname : '/profile';
      const response = await api.request<{ url: string; session_id?: string }>('/stripe/payment-method/setup', {
        method: 'POST',
        body: JSON.stringify({ origin, return_path: returnPath }),
      });
      
      if (response.success && response.data && response.data.url) {
        console.log('Redirecting to Stripe payment method setup:', response.data.url);
        // Redirect to Stripe Checkout for payment method setup
        window.location.href = response.data.url;
      } else {
        console.error('Invalid response structure:', response);
        alert("Failed to get payment method setup URL. Please try again.");
        setIsLoadingRenter(false);
      }
    } catch (error) {
      console.error("Error starting payment method setup:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start payment method setup: ${errorMessage}. Please try again.`);
      setIsLoadingRenter(false);
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
            Your payment connection is being processed. This usually takes a few minutes. Please check back soon.
          </p>
        </div>
      )}

      {currentUser?.verification_status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 mb-3">
            Your payment connection was unsuccessful. Please try again.
          </p>
          <Button
            onClick={handleVerify}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Connecting Payment...
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

      {/* For renters, check if payment method is connected */}
      {currentUser?.intent === 'renter' && !(currentUser as any).stripe_payment_method_id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 mb-3">
            Connect your card to make rental payments.
          </p>
        </div>
      )}

      {(currentUser?.verification_status === 'unverified' || !currentUser?.verification_status) && (
        <div className="space-y-3">
          {/* Show both buttons when intent is 'both' */}
          {currentUser?.intent === 'both' ? (
            <>
              <Button
                onClick={handleConnectRenterPayment}
                disabled={isLoadingRenter || (currentUser as any).stripe_payment_method_id}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12"
              >
                {isLoadingRenter ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Connecting Card...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Connect Card
                  </>
                )}
              </Button>
              <Button
                onClick={handleVerify}
                disabled={isLoading || currentUser?.verification_status === 'verified'}
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 h-12"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Connecting Bank...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Connect Bank Account
                  </>
                )}
              </Button>
            </>
          ) : (
            /* Show single button for renter or owner */
            <Button
              onClick={currentUser?.intent === 'renter' ? handleConnectRenterPayment : handleVerify}
              disabled={
                currentUser?.intent === 'renter' 
                  ? (isLoadingRenter || !!(currentUser as any).stripe_payment_method_id)
                  : (isLoading || currentUser?.verification_status === 'verified')
              }
              className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            >
              {currentUser?.intent === 'renter' ? (
                isLoadingRenter ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Connecting Card...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Connect Card
                  </>
                )
              ) : (
                isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Connecting Bank...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Connect Bank Account
                  </>
                )
              )}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        We use Stripe to securely process payments. Your payment information is encrypted and securely handled by Stripe.
      </p>
    </div>
  );
}