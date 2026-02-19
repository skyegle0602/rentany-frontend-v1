'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Heart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import ItemCard from '@/components/items/ItemCard';
import { getFavorites, getCurrentUser, type FavoriteData, type UserData, api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

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

export default function FavoritesPage() {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [userFavorites, setUserFavorites] = useState<FavoriteData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show 20 items per page

  const loadFavorites = useCallback(async () => {
    if (!userLoaded || !isSignedIn || !clerkUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      // Fetch current user data
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }

      // Fetch user favorites
      const favorites = await getFavorites(userEmail);
      setUserFavorites(favorites);

      // Fetch item details for each favorite
      const itemPromises = favorites.map(async (favorite) => {
        try {
          const response = await api.request<Item>(`/items/${favorite.item_id}`);
          if (response.success && response.data) {
            const itemData = (response.data as any).item || response.data;
            return itemData;
          }
          return null;
        } catch (error: any) {
          // Item not found (404) - this is expected for deleted items
          if (error?.response?.status !== 404 && !error?.message?.includes('404')) {
            console.error(`Error fetching item ${favorite.item_id}:`, error);
          }
          return null;
        }
      });

      const items = (await Promise.all(itemPromises)).filter((item): item is Item => item !== null);
      setFavoriteItems(items);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavoriteItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userLoaded, isSignedIn, clerkUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isSignedIn) {
        router.push('/auth/signin');
        return;
      }
      loadFavorites();
    }
  }, [isSignedIn, loadFavorites, router]);

  const handleFavoriteChange = async () => {
    // Reload favorites when user toggles favorite
    await loadFavorites();
    // Reset to page 1 when favorites change
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(favoriteItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = favoriteItems.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (!userLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/home')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Browse
        </Button>
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500 fill-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
        </div>
        <p className="mt-2 text-gray-600">
          {isLoading ? 'Loading...' : `${favoriteItems.length} item${favoriteItems.length !== 1 ? 's' : ''} saved${totalPages > 1 ? ` (Page ${currentPage} of ${totalPages})` : ''}`}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-600 py-12">Loading favorites...</div>
      ) : favoriteItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No favorites yet.</p>
          <p className="text-gray-400">Start browsing to add items to your favorites!</p>
          <Button
            onClick={() => router.push('/home')}
            className="mt-4"
          >
            Browse Items
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                userFavorites={userFavorites}
                currentUser={currentUser}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>

          {/* Pagination - Show when there are favorites and more than 1 page */}
          {favoriteItems.length > 0 && totalPages > 1 && (
            <div className="mt-8 mb-4 flex items-center justify-center">
              <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentPage === 1 || isLoading}
                  className="h-9 px-3 rounded-none border-0 border-r border-slate-200 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {getPageNumbers().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-500 border-l border-slate-200 bg-white">
                        ...
                      </span>
                    );
                  }
                  
                  const pageNum = page as number;
                  const isActive = pageNum === currentPage;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 bg-white'
                      } ${index === 0 ? 'border-l-0' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentPage === totalPages || isLoading}
                  className="h-9 px-3 rounded-none border-0 border-l border-slate-200 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
