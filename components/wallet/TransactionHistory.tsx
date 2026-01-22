'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { getCurrentUser, api } from '@/lib/api-client';

interface RentalRequest {
  id: string;
  item_id: string;
  owner_email: string;
  status: string;
  total_amount: number;
  start_date?: string;
  end_date?: string;
  updated_date: string;
}

interface Payout {
  id: string;
  user_email: string;
  amount: number;
  status: string;
  created_date: string;
  arrival_date?: string;
}

interface ItemType {
  id: string;
  title: string;
  [key: string]: any;
}

interface Transaction {
  id: string;
  type: 'earning' | 'payout';
  date: string;
  description: string;
  itemTitle?: string;
  grossAmount?: number;
  platformFee?: number;
  netAmount?: number;
  amount?: number;
  status: string;
  rentalStart?: string;
  rentalEnd?: string;
  arrivalDate?: string;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Load completed rentals
      const rentalsResponse = await api.getRentalRequests();
      const allRentals: RentalRequest[] = [];
      if (rentalsResponse.success && rentalsResponse.data) {
        const rentals = Array.isArray(rentalsResponse.data) ? rentalsResponse.data : [];
        allRentals.push(...rentals.filter((r: RentalRequest) => 
          r.status === 'completed' && r.owner_email === user.email
        ));
      }

      // Load all payouts
      const payoutsResponse = await api.request<Payout[]>('/payouts', {
        method: 'GET',
      });
      const allPayouts: Payout[] = [];
      if (payoutsResponse.success && payoutsResponse.data) {
        const payouts = Array.isArray(payoutsResponse.data) ? payoutsResponse.data : [];
        allPayouts.push(...payouts.filter((p: Payout) => p.user_email === user.email));
      }

      // Load items for all rentals
      const itemIds = [...new Set(allRentals.map((r: RentalRequest) => r.item_id))];
      const itemsMap: Record<string, ItemType> = {};
      
      for (const itemId of itemIds) {
        try {
          const itemResponse = await api.getItem(itemId);
          if (itemResponse.success && itemResponse.data) {
            const item = (itemResponse.data as any).item || itemResponse.data;
            itemsMap[itemId] = item as ItemType;
          }
        } catch (error) {
          console.error(`Error loading item ${itemId}:`, error);
        }
      }

      const transactionList: Transaction[] = [];

      // Add rental earnings
      allRentals.forEach((rental: RentalRequest) => {
        const item = itemsMap[rental.item_id];
        const grossAmount = rental.total_amount;
        const platformFee = grossAmount * 0.15;
        const netAmount = grossAmount - platformFee;

        transactionList.push({
          id: rental.id,
          type: 'earning',
          date: rental.updated_date,
          description: `Rental: ${item?.title || 'Item'}`,
          itemTitle: item?.title,
          grossAmount,
          platformFee,
          netAmount,
          status: 'completed',
          rentalStart: rental.start_date,
          rentalEnd: rental.end_date
        });
      });

      // Add payouts
      allPayouts.forEach((payout: Payout) => {
        transactionList.push({
          id: payout.id,
          type: 'payout',
          date: payout.created_date,
          description: 'Payout to bank account',
          amount: payout.amount,
          status: payout.status,
          arrivalDate: payout.arrival_date
        });
      });

      // Sort by date descending
      transactionList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(transactionList);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    // Search filter
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.itemTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const matchesType = filterType === 'all' || transaction.type === filterType;

    // Period filter
    let matchesPeriod = true;
    if (filterPeriod !== 'all') {
      const transactionDate = parseISO(transaction.date);
      const now = new Date();
      
      if (filterPeriod === 'this_month') {
        matchesPeriod = isWithinInterval(transactionDate, {
          start: startOfMonth(now),
          end: endOfMonth(now)
        });
      } else if (filterPeriod === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        matchesPeriod = isWithinInterval(transactionDate, {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        });
      }
    }

    return matchesSearch && matchesType && matchesPeriod;
  });

  // Calculate totals
  const totalEarnings = filteredTransactions
    .filter((t: Transaction) => t.type === 'earning')
    .reduce((sum, t) => sum + (t.netAmount || 0), 0);

  const totalPayouts = filteredTransactions
    .filter((t: Transaction) => t.type === 'payout')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalFees = filteredTransactions
    .filter((t: Transaction) => t.type === 'earning')
    .reduce((sum, t) => sum + (t.platformFee || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 mb-1">Total Earnings</p>
                <p className="text-xl font-bold text-green-700">${totalEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 mb-1">Platform Fees</p>
                <p className="text-xl font-bold text-red-700">${totalFees.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 mb-1">Total Payouts</p>
                <p className="text-xl font-bold text-blue-700">${totalPayouts.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="earning">Earnings</SelectItem>
                <SelectItem value="payout">Payouts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(transaction => (
                <div
                  key={`${transaction.type}-${transaction.id}`}
                  className={`p-4 rounded-lg border ${
                    transaction.type === 'earning' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-slate-900 truncate">
                          {transaction.description}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs flex-shrink-0 ${
                            transaction.type === 'earning' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {transaction.type === 'earning' ? 'Earning' : 'Payout'}
                        </Badge>
                      </div>

                      {transaction.type === 'earning' ? (
                        <div className="space-y-1 text-xs text-slate-600">
                          {transaction.rentalStart && transaction.rentalEnd && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {format(parseISO(transaction.rentalStart), 'MMM d')} - {format(parseISO(transaction.rentalEnd), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-green-200">
                            <div>
                              <p className="text-xs text-slate-500">Gross</p>
                              <p className="font-semibold text-slate-900">${(transaction.grossAmount || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Fee (15%)</p>
                              <p className="font-semibold text-red-700">-${(transaction.platformFee || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Net</p>
                              <p className="font-semibold text-green-700">${(transaction.netAmount || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs text-slate-600">
                          <p>Status: <span className="font-semibold capitalize">{transaction.status}</span></p>
                          {transaction.arrivalDate && (
                            <p>Expected: {format(parseISO(transaction.arrivalDate), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        {format(parseISO(transaction.date), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-bold ${
                        transaction.type === 'earning' ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        {transaction.type === 'earning' ? '+' : '-'}$
                        {transaction.type === 'earning' 
                          ? (transaction.netAmount || 0).toFixed(2) 
                          : (transaction.amount || 0).toFixed(2)
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No transactions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}