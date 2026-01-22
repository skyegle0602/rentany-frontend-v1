'use client'

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { api, getCurrentUser, uploadFile, redirectToSignIn, type UserData } from "@/lib/api-client";
import StarRating from '@/components/reviews/StarRating';
import ChatWindow from '@/components/chat/ChatWindow';
import DisputeForm from '@/components/disputes/DisputeForm';
import PaymentDeadline from '@/components/chat/PaymentDeadline';
import RentalAgreementPreview from '@/components/rental/RentalAgreementPreview';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Calendar,
  DollarSign,
  Star,
  Package,
  User as UserIcon,
  Upload,
  AlertCircle,
  X,
  CheckCircle,
  Flag,
  Loader2,
  Clock,
  FileText,
  Download
} from "lucide-react";
import { format } from "date-fns";
import StripeDiagnostic from '@/components/stripe/StripeDiagnostic';

const createPageUrl = (path: string) => path;

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  paid: "bg-purple-100 text-purple-800 border-purple-200",
  inquiry: "bg-sky-100 text-sky-800 border-sky-200"
};

// Active statuses that users care about
const ACTIVE_STATUSES = ['pending', 'approved', 'paid', 'inquiry'];
const RECENTLY_COMPLETED_DAYS = 7; // Show completed rentals from last 7 days

// Helper to delay between API calls - INCREASED DELAYS
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// TypeScript interfaces
interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  message?: string;
  created_date: string;
  updated_date: string;
}

interface Item {
  id: string;
  title: string;
  images?: string[];
  videos?: string[];
  daily_rate: number;
}

interface Review {
  id: string;
  rental_request_id: string;
  reviewer_email: string;
  reviewee_email: string;
  rating: number;
  comment: string;
  images: string[];
  review_type: string;
}

interface ConditionReport {
  id: string;
  rental_request_id: string;
  report_type: 'pickup' | 'return';
  [key: string]: any;
}

interface ReviewRequest extends RentalRequest {
  reviewType: string;
}

interface StripeTestResult {
  success: boolean;
  keyType?: string;
  accountEmail?: string;
  chargesEnabled?: boolean;
  requirements?: string[];
  error?: string;
  details?: string;
  hint?: string;
}

