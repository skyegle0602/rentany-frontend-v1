'use client'

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Package, Clock } from 'lucide-react';
import { format, parseISO, isFuture } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';

interface ItemType {
  id: string;
  title: string;
  images?: string[];
  videos?: string[];
  [key: string]: any;
}

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  status: string;
  created_date: string;
}

interface RentalHistoryTabProps {
  userEmail: string;
}

export default function RentalHistoryTab({ userEmail }: RentalHistoryTabProps) {
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [items, setItems] = useState<Record<string, ItemType>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRentals();
  }, [userEmail]);

  const loadRentals = async () => {
    try {
      const rentalsResponse = await api.getRentalRequests();
      if (rentalsResponse.success && rentalsResponse.data) {
        const allRentals = Array.isArray(rentalsResponse.data) 
          ? rentalsResponse.data 
          : [];
        const userRentals = allRentals.filter(
          (r: RentalRequest) => r.renter_email === userEmail || r.owner_email === userEmail
        );
        setRentals(userRentals);

        // Fetch items for all rental requests
        const itemIds = [...new Set(userRentals.map((r: RentalRequest) => r.item_id))];
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
        setItems(itemsMap);
      }
    } catch (error) {
      console.error('Error loading rentals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const asRenter = rentals.filter(r => r.renter_email === userEmail);
  const asOwner = rentals.filter(r => r.owner_email === userEmail);

  const upcomingRentals = rentals.filter(r => 
    r.status === 'paid' && r.start_date && isFuture(parseISO(r.start_date))
  );
  const pastRentals = rentals.filter(r => r.status === 'completed');
  const activeRentals = rentals.filter(r => 
    r.status === 'paid' && r.start_date && !isFuture(parseISO(r.start_date))
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-slate-100 text-slate-800 border-slate-200',
    declined: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  interface RentalCardProps {
    rental: RentalRequest;
    role: 'renter' | 'owner';
  }

  const RentalCard = ({ rental, role }: RentalCardProps) => {
    const item = items[rental.item_id];
    const itemImage = item?.images?.[0] || item?.videos?.[0];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {itemImage && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                  <img
                    src={itemImage}
                    alt={item?.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`${createPageUrl('ItemDetails')}?id=${rental.item_id}`}
                      className="font-semibold text-slate-900 hover:text-slate-600 line-clamp-1"
                    >
                      {item?.title || 'Item not found'}
                    </Link>
                    <Badge 
                      variant="secondary" 
                      className="text-xs mt-1"
                    >
                      {role === 'renter' ? 'You rented' : 'You rented out'}
                    </Badge>
                  </div>
                  <Badge className={`${statusColors[rental.status]} border text-xs flex-shrink-0`}>
                    {rental.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  {rental.start_date && rental.end_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(parseISO(rental.start_date), 'MMM d')} - {format(parseISO(rental.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {rental.total_amount && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>${rental.total_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Created {format(new Date(rental.created_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-900">{activeRentals.length}</p>
            <p className="text-xs text-blue-700">Active</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-900">{upcomingRentals.length}</p>
            <p className="text-xs text-purple-700">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-900">{pastRentals.length}</p>
            <p className="text-xs text-green-700">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{rentals.length}</p>
            <p className="text-xs text-slate-700">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({rentals.length})</TabsTrigger>
          <TabsTrigger value="renter">As Renter ({asRenter.length})</TabsTrigger>
          <TabsTrigger value="owner">As Owner ({asOwner.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingRentals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {rentals.length > 0 ? (
            rentals.map(rental => (
              <RentalCard 
                key={rental.id} 
                rental={rental} 
                role={rental.renter_email === userEmail ? 'renter' : 'owner'}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No rental history yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="renter" className="mt-4 space-y-3">
          {asRenter.length > 0 ? (
            asRenter.map(rental => (
              <RentalCard key={rental.id} rental={rental} role="renter" />
            ))
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No rentals as renter</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="owner" className="mt-4 space-y-3">
          {asOwner.length > 0 ? (
            asOwner.map(rental => (
              <RentalCard key={rental.id} rental={rental} role="owner" />
            ))
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No rentals as owner</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingRentals.length > 0 ? (
            upcomingRentals.map(rental => (
              <RentalCard 
                key={rental.id} 
                rental={rental} 
                role={rental.renter_email === userEmail ? 'renter' : 'owner'}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No upcoming rentals</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}