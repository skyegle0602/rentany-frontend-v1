'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Bookmark, Search, Bell, BellOff, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getCurrentUser, type UserData } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SavedSearch {
  id: string;
  user_email: string;
  name: string;
  filters?: {
    category?: string;
    location?: string;
    min_price?: number;
    max_price?: number;
    search_query?: string;
  };
  notify_new_items: boolean;
  created_at: string;
  updated_at?: string;
}

export default function SavedSearchesPage() {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show 20 saved searches per page

  const loadSavedSearches = useCallback(async () => {
    if (!userLoaded || !isSignedIn || !clerkUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch current user data
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }

      // Fetch saved searches
      const response = await api.getSavedSearches();
      if (response.success && response.data && Array.isArray(response.data)) {
        setSavedSearches(response.data as SavedSearch[]);
      } else {
        setSavedSearches([]);
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
      setSavedSearches([]);
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
      loadSavedSearches();
    }
  }, [isSignedIn, loadSavedSearches, router]);

  const handleApplySearch = (search: SavedSearch) => {
    // Build query parameters from saved search filters
    const params = new URLSearchParams();
    
    if (search.filters?.search_query) {
      params.set('search', search.filters.search_query);
    }
    if (search.filters?.location) {
      params.set('location', search.filters.location);
    }
    if (search.filters?.category && search.filters.category !== 'all') {
      params.set('category', search.filters.category);
    }
    if (search.filters?.min_price) {
      params.set('min_price', search.filters.min_price.toString());
    }
    if (search.filters?.max_price) {
      params.set('max_price', search.filters.max_price.toString());
    }

    // Navigate to home page with search parameters
    router.push(`/home?${params.toString()}`);
  };

  const handleToggleNotifications = async (search: SavedSearch) => {
    setUpdatingId(search.id);
    try {
      const response = await api.updateSavedSearch(search.id, {
        notify_new_items: !search.notify_new_items,
      });

      if (response.success) {
        // Update local state
        setSavedSearches(prev =>
          prev.map(s =>
            s.id === search.id
              ? { ...s, notify_new_items: !s.notify_new_items }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Error updating saved search:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return;
    }

    setDeletingId(searchId);
    try {
      const response = await api.deleteSavedSearch(searchId);

      if (response.success) {
        // Remove from local state
        setSavedSearches(prev => prev.filter(s => s.id !== searchId));
        // Reset to page 1 if current page becomes empty
        const remainingCount = savedSearches.length - 1;
        const maxPage = Math.max(1, Math.ceil(remainingCount / itemsPerPage));
        if (currentPage > maxPage) {
          setCurrentPage(maxPage);
        }
      }
    } catch (error) {
      console.error('Error deleting saved search:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(savedSearches.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSearches = savedSearches.slice(startIndex, endIndex);

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
          <Bookmark className="h-8 w-8 text-blue-500 fill-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">Saved Searches</h1>
        </div>
        <p className="mt-2 text-gray-600">
          {isLoading ? 'Loading...' : `${savedSearches.length} saved search${savedSearches.length !== 1 ? 'es' : ''}${totalPages > 1 ? ` (Page ${currentPage} of ${totalPages})` : ''}`}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-600 py-12">Loading saved searches...</div>
      ) : savedSearches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No saved searches yet.</p>
          <p className="text-gray-400">Save your search criteria to get notified when new items match!</p>
          <Button
            onClick={() => router.push('/home')}
            className="mt-4"
          >
            Start Searching
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedSearches.map((search) => (
              <Card key={search.id} className="border-yellow-200 border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Bookmark className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                      <CardTitle className="text-lg">{search.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {search.notify_new_items ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          Notifications On
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <BellOff className="w-3 h-3" />
                          Notifications Off
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Display search criteria */}
                    <div className="flex flex-wrap gap-2">
                      {search.filters?.search_query && (
                        <Badge variant="outline">Search: {search.filters.search_query}</Badge>
                      )}
                      {search.filters?.location && (
                        <Badge variant="outline">Location: {search.filters.location}</Badge>
                      )}
                      {search.filters?.category && search.filters.category !== 'all' && (
                        <Badge variant="outline">Category: {search.filters.category}</Badge>
                      )}
                      {(search.filters?.min_price || search.filters?.max_price) && (
                        <Badge variant="outline">
                          Price: ${search.filters.min_price || '0'} - ${search.filters.max_price || '∞'}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Button
                        onClick={() => handleApplySearch(search)}
                        className="gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Apply Search
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleToggleNotifications(search)}
                        disabled={updatingId === search.id}
                        className="gap-2"
                      >
                        {updatingId === search.id ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                            Updating...
                          </>
                        ) : search.notify_new_items ? (
                          <>
                            <BellOff className="w-4 h-4" />
                            Turn Off Notifications
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4" />
                            Turn On Notifications
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteSearch(search.id)}
                        disabled={deletingId === search.id}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === search.id ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </>
                        )}
                      </Button>
                      <div className="ml-auto text-sm text-gray-500">
                        Saved {format(new Date(search.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination - Show when there are saved searches and more than 1 page */}
          {savedSearches.length > 0 && totalPages > 1 && (
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
