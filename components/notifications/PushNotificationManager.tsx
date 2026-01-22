'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { api, type UserData } from '@/lib/api-client';

interface PushNotificationManagerProps {
  user: UserData | null;
  onUpdate?: () => void | Promise<void>;
}

export default function PushNotificationManager({ user, onUpdate }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    if (user?.push_subscription) {
      setIsSubscribed(true);
    }
  }, [user]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Subscribe to push notifications
        await subscribeToPush();
      } else if (result === 'denied') {
        setError('Notification permission was denied. Please enable it in your browser settings.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      // For now, we'll use a simplified approach - store that push is enabled
      // In production, you'd integrate with a service worker and push service
      const subscription = {
        enabled: true,
        subscribedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      const updateResponse = await api.updateUser({
        push_subscription: subscription,
        notification_preferences: {
          ...(user?.notification_preferences || {}),
          push_notifications: true
        }
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update notification preferences');
      }

      setIsSubscribed(true);
      if (onUpdate) await onUpdate();

      // Show a test notification
      new Notification('Notifications Enabled! 🎉', {
        body: 'You will now receive updates about your rentals and payouts.',
        icon: '/favicon.ico'
      });

    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError('Failed to enable push notifications');
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const updateResponse = await api.updateUser({
        push_subscription: null,
        notification_preferences: {
          ...(user?.notification_preferences || {}),
          push_notifications: false
        }
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update notification preferences');
      }

      setIsSubscribed(false);
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const notSupported = !('Notification' in window);

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {notSupported ? (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Push notifications are not supported in this browser
        </div>
      ) : isSubscribed ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Push Notifications Enabled</p>
              <p className="text-sm text-green-700">You'll receive real-time updates</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={unsubscribeFromPush}
            disabled={isLoading}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            {isLoading ? 'Disabling...' : 'Disable'}
          </Button>
        </div>
      ) : permission === 'denied' ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <BellOff className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Notifications Blocked</p>
            <p className="text-sm text-red-700">Please enable notifications in your browser settings</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Enable Push Notifications</p>
              <p className="text-sm text-slate-600">Get real-time updates on transactions & payouts</p>
            </div>
          </div>
          <Button
            onClick={requestPermission}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </Button>
        </div>
      )}
    </div>
  );
}
