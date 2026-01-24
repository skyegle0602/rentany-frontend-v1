'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Clock, TrendingUp, Banknote, Calendar, Package } from 'lucide-react';
import { getCurrentUser, api, type UserData } from '@/lib/api-client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayoutSettings from './PayoutSettings';
import TransactionHistory from './TransactionHistory';

interface WalletData {
  totalEarnings: number;
  completedTransactions: Array<{
    id: string;
    item_title: string;
    item_image?: string;
    amount: number;
    rental_start: string;
    rental_end: string;
    rental_days: number;
    date: string;
  }>;
  heldTransactions: Array<{
    id: string;
    item_title: string;
    item_image?: string;
    amount: number;
    rental_start: string;
    rental_end: string;
    rental_days: number;
  }>;
}

interface Payout {
  id: string;
  user_email: string;
  amount: number;
  status: string;
  created_date: string;
}


export default function WalletOverview() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');

  useEffect(() => {
    loadWalletData();
    
    // Check if user returned from Stripe onboarding
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('stripe') === 'success') {
        // Check Stripe account status to update verification immediately
        const checkStripeStatus = async () => {
          try {
            console.log('🔄 Checking Stripe account status after onboarding...');
            const statusResponse = await api.request('/stripe/connect/status');
            if (statusResponse.success && statusResponse.data) {
              console.log('✅ Stripe account status:', statusResponse.data);
              // Reload wallet data to get updated user info
              await loadWalletData();
            } else {
              console.error('❌ Failed to check Stripe status:', statusResponse.error);
              // Still reload wallet data even if status check fails
              await loadWalletData();
            }
          } catch (error) {
            console.error('❌ Error checking Stripe status:', error);
            // Still reload wallet data even if status check fails
            await loadWalletData();
          }
        };
        
        // Wait a moment for Stripe webhook to process, then check status
        setTimeout(() => {
          checkStripeStatus();
        }, 2000);
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setCurrentUser(user);
      
      // Load wallet data
      const walletResponse = await api.request<WalletData>('/wallet');
      if (walletResponse.success && walletResponse.data) {
        setWalletData(walletResponse.data);
      }

      // Load payouts
      const payoutsResponse = await api.request<Payout[]>('/payouts', {
        method: 'GET',
      });
      if (payoutsResponse.success && payoutsResponse.data) {
        const allPayouts = Array.isArray(payoutsResponse.data) ? payoutsResponse.data : [];
        const userPayouts = allPayouts.filter((p: Payout) => p.user_email === user.email);
        setPayouts(userPayouts);

        if (walletResponse.data) {
          const calculatedAvailableForPayout = walletResponse.data.totalEarnings - userPayouts.reduce((sum, p) => (p.status === 'pending' || p.status === 'in_transit' || p.status === 'paid' ? sum + p.amount : sum), 0);
          setPayoutAmount(calculatedAvailableForPayout > 0 ? calculatedAvailableForPayout : 0);
        }
      }


    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleInitiatePayout = async () => {
    if (!walletDataWithDefaults) return;
    
    const currentAvailableForPayout = walletDataWithDefaults.totalEarnings - payouts.reduce((sum, p) => (p.status === 'pending' || p.status === 'in_transit' || p.status === 'paid' ? sum + p.amount : sum), 0);

    if(payoutAmount <= 0) {
        setPayoutError("Payout amount must be greater than zero.");
        return;
    }
    if(payoutAmount > currentAvailableForPayout) {
        setPayoutError("You cannot withdraw more than your available balance.");
        return;
    }

    setIsProcessingPayout(true);
    setPayoutError(null);
    try {
        const response = await api.request('/stripe/connect/payout', {
          method: 'POST',
          body: JSON.stringify({ amount: payoutAmount }),
        });
        
        if (response.success) {
          alert(`✅ Withdrawal of $${payoutAmount.toFixed(2)} initiated! Funds will arrive in 2-3 business days.`);
          await loadWalletData();
        } else {
          throw new Error(response.error || 'Failed to initiate payout');
        }
    } catch (error: any) {
        console.error("Error initiating payout:", error);
        setPayoutError(error.message || "An unknown error occurred.");
    } finally {
        setIsProcessingPayout(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-28 bg-slate-200 rounded-lg" />
          <div className="h-28 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-40 bg-slate-200 rounded-lg" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">Unable to load user data</p>
      </div>
    );
  }

  // Initialize walletData with defaults if not loaded
  const walletDataWithDefaults: WalletData = walletData || {
    totalEarnings: 0,
    completedTransactions: [],
    heldTransactions: [],
  };

  const availableForPayout = walletDataWithDefaults.totalEarnings - payouts.reduce((sum, p) => (p.status === 'pending' || p.status === 'in_transit' || p.status === 'paid' ? sum + p.amount : sum), 0);

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="settings">Payout Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
             <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Available for Payout</p>
                  <p className="text-3xl font-bold text-green-700">
                    ${availableForPayout > 0 ? availableForPayout.toFixed(2) : '0.00'}
                  </p>
                  <p className="text-xs text-green-600 mt-2">Ready to withdraw</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Lifetime Earnings</p>
                  <p className="text-3xl font-bold text-blue-700">
                    ${walletDataWithDefaults.totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">After 15% platform fee</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Earnings with Tabs */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Earnings Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="completed" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="completed">
                  Completed ({walletDataWithDefaults.completedTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="held">
                  Held ({walletDataWithDefaults.heldTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="payouts">
                  Payouts ({payouts.length})
                </TabsTrigger>
              </TabsList>

              {/* Completed Earnings */}
              <TabsContent value="completed" className="mt-4 space-y-3">
                {walletDataWithDefaults.completedTransactions.length > 0 ? (
                  walletDataWithDefaults.completedTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      {transaction.item_image && (
                        <img 
                          src={transaction.item_image} 
                          alt={transaction.item_title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{transaction.item_title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(transaction.rental_start), 'MMM d')} - {format(new Date(transaction.rental_end), 'MMM d')}
                              </span>
                              <span>•</span>
                              <span>{transaction.rental_days} {transaction.rental_days === 1 ? 'day' : 'days'}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Completed {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-green-700 text-lg">+${transaction.amount.toFixed(2)}</p>
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Earned</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No completed rentals yet</p>
                  </div>
                )}
              </TabsContent>

              {/* Held Earnings */}
              <TabsContent value="held" className="mt-4 space-y-3">
                {walletDataWithDefaults.heldTransactions.length > 0 ? (
                  walletDataWithDefaults.heldTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      {transaction.item_image && (
                        <img 
                          src={transaction.item_image} 
                          alt={transaction.item_title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{transaction.item_title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(transaction.rental_start), 'MMM d')} - {format(new Date(transaction.rental_end), 'MMM d')}
                              </span>
                              <span>•</span>
                              <span>{transaction.rental_days} {transaction.rental_days === 1 ? 'day' : 'days'}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Rental in progress
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-yellow-700 text-lg">${transaction.amount.toFixed(2)}</p>
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Held</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No active rentals</p>
                  </div>
                )}
              </TabsContent>

              {/* Payout History */}
              <TabsContent value="payouts" className="mt-4 space-y-3">
                {payouts.length > 0 ? (
                  payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <p className="font-medium text-slate-900">Withdrawal</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(payout.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">-${payout.amount.toFixed(2)}</p>
                        <Badge variant="secondary" className="capitalize text-xs">{payout.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Banknote className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p>No payouts yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="transactions" className="mt-6">
        <TransactionHistory />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <PayoutSettings />
      </TabsContent>
    </Tabs>
  );
}