'use client'

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createPageUrl } from '@/lib/utils';

interface Dispute {
  id: string;
  rental_request_id: string;
  filed_by_email: string;
  against_email: string;
  reason: string;
  description: string;
  status: string;
  decision?: string;
  resolution?: string;
  created_date: string;
}

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  [key: string]: any;
}

interface ItemType {
  id: string;
  title: string;
  [key: string]: any;
}

interface DisputeHistoryTabProps {
  userEmail: string;
}

export default function DisputeHistoryTab({ userEmail }: DisputeHistoryTabProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [items, setItems] = useState<Record<string, ItemType>>({});
  const [requests, setRequests] = useState<Record<string, RentalRequest>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDisputes();
  }, [userEmail]);

  const loadDisputes = async () => {
    try {
      // Fetch disputes
      const disputesResponse = await api.request<Dispute[]>('/disputes');
      if (disputesResponse.success && disputesResponse.data) {
        const allDisputes = Array.isArray(disputesResponse.data) 
          ? disputesResponse.data 
          : [];
        const userDisputes = allDisputes.filter(
          (d: Dispute) => d.filed_by_email === userEmail || d.against_email === userEmail
        );
        setDisputes(userDisputes);

        // Fetch rental requests
        const requestsResponse = await api.getRentalRequests();
        if (requestsResponse.success && requestsResponse.data) {
          const allRequests = Array.isArray(requestsResponse.data) 
            ? requestsResponse.data 
            : [];
          const requestsMap: Record<string, RentalRequest> = {};
          allRequests.forEach((req: RentalRequest) => {
            requestsMap[req.id] = req;
          });
          setRequests(requestsMap);

          // Fetch items for all rental requests
          const itemIds = [...new Set(allRequests.map((req: RentalRequest) => req.item_id))];
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
      }
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800 border-red-200',
    under_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  interface DecisionBadgeProps {
    decision: string;
  }

  const DecisionBadge = ({ decision }: DecisionBadgeProps) => {
    if (!decision) return null;
    
    const colors: Record<string, string> = {
      favor_renter: 'bg-green-100 text-green-800 border-green-200',
      favor_owner: 'bg-blue-100 text-blue-800 border-blue-200',
      split: 'bg-purple-100 text-purple-800 border-purple-200'
    };

    return (
      <Badge className={`${colors[decision]} border text-xs`}>
        {decision.replace('_', ' ')}
      </Badge>
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
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {disputes.filter(d => d.status === 'open').length}
            </p>
            <p className="text-xs text-slate-600">Open</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {disputes.filter(d => d.status === 'under_review').length}
            </p>
            <p className="text-xs text-slate-600">Under Review</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {disputes.filter(d => d.status === 'resolved').length}
            </p>
            <p className="text-xs text-slate-600">Resolved</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {disputes.length}
            </p>
            <p className="text-xs text-slate-600">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Disputes List */}
      {disputes.length > 0 ? (
        <div className="space-y-3">
          {disputes.map(dispute => {
            const request = requests[dispute.rental_request_id];
            const item = request ? items[request.item_id] : null;
            const isFiled = dispute.filed_by_email === userEmail;

            return (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`${createPageUrl('ItemDetails')}?id=${request?.item_id}`}
                            className="font-semibold text-slate-900 hover:text-slate-600 line-clamp-1"
                          >
                            {item?.title || 'Item not found'}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {isFiled ? 'Filed by you' : 'Filed against you'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <Badge className={`${statusColors[dispute.status]} border text-xs`}>
                          {dispute.status.replace('_', ' ')}
                        </Badge>
                        {dispute.decision && <DecisionBadge decision={dispute.decision} />}
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-red-900 mb-1">
                        Reason: {dispute.reason.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-red-800 line-clamp-2">
                        {dispute.description}
                      </p>
                    </div>

                    {dispute.resolution && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-green-900 mb-1">Resolution:</p>
                        <p className="text-xs text-green-800 line-clamp-2">
                          {dispute.resolution}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Filed {format(new Date(dispute.created_date), 'MMM d, yyyy')}</span>
                      <Link
                        href={createPageUrl('Disputes')}
                        className="text-blue-600 hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No disputes</h3>
            <p className="text-sm text-slate-600">You haven't been involved in any disputes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}