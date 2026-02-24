'use client'

import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  User,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import Link from 'next/link';

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  message?: string;
  created_date: string;
  updated_date?: string;
}

interface Item {
  id: string;
  title: string;
}

export default function PendingRequestPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [pendingRequests, setPendingRequests] = useState<RentalRequest[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        alert("Authentication required.");
        window.location.href = '/';
        return;
      }
      setCurrentUser(user);

      if (user.role !== 'admin') {
        alert("Access denied. Admin privileges required.");
        window.location.href = '/';
        return;
      }

      // Fetch pending rental requests only
      const requestsResponse = await api.request<RentalRequest[]>('/rental-requests?status=pending');
      const pending = requestsResponse.success && requestsResponse.data ? requestsResponse.data : [];
      setPendingRequests(pending);

      // Only fetch items that are in the pending requests
      if (pending.length > 0) {
        const itemIds = [...new Set(pending.map(r => r.item_id).filter(Boolean))];
        if (itemIds.length > 0) {
          const idsParam = itemIds.join(',');
          const itemsResponse = await api.request<Item[]>(`/items?ids=${encodeURIComponent(idsParam)}`);
          const fetchedItems = itemsResponse.success && itemsResponse.data ? itemsResponse.data : [];
          const itemsMap: Record<string, Item> = {};
          fetchedItems.forEach(item => itemsMap[item.id] = item);
          setItems(itemsMap);
        }
      }

    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load pending requests.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const note = notes[requestId] || '';
      const updateData: any = {
        status: action
      };

      // If there's a note, append it to the message
      if (note.trim()) {
        const request = pendingRequests.find(r => r.id === requestId);
        const existingMessage = request?.message || '';
        updateData.message = existingMessage 
          ? `${existingMessage}\n\n[Admin Note: ${note}]`
          : `[Admin Note: ${note}]`;
      }

      const response = await api.request(`/rental-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.success) {
        // Remove from pending list
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        // Clear note
        setNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[requestId];
          return newNotes;
        });
      } else {
        throw new Error(response.error || 'Failed to update request');
      }
    } catch (error) {
      console.error("Error updating request:", error);
      alert(`Failed to ${action === 'approved' ? 'approve' : 'reject'} request. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading pending requests...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">You need admin privileges to access this page.</p>
          <Button onClick={() => window.location.href = '/'}>Go to Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            {/* Left Section */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                Pending Rental Requests
              </h1>

              <p className="text-slate-600 mt-1">
                Review and approve or reject rental requests
              </p>
            </div>

            {/* Right Section */}
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              <Button
                onClick={loadData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full sm:w-auto"
              >
                <Link href="/admin/dashboard">Back to Dashboard</Link>
              </Button>
            </div>

          </div>
        </motion.div>

        {/* Stats */}
        <div className="mb-6">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Requests List */}
        {pendingRequests.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">All Clear!</h3>
              <p className="text-slate-600">No pending rental requests at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const item = items[request.item_id];
              const isProcessing = processingId === request.id;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Request Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium">Submitted by:</span>
                              <span className="text-slate-900">{request.renter_email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Package className="w-4 h-4" />
                              <span className="font-medium">Item:</span>
                              <span className="text-slate-900">{item?.title || 'Loading...'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">Dates:</span>
                              <span className="text-slate-900">
                                {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium">Amount:</span>
                              <span className="text-slate-900 font-semibold">${request.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">Submitted:</span>
                              <span className="text-slate-900">
                                {format(new Date(request.created_date), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            {request.message && (
                              <div className="text-sm">
                                <span className="font-medium text-slate-600">Message:</span>
                                <p className="text-slate-900 mt-1 bg-slate-50 p-2 rounded">{request.message}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Note Field */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Optional Note (will be added to request):
                          </label>
                          <Textarea
                            placeholder="Add a note for this request..."
                            value={notes[request.id] || ''}
                            onChange={(e) => setNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                            className="min-h-[80px]"
                            disabled={isProcessing}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                          <Button
                            onClick={() => handleAction(request.id, 'approved')}
                            disabled={isProcessing}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleAction(request.id, 'rejected')}
                            disabled={isProcessing}
                            variant="destructive"
                            className="flex-1"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
