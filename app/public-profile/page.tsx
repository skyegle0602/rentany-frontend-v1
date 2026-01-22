'use client'

import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User as UserIcon, Package, Star, ArrowLeft } from "lucide-react";
import ItemCard from '@/components/items/ItemCard';
import ReviewCard from '@/components/reviews/ReviewCard';
import { useRouter, useSearchParams } from 'next/navigation';
import VerificationBadge from '@/components/verification/VerificationBadge';
import FollowButton from '@/components/user/FollowButton';
import BlockReportMenu from '@/components/user/BlockReportMenu';

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  daily_rate: number;
  availability: boolean;
  images?: string[];
  owner_id?: string;
  created_by?: string;
  [key: string]: any;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_email: string;
  reviewee_email: string;
  review_type: 'for_owner' | 'for_renter';
  created_date: string;
}

export default function PublicProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [userItems, setUserItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  useEffect(() => {
    const username = searchParams.get('username');

    console.log('PublicProfile - Username extracted:', username);

    if (!username || username === '' || username === 'undefined') {
      console.error('No valid username provided in URL');
      setError('No username provided');
      setIsLoading(false);
      return;
    }

    loadCurrentUser();
    loadUserData(username);
  }, [searchParams]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading current user:", error);
      setCurrentUser(null);
    }
  };

  const loadUserData = async (username: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching profile for username:', username);
      
      // Fetch user by username (we'll need to create this endpoint or use email)
      // For now, let's try to get user by username from the users list
      const usersResponse = await api.request<UserData[]>(`/users?username=${encodeURIComponent(username)}`);
      
      let user: UserData | null = null;
      if (usersResponse.success && usersResponse.data) {
        const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        user = users.find(u => u.username?.toLowerCase() === username.toLowerCase()) || null;
      }
      
      if (!user) {
        // Try alternative: fetch all users and filter client-side (not ideal, but works)
        const allUsersResponse = await api.request<UserData[]>('/users');
        if (allUsersResponse.success && allUsersResponse.data) {
          const allUsers = Array.isArray(allUsersResponse.data) ? allUsersResponse.data : [];
          user = allUsers.find(u => u.username?.toLowerCase() === username.toLowerCase()) || null;
        }
      }
      
      if (!user) {
        setError('User not found');
        setProfileUser(null);
        setUserItems([]);
        setReviews([]);
        setIsLoading(false);
        return;
      }
      
      setProfileUser(user);
      
      // Fetch user's items
      const ownerId = user.clerk_id || user.id;
      if (ownerId) {
        const itemsResponse = await api.request<Item[]>(`/items?owner_id=${encodeURIComponent(ownerId)}`);
        if (itemsResponse.success && itemsResponse.data) {
          setUserItems(Array.isArray(itemsResponse.data) ? itemsResponse.data : []);
        } else {
          setUserItems([]);
        }
      } else {
        setUserItems([]);
      }
      
      // Fetch user's reviews
      if (user.email) {
        const reviewsResponse = await api.request<Review[]>(`/reviews?reviewee_email=${encodeURIComponent(user.email)}`);
        if (reviewsResponse.success && reviewsResponse.data) {
          setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
        } else {
          setReviews([]);
        }
      } else {
        setReviews([]);
      }
      
      console.log('Profile loaded:', user);
    } catch (error) {
      console.error("Error loading public profile data:", error);
      setError('Failed to load profile');
      setProfileUser(null);
      setUserItems([]);
      setReviews([]);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <Button variant="outline" onClick={() => router.push('/')} className="border-slate-200 hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Browse
            </Button>
          </div>
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm p-8">
            <UserIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-slate-900">Profile Not Found</h2>
            <p className="text-slate-600 mb-6">
              {error === 'No username provided' 
                ? 'The link you clicked didn\'t include a valid username.' 
                : 'The user profile you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <Button onClick={() => router.push('/')}>
              Browse All Items
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()} className="border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center flex-shrink-0">
                  {profileUser.profile_picture ? (
                    <img src={profileUser.profile_picture} alt={profileUser.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-slate-600" />
                  )}
                </div>
                <div className="text-center md:text-left flex-1">
                  <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                    <h1 className="text-3xl font-bold text-slate-900">{profileUser.full_name}</h1>
                    <VerificationBadge status={profileUser.verification_status || 'unverified'} size="md" />
                    {/* IMPORTANT: Only show report menu if viewing someone else's profile */}
                    {currentUser && currentUser.email !== profileUser.email && (
                      <BlockReportMenu 
                        targetEmail={profileUser.email} 
                        targetName={profileUser.full_name}
                      />
                    )}
                  </div>
                  <p className="text-slate-600 mb-4 font-mono">@{profileUser.username}</p>
                  {profileUser.bio && (
                    <p className="text-slate-700 mb-4">{profileUser.bio}</p>
                  )}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{userItems.length}</div>
                      <div className="text-sm text-slate-500">Listed Items</div>
                    </div>
                    <div className="text-center flex items-center gap-2">
                      <div className="text-2xl font-bold text-yellow-500">{averageRating.toFixed(1)}</div>
                      <div>
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <div className="text-sm text-slate-500">({totalReviews} reviews)</div>
                      </div>
                    </div>
                  </div>
                  {/* IMPORTANT: Only show follow button if viewing someone else's profile */}
                  {currentUser && currentUser.email !== profileUser.email && (
                    <FollowButton 
                      targetEmail={profileUser.email} 
                      targetName={profileUser.full_name}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="items" className="w-full">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm sticky top-0 z-10">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items">Items for Rent</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
              </CardHeader>
            </Card>

            <TabsContent value="items" className="mt-6">
              {userItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="text-center py-12">
                    <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900">No items listed</h3>
                    <p className="text-slate-600">This user hasn't listed any items for rent yet.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                  <CardContent className="text-center py-12">
                    <Star className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900">No reviews yet</h3>
                    <p className="text-slate-600">This user hasn't received any reviews.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
