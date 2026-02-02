'use client'

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Star, TrendingUp, AlertCircle, LogOut, Settings, FileText, AlertTriangle, Calendar } from "lucide-react";
import ItemCard from '@/components/items/ItemCard';
import ReviewCard from '@/components/reviews/ReviewCard';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';
import UsernamePrompt from '@/components/profile/UsernamePrompt';
import VerificationPrompt from '@/components/verification/VerificationPrompt';
import VerificationBadge from '@/components/verification/VerificationBadge';
import Link from 'next/link';
import { createPageUrl } from "@/lib/utils";
import WalletOverview from '@/components/wallet/WalletOverview';
import AccountSettings from '@/components/profile/AccountSettings';
import DocumentManager from '@/components/profile/DocumentManager';
import RentalHistoryTab from '@/components/profile/RentalHistoryTab';
import DisputeHistoryTab from '@/components/profile/DisputeHistoryTab';
import { getCurrentUser, api, redirectToSignIn, sendEmail, type UserData } from '@/lib/api-client';

interface ItemType {
  id: string;
  title: string;
  category: string;
  daily_rate: number;
  availability: boolean;
  [key: string]: any;
}

interface ReviewData {
  id: string;
  reviewer_email: string;
  rating: number;
  comment: string;
  created_date: string;
  review_type: 'for_owner' | 'for_renter';
  images?: string[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [userItems, setUserItems] = useState<ItemType[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('items');

  useEffect(() => {
    loadUserData();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Handle tab parameter
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
      }
      
      if (urlParams.get('verification') === 'complete') {
        const handleVerificationComplete = async () => {
          try {
            console.log('Verification complete. Reloading user data...');
            await loadUserData();
          } catch (error) {
            console.error("Error checking verification:", error);
          }
        };
        handleVerificationComplete();
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      // Handle Stripe Connect return
      if (urlParams.get('stripe') === 'success') {
        // Switch to wallet tab if not already there
        const tab = urlParams.get('tab') || 'wallet';
        setActiveTab('wallet');
        if (tab !== 'wallet') {
          window.history.replaceState({}, '', window.location.pathname + '?tab=wallet&stripe=success');
        }
      }
      
      // Handle payment setup redirect
      if (urlParams.get('setup') === 'payment') {
        setActiveTab('wallet');
      }
      
      // Handle payment method setup success - retrieve payment method
      if (urlParams.get('payment_method') === 'success') {
        const retrievePaymentMethod = async () => {
          try {
            console.log('Payment method setup completed, retrieving payment method...');
            const response = await api.request('/stripe/payment-method/retrieve', {
              method: 'POST',
            });
            if (response.success) {
              console.log('✅ Payment method retrieved and saved');
              // Reload user data to get updated payment method ID
              await loadUserData();
            } else {
              console.warn('⚠️ Failed to retrieve payment method:', response.error);
            }
          } catch (error) {
            console.error('Error retrieving payment method:', error);
          }
        };
        retrievePaymentMethod();
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname + (urlParams.get('tab') ? `?tab=${urlParams.get('tab')}` : ''));
      }
    }
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    setAuthError(null);
    const startTime = Date.now();

    try {
      console.log('Loading user data...');
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setAuthError("Your session has expired. Please sign in again.");
        redirectToSignIn();
        setIsLoading(false);
      return;
    }

      console.log('Current user:', currentUser);
      setUser(currentUser);

      // Send welcome email for new users (check if account is less than 24 hours old)
      if (typeof window !== 'undefined') {
        const welcomeEmailSent = localStorage.getItem(`welcome_email_sent_${currentUser.email}`);
        const accountAge = currentUser.created_at ? (Date.now() - new Date(currentUser.created_at).getTime()) : Infinity;
        const isNewUser = accountAge < 24 * 60 * 60 * 1000; // Less than 24 hours old
        
        if (!welcomeEmailSent && currentUser.username && isNewUser) {
          try {
            await sendEmail({
              to: currentUser.email,
              subject: 'Welcome to Rentany!',
              body: `Hi ${currentUser.full_name || currentUser.username},\n\nWelcome to Rentany! We're excited to have you join our community.`
            });
            localStorage.setItem(`welcome_email_sent_${currentUser.email}`, 'true');
            console.log('✅ Welcome email sent to new user');
          } catch (emailError: unknown) {
            // Silently mark as sent to prevent retries
            localStorage.setItem(`welcome_email_sent_${currentUser.email}`, 'true');
            const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
            console.log('Welcome email skipped:', errorMessage);
          }
        } else if (!welcomeEmailSent) {
          // Mark existing users as already sent to prevent future attempts
          localStorage.setItem(`welcome_email_sent_${currentUser.email}`, 'true');
        }
      }

      if (!currentUser.username || currentUser.username === '') {
        console.log('User needs to set username');
        setShowUsernamePrompt(true);
        setIsLoading(false);
            return;
      } else {
        console.log('User has username:', currentUser.username);
        setShowUsernamePrompt(false);
      }

      // Fetch user items - filter by owner_id (Clerk user ID)
      const ownerId = currentUser.clerk_id || currentUser.id;
      if (!ownerId) {
        console.warn('User does not have clerk_id or id, cannot fetch items');
        setUserItems([]);
      } else {
        const itemsResponse = await api.request<ItemType[]>(`/items?owner_id=${encodeURIComponent(ownerId)}`);
        if (itemsResponse.success && itemsResponse.data) {
          const items = Array.isArray(itemsResponse.data) ? itemsResponse.data : [];
          setUserItems(items);
          } else {
          setUserItems([]);
        }
      }

      // Fetch user reviews
      const reviewsResponse = await api.getReviews(undefined, currentUser.id);
      if (reviewsResponse.success && reviewsResponse.data) {
        const reviews = Array.isArray(reviewsResponse.data) ? reviewsResponse.data : [];
        setReviews(reviews);
      }

      console.log('User data loaded successfully');

      // Track load time for admin dashboard
      if (typeof window !== 'undefined') {
        const loadTime = (Date.now() - startTime) / 1000;
        const metrics = JSON.parse(localStorage.getItem('pageLoadMetrics') || '{}');
        metrics.profile = loadTime.toFixed(2);
        localStorage.setItem('pageLoadMetrics', JSON.stringify(metrics));
        console.log(`✅ Profile page loaded in ${loadTime.toFixed(2)}s`);
      }

    } catch (error: unknown) {
      console.error("Error loading user data:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStatus = (error as any)?.status;

      if (errorMessage.includes('401') || errorStatus === 401) {
        setAuthError("Your session has expired. Please sign in again.");
        setUser(null);
        redirectToSignIn();
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setAuthError("Network error. Please check your connection and try again.");
      } else {
        setAuthError(`Failed to load profile: ${errorMessage}`);
      }
    }
    setIsLoading(false);
  };

  const availableItems = userItems.filter((item) => item.availability).length;

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ?
    reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews :
    0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
          <p className="text-slate-600 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-6 sm:p-8 text-center max-w-md w-full">
          <div className="mb-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Authentication Error</h2>
            <p className="text-slate-600 text-sm sm:text-base mb-4">{authError}</p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => redirectToSignIn()}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              Sign In Again
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAuthError(null);
                loadUserData();
              }}
              className="w-full"
            >
              Retry Loading
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-6 sm:p-8 text-center max-w-md w-full">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Sign in to view your profile</h2>
          <Button onClick={() => redirectToSignIn()} className="w-full bg-slate-900 hover:bg-slate-800">
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (showUsernamePrompt) {
    return <UsernamePrompt onUpdate={loadUserData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Mobile-Optimized Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
            {/* Gradient Background Banner */}
            <div className="h-16 sm:h-24 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900" />
            
            <CardContent className="px-4 sm:px-8 pb-4 sm:pb-8 -mt-10 sm:-mt-14">
              {/* Profile Picture - Centered on Mobile */}
              <div className="flex flex-col items-center mb-4">
                <ProfilePictureUpload
                  currentUser={user}
                  onUpdate={loadUserData}
                />
                
                {/* User Info - Centered */}
                <div className="text-center mt-3 w-full">
                  {/* Name and Verification Badge */}
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{user.full_name}</h1>
                    <VerificationBadge 
                      status={user.verification_status || 'unverified'} 
                      size="md" 
                      userIntent={user.intent}
                      stripe_payment_method_id={(user as any).stripe_payment_method_id}
                          />
                        </div>

                  {/* Username */}
                  <p className="text-slate-600 mb-3 font-mono text-sm">@{user.username}</p>
                  
                  {/* Stats Row - Grid Layout */}
                  <div className="grid grid-cols-3 gap-3 mb-4 max-w-sm mx-auto">
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-slate-900">{userItems.length}</div>
                      <div className="text-xs text-slate-500">Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-green-600">{availableItems}</div>
                      <div className="text-xs text-slate-500">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{averageRating.toFixed(1)}</div>
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  </div>
                      <div className="text-xs text-slate-500">({totalReviews} reviews)</div>
                        </div>
                      </div>
                    </div>
                  </div>

              {/* Action Buttons - Stacked on Mobile */}
              <div className="flex flex-col gap-2">
                <Link href={createPageUrl("AddItem")} className="w-full">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 h-11 rounded-xl font-semibold text-sm">
                    List New Item
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Clerk handles logout via sign-out page
                    window.location.href = '/auth/signout';
                  }}
                  className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 text-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
                      </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Verification Prompt */}
        {/* Show for renters without payment method, or owners without verification */}
        {((user.intent === 'renter' && !(user as any).stripe_payment_method_id) || 
          (user.intent !== 'renter' && user.verification_status !== 'verified')) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <VerificationPrompt currentUser={user} />
                </motion.div>
              )}

        {/* Enhanced Tabs with New Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm sticky top-0 z-10">
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-auto gap-1">
                  <TabsTrigger value="items" className="text-xs sm:text-sm px-2 py-2">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Items</span>
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="text-xs sm:text-sm px-2 py-2">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Wallet</span>
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2 py-2">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Reviews</span>
                  </TabsTrigger>
                  <TabsTrigger value="rentals" className="text-xs sm:text-sm px-2 py-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Rentals</span>
                  </TabsTrigger>
                  <TabsTrigger value="disputes" className="text-xs sm:text-sm px-2 py-2">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Disputes</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 py-2">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Documents</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-2">
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
            </Card>

            <TabsContent value="items" className="mt-4">
              {userItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {userItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="text-center py-12 px-4">
                    <Package className="w-12 sm:w-16 h-12 sm:h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">No items listed yet</h3>
                    <p className="text-sm text-slate-600 mb-6">Start earning by listing your first item</p>
                    <Link href={createPageUrl("AddItem")}>
                      <Button className="bg-slate-900 hover:bg-slate-800">
                        List Your First Item
                  </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="wallet" className="mt-4">
              <WalletOverview />
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
              </div>
              ) : (
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="text-center py-12 px-4">
                    <Star className="w-12 sm:w-16 h-12 sm:h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">No reviews yet</h3>
                    <p className="text-sm text-slate-600">Complete rentals to receive reviews from others</p>
          </CardContent>
        </Card>
              )}
            </TabsContent>

            <TabsContent value="rentals" className="mt-4">
              <RentalHistoryTab userEmail={user.email} />
            </TabsContent>

            <TabsContent value="disputes" className="mt-4">
              <DisputeHistoryTab userEmail={user.email} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <DocumentManager user={user} onUpdate={loadUserData} />
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <AccountSettings user={user} onUpdate={loadUserData} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
