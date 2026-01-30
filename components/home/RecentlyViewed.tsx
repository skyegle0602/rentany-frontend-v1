"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import ItemCard from '@/components/items/ItemCard';
import { Clock } from 'lucide-react';
import { type FavoriteData, getFavorites, getViewedItems, api } from '@/lib/api-client';

interface RecentlyViewedProps {
  onFavoriteChange?: () => void;
}

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  daily_rate: number;
  availability: boolean;
  instant_booking?: boolean;
  images?: string[];
  videos?: string[];
  view_count?: number;
  favorite_count?: number;
  created_date?: string;
  [key: string]: any;
}

export default function RecentlyViewed({ onFavoriteChange }: RecentlyViewedProps) {
  const { user: currentUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecentlyViewed = useCallback(async () => {
    if (!userLoaded) {
      setIsLoading(false);
      return;
    }

    // Only show recently viewed items for the currently signed-in user
    // This component should NOT be used on public profile pages
    if (!isSignedIn || !currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userEmail = currentUser.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      // Fetch viewed items from API - only for the current user
      // Shows items the current user has viewed, regardless of who owns them
      console.log('📊 Fetching viewed items for current user:', userEmail);
      let viewedItems: any[] = []
      try {
        viewedItems = await getViewedItems(userEmail)
        console.log('📊 Received viewed items:', viewedItems);
      } catch (error) {
        // getViewedItems already handles errors and returns empty array
        // But log if there's an unexpected error
        console.warn('⚠️  Could not fetch viewed items (this is OK if backend is not available):', error);
        viewedItems = []
      }
      
      // Sort by viewed_date (most recent first) and limit to 4
      const sortedViewedItems = viewedItems
        .sort((a, b) => {
          const dateA = a.viewed_date ? new Date(a.viewed_date).getTime() : 0;
          const dateB = b.viewed_date ? new Date(b.viewed_date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 4); // Limit to 4 most recently viewed items
      
      console.log('📊 Sorted and limited viewed items:', sortedViewedItems);

      // Fetch item details for each viewed item
      const itemPromises = sortedViewedItems.map(async (viewedItem) => {
        try {
          const response = await api.getItem(viewedItem.item_id);
          if (response.success && response.data) {
            const itemData = (response.data as any).item || response.data;
            return itemData;
          }
          // Item not found (404) - this is expected for deleted items
          // Silently skip instead of logging an error
          return null;
        } catch (error: any) {
          // Only log non-404 errors (404s are expected for deleted items)
          if (error?.response?.status !== 404 && !error?.message?.includes('404')) {
            console.error(`Error fetching item ${viewedItem.item_id}:`, error);
          }
          return null;
        }
      });

      const items = (await Promise.all(itemPromises)).filter((item): item is Item => item !== null);
      setRecentItems(items);

      // Load user favorites
      try {
        const favorites = await getFavorites(userEmail);
        setUserFavorites(favorites);
      } catch (favError) {
        console.log('Could not load favorites:', favError);
      }
    } catch (error) {
      console.error('Error loading recently viewed items:', error);
      setRecentItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userLoaded, isSignedIn, currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadRecentlyViewed();
    } else {
      setIsLoading(false);
    }
  }, [loadRecentlyViewed]);

  // Refresh when page becomes visible (user navigates back) or window gains focus
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSignedIn && currentUser) {
        console.log('🔄 Page became visible, refreshing recently viewed...');
        loadRecentlyViewed();
      }
    };

    const handleFocus = () => {
      if (isSignedIn && currentUser) {
        console.log('🔄 Window gained focus, refreshing recently viewed...');
        loadRecentlyViewed();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSignedIn, currentUser, loadRecentlyViewed]);

  const handleFavoriteChange = async () => {
    if (onFavoriteChange) {
      await onFavoriteChange();
    }
    // Reload favorites
    if (currentUser) {
      const userEmail = currentUser.emailAddresses[0]?.emailAddress;
      if (userEmail) {
        try {
          const favorites = await getFavorites(userEmail);
          setUserFavorites(favorites);
        } catch (error) {
          console.log('Could not reload favorites:', error);
        }
      }
    }
  };

  // Don't show if not loaded or not signed in
  if (!userLoaded || !isSignedIn) {
    return null;
  }

  // Don't show if still loading or no items
  if (isLoading || recentItems.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Recently Viewed</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {recentItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              userFavorites={userFavorites}
              currentUser={currentUser}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
