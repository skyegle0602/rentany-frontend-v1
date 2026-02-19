"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import ItemCard from '@/components/items/ItemCard';
import { Star, Loader2 } from 'lucide-react';
import { type FavoriteData, api, getFavorites } from '@/lib/api-client';

interface AIIItemsProps {
  onFavoriteChange?: () => void;
  searchQuery?: string;
  locationQuery?: string;
  selectedCategory?: string;
  priceRange?: { min: string; max: string };
  availabilityFilter?: string;
  sortBy?: string;
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
  owner_id?: string;
  created_by?: string;
  [key: string]: any;
}

export default function AIIItems({ 
  onFavoriteChange,
  searchQuery = '',
  locationQuery = '',
  selectedCategory = 'all',
  priceRange = { min: '', max: '' },
  availabilityFilter = 'all',
  sortBy = 'relevance',
}: AIIItemsProps) {
  const { user: currentUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const itemsPerPage = 20; // Load 20 items at a time
  const observerTarget = useRef<HTMLDivElement>(null);

  // Build API parameters helper
  const buildParams = useCallback((offset: number = 0) => {
    const params: any = {
      limit: itemsPerPage,
      offset: offset,
    }
    
    // Search by title/name
    if (searchQuery && searchQuery.trim()) {
      params.search = searchQuery.trim()
    }
    
    // Filter by location
    if (locationQuery && locationQuery.trim()) {
      params.location = locationQuery.trim()
    }
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      params.category = selectedCategory
    }
    
    // Filter by price range
    if (priceRange.min) {
      params.min_price = parseFloat(priceRange.min)
    }
    if (priceRange.max) {
      params.max_price = parseFloat(priceRange.max)
    }
    
    // Filter by availability
    if (availabilityFilter === 'available') {
      params.availability = true
    } else if (availabilityFilter === 'unavailable') {
      params.availability = false
    }
    
    // Add sorting parameter
    if (sortBy) {
      params.sort_by = sortBy
    }
    
    return params;
  }, [searchQuery, locationQuery, selectedCategory, priceRange.min, priceRange.max, availabilityFilter, sortBy]);

  // Load items function
  const loadItems = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Only fetch on client side
      if (typeof window === 'undefined') {
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const params = buildParams(offset);
      const response = await api.getItems(params);

      if (response.success && response.data) {
        // Ensure data is an array
        const itemsData = Array.isArray(response.data) ? response.data : []
        
        // Map API response to Item format
        const items: Item[] = itemsData.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          location: item.location,
          daily_rate: item.daily_rate,
          availability: item.availability,
          instant_booking: item.instant_booking,
          images: item.images || [],
          videos: item.videos || [],
          view_count: item.view_count || 0,
          favorite_count: item.favorite_count || 0,
          created_date: item.created_at,
          owner_id: item.owner_id,
          created_by: item.created_by,
        }));

        if (append) {
          setAllItems(prev => [...prev, ...items]);
        } else {
          setAllItems(items);
        }

        // Check if there are more items to load
        setHasMore(items.length === itemsPerPage);

        // Load user favorites if signed in (only on initial load)
        if (!append && userLoaded && isSignedIn && currentUser) {
          try {
            const userEmail = currentUser.emailAddresses[0]?.emailAddress;
            if (userEmail) {
              try {
                const favorites = await getFavorites(userEmail);
                setUserFavorites(favorites);
              } catch (favError) {
                console.log('Could not load favorites from API:', favError);
                // Fallback to localStorage if API fails
                if (typeof window !== 'undefined') {
                  const favoritesKey = `favorites_${userEmail}`;
                  const storedFavorites = localStorage.getItem(favoritesKey);
                  if (storedFavorites) {
                    setUserFavorites(JSON.parse(storedFavorites));
                  }
                }
              }
            }
          } catch (error) {
            console.log('Could not load favorites:', error);
          }
        }
      } else {
        console.error('Failed to fetch items:', response.error);
        if (!append) {
          setAllItems([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      if (!append) {
        setAllItems([]);
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [buildParams, userLoaded, isSignedIn, currentUser]);

  // Initial load and reset when filters change
  useEffect(() => {
    // Reset pagination when filters change
    setCurrentOffset(0);
    setHasMore(true);
    
    // Load items regardless of auth status
    // Only load on client side
    if (typeof window !== 'undefined') {
      loadItems(0, false);
    } else {
      setIsLoading(false);
    }
  }, [searchQuery, locationQuery, selectedCategory, priceRange.min, priceRange.max, availabilityFilter, sortBy, loadItems]);

  // Load more items function
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    const nextOffset = currentOffset + itemsPerPage;
    setCurrentOffset(nextOffset);
    loadItems(nextOffset, true);
  }, [currentOffset, isLoadingMore, hasMore, loadItems]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, loadMoreItems]);

  const handleFavoriteChange = async () => {
    if (onFavoriteChange) {
      await onFavoriteChange();
    }
    // Reload favorites from localStorage
    try {
      if (currentUser && typeof window !== 'undefined') {
        const userEmail = currentUser.emailAddresses[0]?.emailAddress;
        if (userEmail) {
          const favoritesKey = `favorites_${userEmail}`;
          const storedFavorites = localStorage.getItem(favoritesKey);
          
          if (storedFavorites) {
            const favorites: FavoriteData[] = JSON.parse(storedFavorites);
            setUserFavorites(favorites);
          }
        }
      }
    } catch (error) {
      console.log('Could not load favorites:', error);
    }
  };

  // Show items to everyone (not just signed-in users)
  // Don't show if still loading
  if (isLoading) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-purple-600 fill-purple-600" />
            <h2 className="text-lg font-semibold text-slate-900">All Items</h2>
          </div>
          <div className="text-center text-slate-600">Loading items...</div>
        </div>
      </div>
    );
  }

  // Don't show if no items
  if (allItems.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-5 h-5 text-purple-600 fill-purple-600" />
          <h2 className="text-lg font-semibold text-slate-900">All Items</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {allItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              userFavorites={userFavorites}
              currentUser={currentUser}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </div>
        
        {/* Infinite scroll trigger and loading indicator */}
        <div ref={observerTarget} className="mt-8 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading more items...</span>
            </div>
          )}
          {!hasMore && allItems.length > 0 && (
            <div className="text-slate-500 text-sm">
              No more items to load
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