export default function RequestsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [sentRequests, setSentRequests] = useState<RentalRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RentalRequest[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [usersMap, setUsersMap] = useState<Record<string, UserData>>({});
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [conditionReports, setConditionReports] = useState<Record<string, ConditionReport[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('Starting...');
  const [selectedChat, setSelectedChat] = useState<RentalRequest | null>(null);
  const [reviewData, setReviewData] = useState<{ rating: number; comment: string; images: string[] }>({ rating: 0, comment: '', images: [] });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [currentReviewRequest, setCurrentReviewRequest] = useState<ReviewRequest | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(null);
  const [isReportUserDialogOpen, setIsReportUserDialogOpen] = useState(false);
  const [userToReport, setUserToReport] = useState<UserData | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [backgroundDataLoading, setBackgroundDataLoading] = useState(false);
  const [showAgreementPreview, setShowAgreementPreview] = useState(null);
  const [showStripeTest, setShowStripeTest] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<StripeTestResult | null>(null);
  const [isTestingStripe, setIsTestingStripe] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handlePaymentConfirmation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const sessionId = urlParams.get('session_id');
      const requestId = urlParams.get('request_id');

      if (success === 'true' && sessionId && requestId) {
          setIsConfirmingPayment(true);
          setPageError(null);
          try {
              const response = await api.request<{ success: boolean; error?: string }>('/payments/process', {
                  method: 'POST',
                  body: JSON.stringify({
                      session_id: sessionId,
                      rental_request_id: requestId
                  })
              });

              if (response.success && response.data && response.data.success) {
                  await loadData();
              } else {
                  throw new Error(response.error || response.data?.error || 'Payment confirmation failed');
              }
          } catch (error: unknown) {
              console.error("Payment confirmation failed:", error);
              const errorObj = error as any;
              setPageError(errorObj.response?.data?.error || (error instanceof Error ? error.message : String(error)) || "Payment confirmation failed");
          } finally {
              setIsConfirmingPayment(false);
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
          }
      }
    };

    handlePaymentConfirmation();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setBackgroundDataLoading(true);
    setPageError(null);
    const startTime = Date.now();

    try {
      // ========================================
      // STEP 1: Load user (required)
      // ========================================
      setLoadingStage('Loading account...');
      console.log('⏱️ Step 1: Loading user...');
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      console.log(`✅ User loaded (${Date.now() - startTime}ms)`);

      await delay(2000); // Increased from 1000ms to 2000ms

      // ========================================
      // STEP 2: Load ONLY ACTIVE rental requests
      // ========================================
      setLoadingStage('Loading active conversations...');
      console.log('⏱️ Step 2: Loading active requests...');

      const sentReqsResponse = await api.request<RentalRequest[]>(`/rental-requests?renter_email=${encodeURIComponent(currentUser?.email || '')}&sort=-updated_date`).catch(() => ({ success: false, data: [] }));
      const allSentReqs = sentReqsResponse.success && sentReqsResponse.data ? sentReqsResponse.data : [];
      await delay(4000); // Add delay between requests
      const receivedReqsResponse = await api.request<RentalRequest[]>(`/rental-requests?owner_email=${encodeURIComponent(currentUser?.email || '')}&sort=-updated_date`).catch(() => ({ success: false, data: [] }));
      const allReceivedReqs = receivedReqsResponse.success && receivedReqsResponse.data ? receivedReqsResponse.data : [];

      // Filter to only active conversations
      const now = new Date();
      const recentDate = new Date(now.getTime() - RECENTLY_COMPLETED_DAYS * 24 * 60 * 60 * 1000);

      const activeSentReqs = allSentReqs.filter(r => {
        if (ACTIVE_STATUSES.includes(r.status)) return true;
        if (r.status === 'completed' && new Date(r.updated_date) > recentDate) return true;
        return false;
      });

      const activeReceivedReqs = allReceivedReqs.filter(r => {
        if (ACTIVE_STATUSES.includes(r.status)) return true;
        if (r.status === 'completed' && new Date(r.updated_date) > recentDate) return true;
        return false;
      });

      console.log(`✅ Active requests loaded: ${activeSentReqs.length} sent, ${activeReceivedReqs.length} received (${Date.now() - startTime}ms)`);
      console.log(`📊 Filtered out ${allSentReqs.length - activeSentReqs.length + allReceivedReqs.length - activeReceivedReqs.length} old conversations`);

      setSentRequests(activeSentReqs);
      setReceivedRequests(activeReceivedReqs);

      await delay(2000); // Increased from 1000ms to 2000ms

      // ========================================
      // STEP 3: Load items for active requests ONLY
      // ========================================
      setLoadingStage('Loading item details...');
      console.log('⏱️ Step 3: Loading items...');

      const itemsResponse = await api.request<Item[]>('/items').catch(() => ({ success: false, data: [] }));
      const allItems = itemsResponse.success && itemsResponse.data ? itemsResponse.data : [];
      const itemsMap: Record<string, Item> = {};
      allItems.forEach(item => itemsMap[item.id] = item);
      setItems(itemsMap);
      console.log(`✅ Items loaded: ${Object.keys(itemsMap).length} items (${Date.now() - startTime}ms)`);

      // ========================================
      // STEP 4: Show UI, track load time, and start lazy loading
      // ========================================
      const loadTime = (Date.now() - startTime) / 1000;
      const metrics = JSON.parse(localStorage.getItem('pageLoadMetrics') || '{}');
      metrics.conversations = loadTime.toFixed(2);
      localStorage.setItem('pageLoadMetrics', JSON.stringify(metrics));
      console.log(`✅ Conversations page loaded in ${loadTime.toFixed(2)}s`);

      // Show UI immediately with basic data
      setIsLoading(false); // Main content is now ready, UI becomes visible
      setLoadingStage('Loading additional details in background...'); // New stage for background tasks

      await delay(2000); // Increased from original

      // ========================================
      // STEP 5 (now Post-UI): Load users and other background data
      // ========================================
      // This part moves original STEP 4 (load users) and STEP 5 (load background data) to after UI is shown.
      console.log('⏱️ Post-UI: Loading user profiles...');
      await loadUsersForActiveRequests(currentUser as UserData, [...activeSentReqs, ...activeReceivedReqs] as RentalRequest[]);
      console.log(`✅ User profiles loaded (${Date.now() - startTime}ms total)`);

      if (activeSentReqs.length > 0 || activeReceivedReqs.length > 0) {
        loadBackgroundDataForActiveRequests([...activeSentReqs, ...activeReceivedReqs]);
      } else {
        // If there are no active requests, no background data will be loaded,
        // so set backgroundDataLoading to false here to prevent the badge from sticking.
        setBackgroundDataLoading(false);
      }

    } catch (error) {
      console.error("Error loading conversations:", error);

      if ((error as any).message?.includes('429')) {
        setPageError("Too many requests. Please wait a moment and refresh." as any);
      } else if ((error as any).message?.includes('401')) {
        setPageError("Session expired. Please sign in again." as any);
        redirectToSignIn();
      } else {
        setPageError("Couldn't load conversations. Please try again." as any);
      }

      setIsLoading(false);
      setBackgroundDataLoading(false); // Ensure background loading is also stopped on error
    }
  };

  // Load users (only for active requests) - INCREASED DELAYS
  const loadUsersForActiveRequests = async (currentUser: UserData, activeRequests: RentalRequest[]) => {
    const involvedEmails = new Set<string>();
    activeRequests.forEach(req => {
      if (req.renter_email !== currentUser.email) {
        involvedEmails.add(req.renter_email);
      }
      if (req.owner_email !== currentUser.email) {
        involvedEmails.add(req.owner_email);
      }
    });

    const tempUsersMap: Record<string, UserData> = {};

    for (const email of involvedEmails) {
      try {
        const response = await api.request<{ user: UserData }>(`/users/for-chat?email=${encodeURIComponent(email as string)}`);
        if (response.success && response.data?.user) {
          tempUsersMap[email as string] = response.data.user;
        } else {
          tempUsersMap[email as string] = { email: email as string, full_name: 'A User', username: undefined };
        }
        await delay(500); // Increased from 300ms to 500ms
      } catch (err) {
        console.log(`⚠️ Failed to load user ${email}:`, (err as any).message);
        tempUsersMap[email as string] = { email: email as string, full_name: 'A User', username: undefined };
      }
    }

    setUsersMap(tempUsersMap);
    console.log(`✅ Loaded ${Object.keys(tempUsersMap).length} user profiles`);
  };

  // Load background data - INCREASED DELAYS with better error handling
  const loadBackgroundDataForActiveRequests = async (activeRequest: RentalRequest[]) => {
    try {
      const requestIds = activeRequest.map(r => r.id);

      // Load reviews for active requests only
      console.log('Background: Loading reviews...');
      await delay(3000);
      try {
        const reviewsResponse = await api.request<Review[]>('/reviews');
        const allReviews = reviewsResponse.success && reviewsResponse.data ? reviewsResponse.data : [];
        const reviewsMap: Record<string, Review[]> = {};
        allReviews.forEach(review => {
          if (requestIds.includes(review.rental_request_id)) {
            if (!reviewsMap[review.rental_request_id]) {
              reviewsMap[review.rental_request_id] = [];
            }
            reviewsMap[review.rental_request_id].push(review);
          }
        });
        setReviews(reviewsMap);
        console.log('✅ Reviews loaded');
      } catch (err) {
        console.log('⚠️ Reviews loading skipped:', (err as any).message);
        setReviews({}); // Set empty object so UI doesn't break
      }

      // Load condition reports for active requests only - with retry logic
      console.log('Background: Loading condition reports...');
      await delay(5000); // Increased delay
      let reportRetries = 0;
      const maxRetries = 1; // Reduced retries
      
      while (reportRetries <= maxRetries) {
        try {
          const reportsResponse = await api.request<ConditionReport[]>('/condition-reports');
          const allReports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
          const reportsMap: Record<string, ConditionReport[]> = {};
          allReports.forEach(report => {
            if (requestIds.includes(report.rental_request_id)) {
              if (!reportsMap[report.rental_request_id]) {
                reportsMap[report.rental_request_id] = [];
              }
              reportsMap[report.rental_request_id].push(report);
            }
          });
          setConditionReports(reportsMap);
          console.log('✅ Condition reports loaded');
          break; // Success, exit retry loop
        } catch (err) {
          reportRetries++;
          console.log(`⚠️ Condition reports loading failed (attempt ${reportRetries}/${maxRetries + 1}):`, (err as any).message);
          
          if (reportRetries > maxRetries) {
            console.log('❌ Condition reports loading gave up after retries');
            setConditionReports({}); // Set empty object so UI doesn't break
          } else {
            // Wait longer before retry
            await delay(10000); // 10 seconds before retry
          }
        }
      }

      setBackgroundDataLoading(false);
      console.log('✅ All background data loaded');

    } catch (error) {
      console.error("Error loading background data:", error);
      // Make sure we set empty data so UI doesn't break
      setReviews({});
      setConditionReports({});
      setBackgroundDataLoading(false);
    }
  };

  const getItemForRequest = (itemId: string) => {
    return items[itemId];
  };

  const handleOpenChat = (request: RentalRequest) => {
    setSelectedChat(request);
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
  };

  const handleOpenReviewDialog = (request: RentalRequest, reviewType: string) => {
    setCurrentReviewRequest({ ...request, reviewType });
    setReviewData({ rating: 0, comment: '', images: [] });
    setIsReviewDialogOpen(true);
  };

  const handleCloseReviewDialog = () => {
    setIsReviewDialogOpen(false);
    setCurrentReviewRequest(null);
    setReviewData({ rating: 0, comment: '', images: [] });
  };

  const handleReviewImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploadingReviewImage(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await uploadFile(file);
        const file_url = result.file_url;
        return file_url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setReviewData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (error) {
      console.error("Error uploading review images:", error);
    } finally {
      setIsUploadingReviewImage(false);
      event.target.value = '';
    }
  };

  const removeReviewImage = (indexToRemove: number) => {
    setReviewData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleReviewSubmit = async () => {
    setIsSubmittingReview(true);
    if (!currentReviewRequest) return false;
    try {
      await api.request('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: currentReviewRequest.id,
          reviewer_email: user?.email || '',
          reviewee_email: currentReviewRequest.reviewType === 'for_owner' ? currentReviewRequest.owner_email : currentReviewRequest.renter_email,
          rating: reviewData.rating,
          comment: reviewData.comment,
          images: reviewData.images,
          review_type: currentReviewRequest.reviewType
        })
      });

      await loadData();
      handleCloseReviewDialog();
      return true;
    } catch (error) {
      console.error("Error submitting review:", error);
      return false;
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenReportUserDialog = (reportedUser: UserData) => {
    setUserToReport(reportedUser);
    setReportComment('');
    setIsReportUserDialogOpen(true);
  };

  const handleCloseReportUserDialog = () => {
    setIsReportUserDialogOpen(false);
    setUserToReport(null);
    setReportComment('');
  };

  const handleReportSubmit = async () => {
      if (!userToReport || !reportComment.trim()) return;
      setIsSubmittingReport(true);
      try {
          await api.request('/user-reports', {
            method: 'POST',
            body: JSON.stringify({
              reporter_email: user?.email || '',
              reported_email: userToReport?.email ||'',
              reason: 'other',
              description: reportComment
            })
          });

          alert("User reported successfully. Our team will review it shortly.");
          handleCloseReportUserDialog();
      } catch (error) {
          console.error("Error submitting user report:", error);
          alert("Failed to submit report. Please try again.");
      } finally {
          setIsSubmittingReport(false);
      }
  };

  const handleTestStripe = async () => {
    setIsTestingStripe(true);
    try {
      const response = await api.request<StripeTestResult>('/stripe/test');
      const data = response.success && response.data ? response.data : { success: false, error: response.error || 'Unknown error' };
      setStripeTestResult(data);
      console.log("Stripe test result:", data);
    } catch (error) {
      console.error("Stripe test error:", error);
      setStripeTestResult({ 
        success: false,
        error: (error as any).response?.data?.error || (error as any).message,
        details:(error as any).response?.data?.details,
        hint: (error as any).response?.data?.hint
      });
    } finally {
      setIsTestingStripe(false);
    }
  };

  const RequestCard = ({ request, type, item }: { request: RentalRequest; type: 'sent' | 'received'; item?: Item }) => {
    const reviewType = type === 'sent' ? 'for_owner' : 'for_renter';
    const requestReviews = reviews[request.id] || [];
    const hasBeenReviewed = requestReviews.some(review => review.reviewer_email === user?.email &&
      (review.review_type === reviewType || review.review_type === (reviewType === 'for_owner' ? 'for_renter' : 'for_owner'))
    );

    const otherUserEmail = type === 'sent' ? request.owner_email : request.renter_email;
    const otherUser = usersMap[otherUserEmail];

    const requestReports = conditionReports[request.id] || [];
    const pickupReports = requestReports.filter(r => r.report_type === 'pickup');
    const returnReports = requestReports.filter(r => r.report_type === 'return');
    const hasBothReports = pickupReports.length >= 1 && returnReports.length >= 1;

    const isOwner = user?.email === request.owner_email;
    const isPaid = request.status === 'paid';
    const isCompleted = request.status === 'completed';

    const canReleasePayment = isOwner && isPaid && hasBothReports;
    const canFileDispute = isPaid || isCompleted;
    const canLeaveReview = isCompleted && !hasBeenReviewed;

    const itemImage = item?.images?.[0] || item?.videos?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 sm:mb-4"
      >
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <div className="flex items-start gap-2 sm:gap-4">
              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-slate-200">
                {item ? (
                  <img
                    src={itemImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base md:text-lg line-clamp-2 leading-tight">
                    {item?.title || "Loading..."}
                  </CardTitle>
                  <Badge className={`${statusColors[request.status as keyof typeof statusColors]} border shadow-sm flex-shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}>
                    {request.status}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[11px] sm:text-sm text-slate-600 mt-1 sm:mt-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">
                      {type === "sent" ? `To: ` : `From: `}
                      {otherUser ? (
                        otherUser.username ? (
                          <Link href={`/PublicProfile?username=${otherUser.username}`} className="font-medium hover:underline">
                            @{otherUser.username}
                          </Link>
                        ) : (
                          <span className="font-medium">{otherUser.full_name}</span>
                        )
                      ) : (
                        <span className="text-slate-400">Loading...</span>
                      )}
                    </span>
                  </div>
                  {request.status !== 'inquiry' && (
                    <>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="whitespace-nowrap">
                          {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>${request.total_amount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {request.status === 'approved' && type === 'sent' && (
              <PaymentDeadline request={request} />
            )}

            {request.message && (
              <div className="bg-slate-50 rounded-lg p-2 sm:p-3 mb-2">
                <p className="text-xs sm:text-sm text-slate-700 line-clamp-3">"{request.message}"</p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={() => handleOpenChat(request)}
                variant="outline"
                className="w-full border-slate-300 hover:bg-slate-50 h-9 sm:h-10 text-xs sm:text-sm"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Open Chat
              </Button>

              <Button
                onClick={() => setShowAgreementPreview(request.id as any)}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 h-9 sm:h-10 text-xs sm:text-sm"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                View Agreement
              </Button>

              {canReleasePayment && (
                <Button
                  onClick={() => handleOpenChat(request)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Release Payment
                </Button>
              )}

              {canFileDispute && (
                <Button
                  onClick={() => setShowDisputeForm(request.id as any)}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  File a Dispute
                </Button>
              )}

              {canLeaveReview && (
                <Button
                  variant="outline"
                  className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 h-9 sm:h-10 text-xs sm:text-sm"
                  onClick={() => handleOpenReviewDialog(request, reviewType)}
                >
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Leave a Review
                </Button>
              )}

              {/* Download Receipt for completed/paid rentals */}
              {(request.status === 'completed' || request.status === 'paid') && (
                <Button
                  onClick={async () => {
                    try {
                      const response = await api.request<Blob>(`/receipts?rental_request_id=${request.id}`, {
                        method: 'GET',
                        headers: {
                          'Accept': 'application/pdf'
                        }
                      });
                      if (!response.success || !response.data) {
                        throw new Error('Failed to generate receipt');
                      }
                      const blob = response.data;
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `receipt-${request.id.slice(0, 8)}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      a.remove();
                    } catch (error) {
                      console.error('Error downloading receipt:', error);
                      alert('Failed to download receipt. Please try again.');
                    }
                  }}
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Download Receipt
                </Button>
              )}

              {otherUser && user && otherUser.email !== user.email && (
                <Button
                    onClick={() => handleOpenReportUserDialog(otherUser)}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 h-9 sm:h-10 text-xs sm:text-sm"
                >
                    <Flag className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Report User
                </Button>
              )}
            </div>

            <div className="text-[10px] sm:text-xs text-slate-400 mt-2">
              Submitted {format(new Date(request.created_date), "MMM d, yyyy")} at {format(new Date(request.created_date), "h:mm a")}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isConfirmingPayment) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
            <div className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
                Confirming your payment...
            </div>
            <p className="text-slate-600 mt-2">Please do not close this window.</p>
        </div>
    );
  }

  if (pageError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Conversations</h2>
            <p className="text-slate-600 mb-6 max-w-md">{pageError}</p>
            <Button onClick={() => window.location.reload()}>
                Try Again
            </Button>
        </div>
      );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full mb-6" />
        <p className="text-slate-800 text-xl font-semibold text-center mb-2">
          {loadingStage}
        </p>
        <p className="text-slate-600 text-sm text-center max-w-md">
          Loading only active conversations for faster performance...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to view your requests</h2>
          <Button onClick={() => redirectToSignIn()} className="bg-slate-900 hover:bg-slate-800">
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (selectedChat) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="h-full flex flex-col">
          <Card className="h-full border-0 shadow-xl bg-white/95 backdrop-blur-sm m-4 sm:m-6 overflow-hidden">
            <ChatWindow
              request={selectedChat}
              item={getItemForRequest(selectedChat.item_id)}
              currentUser={user}
              onBack={handleCloseChat}
              onUpdateRequest={loadData}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (showDisputeForm) {
    const disputeRequest = [...sentRequests, ...receivedRequests].find(r => r.id === showDisputeForm);
    if (disputeRequest) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setShowDisputeForm(null)}
              className="mb-4"
            >
              ← Back to Conversations
            </Button>

            <DisputeForm
              rentalRequest={disputeRequest}
              onSuccess={() => {
                setShowDisputeForm(null);
                alert("Dispute filed successfully. Our team will review it shortly.");
                loadData();
              }}
            />
          </div>
        </div>
      );
    }
  }

  // New conditional render for RentalAgreementPreview
  if (showAgreementPreview) {
    const previewRequest = [...sentRequests, ...receivedRequests].find(r => r.id === showAgreementPreview);
    if (previewRequest) {
      const previewItem = getItemForRequest(previewRequest.item_id);
      // Ensure usersMap is populated with both owner and renter for the agreement
      const renterUser = usersMap[previewRequest.renter_email] || (user.email === previewRequest.renter_email ? user : null);
      const ownerUser = usersMap[previewRequest.owner_email] || (user.email === previewRequest.owner_email ? user : null);
      const requestReports = conditionReports[previewRequest.id] || [];

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setShowAgreementPreview(null)}
              className="mb-4"
            >
              ← Back to Conversations
            </Button>

            <RentalAgreementPreview
              rentalRequest={previewRequest as any}
              item={previewItem as any}
              renter={renterUser}
              owner={ownerUser}
              conditionReports={requestReports as any}
            />
          </div>
        </div>
      );
    }
  }

  const totalActive = sentRequests.length + receivedRequests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Conversations</h1>
            <div className="flex items-center gap-2">
              {backgroundDataLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  Loading details...
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStripeTest(true)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Test Stripe
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <p>Active conversations only (last 7 days)</p>
            {totalActive > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {totalActive} active
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Stripe Test Results */}
        {stripeTestResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className={`${stripeTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {stripeTestResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${stripeTestResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {stripeTestResult.success ? '✅ Stripe Connection OK' : '❌ Stripe Configuration Error'}
                    </h3>
                    {stripeTestResult.success ? (
                      <div className="text-sm text-green-700 space-y-1">
                        <p><strong>Mode:</strong> {stripeTestResult.keyType}</p>
                        <p><strong>Account:</strong> {stripeTestResult.accountEmail}</p>
                        <p><strong>Charges Enabled:</strong> {stripeTestResult.chargesEnabled ? '✅ Yes' : '❌ No'}</p>
                        {stripeTestResult.requirements && stripeTestResult.requirements.length > 0 && (
                          <p className="text-orange-600 font-semibold mt-2">
                            ⚠️ Missing requirements: {stripeTestResult.requirements.join(', ')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-red-700 space-y-2">
                        <p><strong>Error:</strong> {stripeTestResult.error}</p>
                        {stripeTestResult.details && <p className="text-xs opacity-75">{stripeTestResult.details}</p>}
                        {stripeTestResult.hint && <p className="font-semibold mt-2">{stripeTestResult.hint}</p>}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStripeTestResult(null)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stripe Diagnostic Dialog */}
        <Dialog open={showStripeTest} onOpenChange={setShowStripeTest}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Stripe Configuration</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <StripeDiagnostic />
            </div>
          </DialogContent>
        </Dialog>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs defaultValue="sent" className="w-full">
              <TabsList className="grid w-full grid-cols-2 m-3 sm:m-6 mb-0">
                <TabsTrigger value="sent" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">My Requests</span>
                  <span className="xs:hidden">Sent</span>
                  ({sentRequests.length})
                </TabsTrigger>
                <TabsTrigger value="received" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Received</span>
                  <span className="xs:hidden">Inbox</span>
                  ({receivedRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sent" className="p-3 sm:p-6">
                {sentRequests.length > 0 ? (
                  <div>
                    {sentRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        type="sent"
                        item={getItemForRequest(request.item_id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No active requests</h3>
                    <p className="text-slate-600">You haven't sent any rental requests recently</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="received" className="p-3 sm:p-6">
                {receivedRequests.length > 0 ? (
                  <div>
                    {receivedRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        type="received"
                        item={getItemForRequest(request.item_id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No active requests</h3>
                    <p className="text-slate-600">You haven't received any rental requests recently</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Review your experience</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Rating</Label>
                <StarRating
                  rating={reviewData.rating}
                  setRating={(r) => setReviewData(p => ({ ...p, rating: r }))}
                />
              </div>
              <div>
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your thoughts..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData(p => ({ ...p, comment: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Label>Add Photos (Optional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleReviewImageUpload}
                    className="hidden"
                    id="review-image-upload"
                    disabled={isUploadingReviewImage}
                  />
                  <label
                    htmlFor="review-image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploadingReviewImage ? 'Uploading...' : 'Add Photos'}
                  </label>
                </div>
                {reviewData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {reviewData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeReviewImage(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseReviewDialog}
                disabled={isSubmittingReview}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                disabled={isSubmittingReview || reviewData.rating === 0}
              >
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Reporting Dialog */}
        <Dialog open={isReportUserDialogOpen} onOpenChange={setIsReportUserDialogOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Report User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p>You are reporting: <strong>{userToReport?.full_name || userToReport?.email}</strong></p>
                    <div>
                        <Label htmlFor="report-comment">Reason for report</Label>
                        <Textarea
                            id="report-comment"
                            placeholder="Please describe why you are reporting this user. Be as detailed as possible."
                            value={reportComment}
                            onChange={(e) => setReportComment(e.target.value)}
                            rows={5}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleCloseReportUserDialog}
                        disabled={isSubmittingReport}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReportSubmit}
                        disabled={isSubmittingReport || !reportComment.trim()}
                    >
                        {isSubmittingReport ? "Submitting..." : "Submit Report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}