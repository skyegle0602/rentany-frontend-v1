'use client'

import React, { useState } from 'react';
import { api, getCurrentUser, type UserData } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock } from 'lucide-react';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { createPageUrl } from "@/lib/utils";

interface ExtensionRequestProps {
  rentalRequest: {
    id: string;
    end_date: string;
    owner_email: string;
  };
  item: {
    daily_rate: number;
    title?: string;
  };
  onSuccess?: () => void;
}

export default function ExtensionRequest({ rentalRequest, item, onSuccess }: ExtensionRequestProps) {
  const [newEndDate, setNewEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateExtensionCost = () => {
    if (!newEndDate) return 0;
    
    const originalEnd = parseISO(rentalRequest.end_date);
    const newEnd = parseISO(newEndDate);
    const extraDays = differenceInDays(newEnd, originalEnd);
    
    if (extraDays <= 0) return 0;
    
    return extraDays * item.daily_rate;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const additionalCost = calculateExtensionCost();
    if (additionalCost <= 0) {
      alert('Please select a date after the current end date');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        alert('Please sign in to request an extension');
        return;
      }

      const extraDays = differenceInDays(parseISO(newEndDate), parseISO(rentalRequest.end_date));
      
      // Create extension request
      const extensionResponse = await api.request<{ id: string }>('/rental-extensions', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          requested_by_email: user.email,
          new_end_date: newEndDate,
          additional_cost: additionalCost,
          message: message,
          status: 'pending'
        })
      });

      if (!extensionResponse.success || !extensionResponse.data) {
        throw new Error(extensionResponse.error || 'Failed to create extension request');
      }

      // Create system message in chat
      // TODO: Implement messages endpoint in backend
      try {
        await api.request('/messages', {
          method: 'POST',
          body: JSON.stringify({
            rental_request_id: rentalRequest.id,
            sender_email: 'system',
            content: `Extension requested: ${extraDays} extra days for $${additionalCost.toFixed(2)}`,
            message_type: "status_update",
            is_read: false
          })
        });
      } catch (messageError) {
        console.error('Failed to create system message:', messageError);
      }

      // Create notification for owner
      // TODO: Implement notifications endpoint in backend
      try {
        await api.request('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            user_email: rentalRequest.owner_email,
            type: 'rental_request',
            title: '⏰ Extension Request',
            message: `${user.full_name || user.email} wants to extend their rental by ${extraDays} days`,
            related_id: rentalRequest.id,
            link: createPageUrl('Request')
          })
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      // Email notifications removed - using in-app notifications and chat instead

      alert('Extension request sent successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error requesting extension:', error);
      alert('Failed to send extension request. Please try again.');
    }
    setIsSubmitting(false);
  };

  const minDate = format(addDays(parseISO(rentalRequest.end_date), 1), 'yyyy-MM-dd');
  const additionalCost = calculateExtensionCost();
  const extraDays = newEndDate ? differenceInDays(parseISO(newEndDate), parseISO(rentalRequest.end_date)) : 0;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Request Extension
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current-end">Current End Date</Label>
            <Input
              id="current-end"
              type="text"
              value={format(parseISO(rentalRequest.end_date), 'PPP')}
              disabled
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="new-end">New End Date</Label>
            <Input
              id="new-end"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              min={minDate}
              required
              className="mt-1"
            />
          </div>

          {newEndDate && extraDays > 0 && (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Extra days:</span>
                <span className="font-semibold">{extraDays} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Daily rate:</span>
                <span className="font-semibold">${item.daily_rate}/day</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Additional Cost:</span>
                <span className="text-lg font-bold text-blue-600">${additionalCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="message">Message to Owner (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain why you need the extension..."
              rows={3}
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !newEndDate || extraDays <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Sending Request...' : `Request Extension ($${additionalCost.toFixed(2)})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}