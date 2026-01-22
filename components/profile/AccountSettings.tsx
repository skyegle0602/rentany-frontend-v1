'use client'

import React, { useState } from 'react';
import { api, type UserData } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Save, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import PushNotificationManager from '@/components/notifications/PushNotificationManager';

interface AccountSettingsProps {
  user: UserData | null;
  onUpdate?: () => void | Promise<void>;
}

export default function AccountSettings({ user, onUpdate }: AccountSettingsProps) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    preferred_language: user?.preferred_language || 'en',
    notification_preferences: user?.notification_preferences || {
      email_notifications: true,
      push_notifications: true,
      rental_requests: true,
      messages: true,
      payment_updates: true,
      reviews: true,
      promotions: true,
      transaction_completed: true,
      payout_initiated: true
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const updateResponse = await api.updateUser(formData);
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update settings');
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onUpdate) await onUpdate();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: !prev.notification_preferences[key]
      }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="mt-1 bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={user?.username || ''}
                disabled
                className="mt-1 bg-slate-50 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                className="mt-1"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.bio.length}/160 characters
              </p>
            </div>

            <div>
              <Label htmlFor="language">Preferred Language</Label>
              <Select
                value={formData.preferred_language}
                onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_language: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pl">Polski</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PushNotificationManager user={user} onUpdate={onUpdate} />
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-xs text-slate-500">Master switch for all email notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.email_notifications}
                  onChange={() => handleNotificationToggle('email_notifications')}
                  className="w-4 h-4"
                />
              </div>

              {formData.notification_preferences.email_notifications && (
                <div className="pl-4 space-y-3 border-l-2 border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Rental Requests</Label>
                      <p className="text-xs text-slate-500">New rental requests and approvals</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.rental_requests}
                      onChange={() => handleNotificationToggle('rental_requests')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Messages</Label>
                      <p className="text-xs text-slate-500">New messages in conversations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.messages}
                      onChange={() => handleNotificationToggle('messages')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Payment Updates</Label>
                      <p className="text-xs text-slate-500">Payment confirmations and payouts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.payment_updates}
                      onChange={() => handleNotificationToggle('payment_updates')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Transaction Completed</Label>
                      <p className="text-xs text-slate-500">When a rental transaction is completed</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.transaction_completed}
                      onChange={() => handleNotificationToggle('transaction_completed')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Payout Initiated</Label>
                      <p className="text-xs text-slate-500">When a payout is initiated to your bank</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.payout_initiated}
                      onChange={() => handleNotificationToggle('payout_initiated')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Reviews</Label>
                      <p className="text-xs text-slate-500">New reviews and ratings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.reviews}
                      onChange={() => handleNotificationToggle('reviews')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Promotions</Label>
                      <p className="text-xs text-slate-500">Deals, tips, and updates</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notification_preferences.promotions}
                      onChange={() => handleNotificationToggle('promotions')}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isSaving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}