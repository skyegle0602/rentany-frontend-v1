'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Building2, Loader } from 'lucide-react';
import { type UserData, api } from '@/lib/api-client';
import { canRent, canLend } from '@/lib/user-capabilities';
import PaymentStatusBadges from './PaymentStatusBadges';

interface CapabilityPromptsProps {
  currentUser: UserData | null;
  isAdmin?: boolean;
}

export default function CapabilityPrompts({ currentUser, isAdmin = false }: CapabilityPromptsProps) {
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  const canRentItems = canRent(currentUser, isAdmin);
  const canLendItems = canLend(currentUser, isAdmin);

  // Handler for connecting payment card (to rent items) - Stripe SetupIntent
  const handleConnectCard = async () => {
    setIsLoadingCard(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const returnPath = typeof window !== 'undefined' ? window.location.pathname : '/profile';
      const response = await api.request<{ url: string; session_id?: string }>('/stripe/payment-method/setup', {
        method: 'POST',
        body: JSON.stringify({ origin, return_path: returnPath }),
      });
      
      if (response.success && response.data && response.data.url) {
        console.log('Redirecting to Stripe payment method setup:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('Invalid response structure:', response);
        alert("Failed to get payment method setup URL. Please try again.");
        setIsLoadingCard(false);
      }
    } catch (error) {
      console.error("Error starting payment method setup:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start payment method setup: ${errorMessage}. Please try again.`);
      setIsLoadingCard(false);
    }
  };

  // Handler for connecting bank account (to lend items and receive payouts) - Stripe Connect onboarding
  const handleConnectBank = async () => {
    setIsLoadingBank(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const returnPath = typeof window !== 'undefined' ? window.location.pathname : '/profile';
      const response = await api.request<{ url: string }>('/stripe/connect/onboarding', {
        method: 'POST',
        body: JSON.stringify({ origin, return_path: returnPath }),
      });
      
      if (response.success && response.data && response.data.url) {
        console.log('Redirecting to Stripe Connect onboarding:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('Invalid response structure:', response);
        alert("Failed to get bank connection URL. Please try again.");
        setIsLoadingBank(false);
      }
    } catch (error) {
      console.error("Error starting bank connection:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start bank connection: ${errorMessage}. Please try again.`);
      setIsLoadingBank(false);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Payment Setup Section */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Payment setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badges */}
          <PaymentStatusBadges currentUser={currentUser} isAdmin={isAdmin} size="md" />

          {/* Add Payment Method CTA */}
          <div className="space-y-2">
            <Button
              onClick={handleConnectCard}
              disabled={isLoadingCard || canRentItems}
              variant={canRentItems ? "outline" : "default"}
              className={`w-full ${canRentItems ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {isLoadingCard ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : canRentItems ? (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment method connected
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add payment method
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Stripe SetupIntent (card) - Required to rent items
            </p>
          </div>

          {/* Connect Bank Account CTA */}
          <div className="space-y-2">
            <Button
              onClick={handleConnectBank}
              disabled={isLoadingBank || canLendItems}
              variant={canLendItems ? "outline" : "default"}
              className={`w-full ${canLendItems ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            >
              {isLoadingBank ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : canLendItems ? (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Bank account connected
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Connect bank account
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Stripe Connect onboarding - Required to receive payouts
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
