'use client';

import React, { useState } from 'react';
import { createFavorite, deleteFavorite, deleteFavoriteByItem, type FavoriteData, redirectToSignIn, type UserData } from '@/lib/api-client';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FavoriteButtonProps {
  itemId: string;
  userFavorites?: FavoriteData[];
  currentUser?: UserData | null;
  onFavoriteChange?: () => void | Promise<void>;
  size?: "default" | "sm";
}

export default function FavoriteButton({
  itemId,
  userFavorites = [],
  currentUser = null,
  onFavoriteChange,
  size = "default"
}: FavoriteButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const isFavorited = userFavorites.some((fav) => fav.item_id === itemId);

  const handleToggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      redirectToSignIn();
      return;
    }

    setIsProcessing(true);
    try {
      if (isFavorited) {
        const favorite = userFavorites.find((fav) => fav.item_id === itemId);
        const userEmail = (currentUser as any).email || 
                         (currentUser as any).emailAddresses?.[0]?.emailAddress ||
                         currentUser.email;
        
        // Try to delete by item_id and user_email first (more reliable)
        // If that fails, try by ID as fallback
        try {
          await deleteFavoriteByItem({
            item_id: itemId,
            user_email: userEmail,
          });
        } catch (error: any) {
          // If item-based deletion fails and we have an ID, try ID-based deletion
          if (favorite && favorite.id) {
            console.warn('Deletion by item_id failed, trying by ID:', error.message);
            try {
              await deleteFavorite(favorite.id);
            } catch (idError: any) {
              // If both methods fail, log and re-throw
              console.error('Both deletion methods failed:', { itemError: error.message, idError: idError.message });
              throw idError;
            }
          } else {
            // No ID available, re-throw the original error
            throw error;
          }
        }
      } else {
        // Handle both Clerk user object and UserData type
        const userEmail = (currentUser as any).email || 
                         (currentUser as any).emailAddresses?.[0]?.emailAddress ||
                         currentUser.email;
        await createFavorite({
          user_email: userEmail,
          item_id: itemId
        });
      }
      
      if (onFavoriteChange) {
        await onFavoriteChange();
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const buttonSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleFavorite}
      disabled={isProcessing}
      className={`${buttonSize} bg-white/90 hover:bg-white rounded-full shadow-md backdrop-blur-sm transition-all duration-200`}
    >
      <Heart 
        className={`${iconSize} transition-all duration-200 ${
          isFavorited 
            ? 'fill-red-500 text-red-500' 
            : 'text-slate-600 hover:text-red-500'
        }`}
      />
    </Button>
  );
}