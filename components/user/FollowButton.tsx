'use client'

import React, { useState, useEffect } from 'react';
import { api, getCurrentUser, redirectToSignIn, type UserData } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { User as UserIcon } from 'lucide-react';

interface FollowButtonProps {
  targetEmail: string;
  targetName: string;
}

interface UserFollow {
  id: string;
  follower_email: string;
  following_email: string;
}

export default function FollowButton({ targetEmail, targetName }: FollowButtonProps) {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [targetEmail]);

  const checkFollowStatus = async () => {
    try {
      const user = await getCurrentUser();
      if (!user || !user.email) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      setCurrentUser(user);

      // Don't allow following yourself
      if (user.email === targetEmail) {
        setIsLoading(false);
        return;
      }

      const followsResponse = await api.request<UserFollow[]>(`/user-follows?follower_email=${encodeURIComponent(user.email)}&following_email=${encodeURIComponent(targetEmail)}`);
      const follows = followsResponse.success && followsResponse.data ? followsResponse.data : [];

      setIsFollowing(follows.length > 0);
    } catch (error) {
      console.error('Error checking follow status:', error);
      setCurrentUser(null);
    }
    setIsLoading(false);
  };

  const handleToggleFollow = async () => {
    if (!currentUser || !currentUser.email) {
      redirectToSignIn();
      return;
    }

    setIsUpdating(true);
    try {
      if (isFollowing) {
        // Unfollow - find the follow record and delete it
        const followsResponse = await api.request<UserFollow[]>(`/user-follows?follower_email=${encodeURIComponent(currentUser.email)}&following_email=${encodeURIComponent(targetEmail)}`);
        const follows = followsResponse.success && followsResponse.data ? followsResponse.data : [];
        if (follows.length > 0) {
          await api.request(`/user-follows/${follows[0].id}`, {
            method: 'DELETE',
          });
        }
        setIsFollowing(false);
      } else {
        // Follow
        await api.request('/user-follows', {
          method: 'POST',
          body: JSON.stringify({
            follower_email: currentUser.email,
            following_email: targetEmail
          }),
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
    setIsUpdating(false);
  };

  // Don't show button if user is viewing their own profile after loading
  if (!isLoading && currentUser && currentUser.email === targetEmail) {
    return null;
  }

  // Show loading spinner while checking status
  if (isLoading) {
    return (
      <Button disabled variant="outline" size="sm">
        <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full mr-2" />
        Loading...
      </Button>);

  }

  // Prompt to sign in if no current user
  if (!currentUser) {
    return (
      <Button onClick={() => redirectToSignIn()} variant="outline" size="sm">
        <UserIcon className="w-4 h-4 mr-2" />
        Sign in to Follow
      </Button>);
  }

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={isUpdating} // Disable button while updating
      variant={isFollowing ? "outline" : "default"} // Flipped variant logic
      size="sm" // Hardcoded size to "sm"
      className="bg-slate-200 text-primary-foreground px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md hover:bg-slate-800">

      {isUpdating ?
      <>
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </> :

      <>
          <UserIcon className="w-4 h-4 mr-2" /> {/* Changed icon to UserIcon */}
          {isFollowing ? 'Following' : 'Follow'}
        </>
      }
    </Button>);

}