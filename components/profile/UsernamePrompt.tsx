'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { api, getCurrentUser, redirectToSignIn } from '@/lib/api-client';

interface UsernamePromptProps {
  onUpdate: () => void | Promise<void>;
}

export default function UsernamePrompt({ onUpdate }: UsernamePromptProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    setIsLoading(true);
    try {
      // Try to verify user is still authenticated first
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setError("Your session has expired. Please refresh the page and sign in again.");
        setIsLoading(false);
        return;
      }
      
      console.log('Current user before username update:', currentUser);
      
      // Update the username
      const updateResponse = await api.updateUser({ username: username });
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update username');
      }
      
      console.log('Username updated successfully:', updateResponse.data);
      
      // Reload the profile data immediately
      await onUpdate(); // This reloads the profile data and should hide the prompt
    } catch (err: unknown) {
      console.error('Username update error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const errorStatus = (err as any)?.status;
      
      console.error('Error details:', {
        message: errorMessage,
        status: errorStatus,
      });
      
      if (errorMessage.includes('401') || errorStatus === 401) {
        setError("Your session has expired. Please refresh the page and sign in again.");
      } else if (errorMessage.includes('already exists') || errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('already taken') || errorStatus === 409) {
        setError("This username is already taken. Please choose another one.");
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(`Error: ${errorMessage}. Please try refreshing the page.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSignInAgain = async () => {
    try {
      redirectToSignIn();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle>Welcome to Rentable!</CardTitle>
          <CardDescription>To continue, please create a unique username.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., friendly_renter"
                minLength={3}
                maxLength={20}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-slate-500 mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Set Username"}
              </Button>
              
              {error && (
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleRefresh}
                    className="flex-1 text-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleSignInAgain}
                    className="flex-1 text-sm"
                  >
                    Sign In Again
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}