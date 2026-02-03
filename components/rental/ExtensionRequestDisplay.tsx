'use client'

import React, { useState } from 'react';
import { api, sendEmail } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, DollarSign } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { createPageUrl } from "@/lib/utils";

interface Extension {
  id: string;
  new_end_date: string;
  additional_cost: number;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  payment_intent_id?: string;
}

interface RentalRequest {
  id: string;
  end_date: string;
  owner_email: string;
  renter_email: string;
}

interface Item {
  title?: string;
  [key: string]: any;
}

interface User {
  email: string;
  [key: string]: any;
}

interface ExtensionRequestDisplayProps {
  extension: Extension;
  rentalRequest: RentalRequest;
  item?: Item;
  currentUser: User;
  onUpdate?: () => void;
}

export default function ExtensionRequestDisplay({ extension, rentalRequest, item, currentUser, onUpdate }: ExtensionRequestDisplayProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwner = currentUser.email === rentalRequest.owner_email;
  const isRenter = currentUser.email === rentalRequest.renter_email;
  const extraDays = differenceInDays(parseISO(extension.new_end_date), parseISO(rentalRequest.end_date));

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const updateResponse = await api.request<{ id: string }>(`/rental-extensions/${extension.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to approve extension');
      }

      // Create system message in chat
      // TODO: Implement messages endpoint in backend
      try {
        await api.request('/messages', {
          method: 'POST',
          body: JSON.stringify({
            rental_request_id: rentalRequest.id,
            sender_email: 'system',
            content: `Extension approved! Renter can now pay for the additional ${extraDays} days ($${extension.additional_cost.toFixed(2)}).`,
            message_type: "status_update",
            is_read: false
          })
        });
      } catch (messageError) {
        console.error('Failed to create system message:', messageError);
      }

      // Send email to renter
      try {
        await sendEmail({
          to: rentalRequest.renter_email,
          subject: `Extension Approved for ${item?.title || 'Your Rental'}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">✅ Extension Approved!</h2>
              <p>Good news! Your extension request has been approved.</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p><strong>Item:</strong> ${item?.title || 'Your Rental'}</p>
                <p><strong>New End Date:</strong> ${format(parseISO(extension.new_end_date), 'PPP')}</p>
                <p><strong>Extra Days:</strong> ${extraDays} days</p>
                <p><strong>Additional Cost:</strong> $${extension.additional_cost.toFixed(2)}</p>
              </div>
              
              <p>Please complete the payment to confirm the extension.</p>
              <p><a href="${typeof window !== 'undefined' ? window.location.origin + '/request' : ''}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Pay Now</a></p>
            </div>
          `,
          from_name: "Rentable"
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error approving extension:', error);
      alert('Failed to approve extension. Please try again.');
    }
    setIsProcessing(false);
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      const updateResponse = await api.request<{ id: string }>(`/rental-extensions/${extension.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'declined' })
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to decline extension');
      }

      // Create system message in chat
      // TODO: Implement messages endpoint in backend
      try {
        await api.request('/messages', {
          method: 'POST',
          body: JSON.stringify({
            rental_request_id: rentalRequest.id,
            sender_email: 'system',
            content: 'Extension request declined.',
            message_type: "status_update",
            is_read: false
          })
        });
      } catch (messageError) {
        console.error('Failed to create system message:', messageError);
      }

      // Send email to renter
      try {
        await sendEmail({
          to: rentalRequest.renter_email,
          subject: `Extension Request Declined for ${item?.title || 'Your Rental'}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Extension Request Declined</h2>
              <p>Unfortunately, your extension request has been declined by the owner.</p>
              
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p><strong>Item:</strong> ${item?.title || 'Your Rental'}</p>
                <p><strong>Original End Date:</strong> ${format(parseISO(rentalRequest.end_date), 'PPP')}</p>
              </div>
              
              <p>Please ensure you return the item by the original end date to avoid late fees.</p>
              <p><a href="${typeof window !== 'undefined' ? window.location.origin + '/request' : ''}" style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">View Rental</a></p>
            </div>
          `,
          from_name: "Rentable"
        });
      } catch (emailError) {
        console.error('Failed to send decline email:', emailError);
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error declining extension:', error);
      alert('Failed to decline extension. Please try again.');
    }
    setIsProcessing(false);
  };

  const handlePayExtension = async () => {
    setIsProcessing(true);
    try {
      const checkoutResponse = await api.request<{ url: string }>('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          extension_id: extension.id,
          return_url: typeof window !== 'undefined' 
            ? window.location.origin + window.location.pathname + window.location.search
            : ''
        })
      });

      if (!checkoutResponse.success || !checkoutResponse.data) {
        throw new Error(checkoutResponse.error || 'Failed to create checkout');
      }

      if (typeof window !== 'undefined') {
        window.location.href = checkoutResponse.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout for extension:', error);
      alert('Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    declined: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-900">Extension Request</h4>
              <Badge className={statusColors[extension.status]}>
                {extension.status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Current End:</span>
                <span className="font-medium">{format(parseISO(rentalRequest.end_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">New End:</span>
                <span className="font-medium">{format(parseISO(extension.new_end_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Extra Days:</span>
                <span className="font-medium">{extraDays} days</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-slate-600">Additional Cost:</span>
                <span className="font-bold text-blue-600">${extension.additional_cost.toFixed(2)}</span>
              </div>
            </div>

            {extension.message && (
              <div className="mt-3 p-3 bg-white rounded-lg">
                <p className="text-sm text-slate-700 italic">"{extension.message}"</p>
              </div>
            )}

            {/* Owner Actions */}
            {isOwner && extension.status === 'pending' && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            )}

            {/* Renter Payment */}
            {isRenter && extension.status === 'approved' && !extension.payment_intent_id && (
              <Button
                onClick={handlePayExtension}
                disabled={isProcessing}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : `Pay $${extension.additional_cost.toFixed(2)}`}
              </Button>
            )}

            {extension.status === 'approved' && extension.payment_intent_id && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">✓ Extension paid and confirmed</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}