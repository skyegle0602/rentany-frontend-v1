'use client'


import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, DollarSign, Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  platform_fee?: number;
  security_deposit?: number;
  total_paid?: number;
  message?: string;
  created_date?: string;
  updated_date?: string;
}

interface ItemType {
  id: string;
  title: string;
  images?: string[];
  [key: string]: any;
}

interface LateFee {
  rental_request_id: string;
  total_fee: number;
  days_late: number;
  [key: string]: any;
}

export default function RentalHistoryPage() {
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [items, setItems] = useState<Record<string, ItemType>>({});
  const [lateFees, setLateFees] = useState<Record<string, LateFee>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const itemsPerPage = 20; // Show 20 rentals per page

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Redirect admins to admin dashboard - they shouldn't access rental history
      if (user.role === 'admin') {
        window.location.href = '/admin/dashboard';
        return;
      }
      
      // Set the current user in state
      setCurrentUser(user);
      
      // Only load rental requests for the current user (query separately as backend uses AND logic)
      const [renterReqsResponse, ownerReqsResponse] = await Promise.all([
        api.request<RentalRequest[]>(`/rental-requests?renter_email=${encodeURIComponent(user.email)}`),
        api.request<RentalRequest[]>(`/rental-requests?owner_email=${encodeURIComponent(user.email)}`)
      ]);
      
      const renterReqs = renterReqsResponse.success && renterReqsResponse.data ? renterReqsResponse.data : [];
      const ownerReqs = ownerReqsResponse.success && ownerReqsResponse.data ? ownerReqsResponse.data : [];
      // Merge and deduplicate
      const userRentals = Array.from(new Map([...renterReqs, ...ownerReqs].map(r => [r.id, r])).values());

      // Fetch items for all rental requests using batch query
      const itemIds = [...new Set(userRentals.map((r) => r.item_id).filter(Boolean))];
      const itemsMap: Record<string, ItemType> = {};
      
      if (itemIds.length > 0) {
        // Use batch query if multiple items, otherwise fetch individually
        if (itemIds.length === 1) {
          try {
            const itemResponse = await api.getItem(itemIds[0]);
            if (itemResponse.success && itemResponse.data) {
              const item = (itemResponse.data as any).item || itemResponse.data;
              itemsMap[item.id] = item as ItemType;
            }
          } catch (error) {
            console.error(`Error loading item ${itemIds[0]}:`, error);
          }
        } else {
          // Batch fetch using ids parameter
          const idsParam = itemIds.join(',');
          const itemsResponse = await api.request<ItemType[]>(`/items?ids=${encodeURIComponent(idsParam)}`);
          const fetchedItems = itemsResponse.success && itemsResponse.data ? (Array.isArray(itemsResponse.data) ? itemsResponse.data : []) : [];
          fetchedItems.forEach((item: ItemType) => {
            itemsMap[item.id] = item;
          });
        }
      }

      // TODO: Implement late fees API endpoint if needed
      const lateFeesMap: Record<string, LateFee> = {};

      setRentals(userRentals);
      setItems(itemsMap);
      setLateFees(lateFeesMap);
    } catch (error) {
      console.error("Error loading rental history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReceipt = async (rentalId: string) => {
    setDownloadingId(rentalId);
    try {
      const response = await api.downloadReceipt(rentalId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to download receipt');
      }
      
      // Handle file download
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${rentalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert("Failed to download receipt. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredRentals = rentals.filter(rental => {
    const item = items[rental.item_id];
    if (!item) return false; // Don't show rentals if item is missing or not loaded yet
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!currentUser) return false; // Don't filter if user isn't loaded yet

    if (filterType === "as_renter") {
      return matchesSearch && rental.renter_email === currentUser.email;
    }
    if (filterType === "as_owner") {
      return matchesSearch && rental.owner_email === currentUser.email;
    }
    return matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredRentals.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRentals = filteredRentals.slice(startIndex, endIndex);

  // Debug pagination visibility
  console.log('Pagination Debug:', {
    filteredRentalsCount: filteredRentals.length,
    itemsPerPage,
    totalPages,
    currentPage,
    shouldShowPagination: filteredRentals.length > 0 && totalPages > 1
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Rental History</h1>
          <p className="text-sm sm:text-base text-slate-600">View all your completed rentals and download receipts</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              placeholder="Search rentals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-10 sm:h-auto text-sm sm:text-base"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:text-base h-10 sm:h-auto"
          >
            <option value="all">All Rentals</option>
            <option value="as_renter">As Renter</option>
            <option value="as_owner">As Owner</option>
          </select>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {paginatedRentals.map((rental) => {
            const item = items[rental.item_id];
            const lateFee = lateFees[rental.id];
            const isDownloading = downloadingId === rental.id;
            const rentalCost = rental.total_amount || 0;
            const platformFee = typeof rental.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
            const securityDeposit = typeof rental.security_deposit === 'number' ? rental.security_deposit : 0;
            const totalPaid = typeof rental.total_paid === 'number' ? rental.total_paid : rentalCost + platformFee + securityDeposit;

            return (
              <motion.div
                key={rental.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                      <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                        {item?.images?.[0] && (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm sm:text-lg text-slate-900 line-clamp-2">{item?.title}</h3>
                          <div className="flex flex-col gap-1 sm:gap-2 mt-2 text-xs sm:text-sm text-slate-600">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">
                                {format(new Date(rental.start_date), "MMM d")} - {format(new Date(rental.end_date), "MMM d, yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <div className="flex flex-col leading-tight">
                                <span className="whitespace-nowrap font-medium">
                                  ${totalPaid.toFixed(2)}
                                </span>
                                <span className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">
                                  Rental ${rentalCost.toFixed(2)} • Fee ${platformFee.toFixed(2)} • Deposit ${securityDeposit.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {lateFee && (
                            <Badge variant="destructive" className="mt-2 text-xs">
                              Late Fee: ${lateFee.total_fee.toFixed(2)} ({lateFee.days_late} days)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownloadReceipt(rental.id)}
                        disabled={isDownloading}
                        className="w-full sm:w-auto sm:ml-auto text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {isDownloading ? (
                          <>
                            <div className="animate-spin w-3 h-3 sm:w-4 sm:h-4 border-2 border-slate-400 border-t-transparent rounded-full mr-2" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Receipt
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {filteredRentals.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <p className="text-slate-500 text-sm sm:text-base">No rental history found</p>
            </div>
          )}
        </div>

        {/* Pagination - Show when there are rentals and more than 1 page */}
        {filteredRentals.length > 0 && totalPages > 1 && (
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
      </div>
    </div>
  );
}
