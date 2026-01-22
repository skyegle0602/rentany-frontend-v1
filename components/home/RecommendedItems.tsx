'use client'

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import ItemCard from '../items/ItemCard';
import { motion } from 'framer-motion';
import { type FavoriteData, getFavorites, getRecommendations } from '@/lib/api-client';

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  daily_rate: number;
  availability: boolean;
  images?: string[];
  videos?: string[];
  [key: string]: any;
}

interface RecommendedItemsProps {
  onFavoriteChange?: () => void | Promise<void>;
}

export default function RecommendedItems({ onFavoriteChange }: RecommendedItemsProps) {
  const { user: currentUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [recommendations, setRecommendations] = useState<Item[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      // Only load recommendations for signed-in users
      if (!userLoaded || !isSignedIn || !currentUser) {
        setIsLoading(false);
        return;
      }

      const userEmail = currentUser.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // Load user favorites
        try {
          const favorites = await getFavorites(userEmail);
          setUserFavorites(favorites);
        } catch (favError) {
          console.log('Could not load favorites from API:', favError);
        }

        // Load recommendations
        const { data } = await getRecommendations({ user_email: userEmail });
        setRecommendations(data.items || []);
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setError('Could not load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      loadRecommendations();
    } else {
      setIsLoading(false);
    }
  }, [userLoaded, isSignedIn, currentUser]);

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

  // Only show for signed-in users
  if (!userLoaded || !isSignedIn || !currentUser) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
                <p className="text-sm text-slate-500">Based on your activity and preferences</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              AI Powered
            </Badge>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Recommended for You</h2>
                <p className="text-sm text-slate-500">Based on your activity and preferences</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              AI Powered
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <ItemCard
                  item={item}
                  userFavorites={userFavorites}
                  currentUser={currentUser}
                  onFavoriteChange={handleFavoriteChange}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}