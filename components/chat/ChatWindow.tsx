'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, getCurrentUser, type UserData } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, Check, X, ArrowLeft, CheckCircle2, CreditCard, User as UserIcon, AlertCircle, Star, Upload, Camera, MessageSquare, Clock } from 'lucide-react';
// Typing indicators will use api.request
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import ChatAttachments from './ChatAttachments';
import StarRating from '../reviews/StarRating';
import { format, differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/lib/utils";
import DisputeForm from '../disputes/DisputeForm';
import ConditionReportForm from './ConditionReportForm';
import ConditionReportDisplay from './ConditionReportDisplay';
import PaymentDeadline from './PaymentDeadline';
import ExtensionRequest from '../rental/ExtensionRequest';
import ExtensionRequestDisplay from '../rental/ExtensionRequestDisplay';

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  paid: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-purple-100 text-purple-800 border-purple-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  archived: "bg-slate-100 text-slate-800 border-slate-200"
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Message {
  id: string;
  rental_request_id: string;
  sender_email: string;
  content?: string;
  attachments?: Array<{ type: 'image' | 'document'; url: string; name?: string; size?: number }>;
  message_type?: string;
  created_date: string;
  is_read?: boolean;
  read_at?: string;
}

interface RentalRequest {
  id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  return_pin_verified?: boolean;
  total_amount?: number;
  platform_fee?: number;
  security_deposit?: number;
  total_paid?: number;
  [key: string]: any;
}

interface Review {
  id: string;
  rental_request_id: string;
  reviewer_email: string;
  reviewee_email: string;
  rating: number;
  comment?: string;
  images?: string[];
  [key: string]: any;
}

interface ConditionReport {
  id: string;
  rental_request_id: string;
  report_type: 'pickup' | 'return';
  [key: string]: any;
}

interface Extension {
  id: string;
  rental_request_id: string;
  status: 'pending' | 'approved' | 'declined';
  [key: string]: any;
}

interface Item {
  id?: string;
  title?: string;
  daily_rate?: number;
  [key: string]: any;
}

interface ChatWindowProps {
  request: RentalRequest;
  item?: Item;
  currentUser: UserData;
  onBack?: () => void;
  onUpdateRequest?: () => void;
}

export default function ChatWindow({ request, item, currentUser, onBack, onUpdateRequest }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<RentalRequest>(request);
  const [otherUser, setOtherUser] = useState<UserData | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: '', images: [] as string[] });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToTop, setShouldScrollToTop] = useState(true);
  const [isLocallyInitiatedStatusUpdate, setIsLocallyInitiatedStatusUpdate] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [showConditionForm, setShowConditionForm] = useState<'pickup' | 'return' | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionRequests, setExtensionRequests] = useState<Extension[]>([]);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialLoadRef = useRef(false);

  // Check if user is actively using forms - if so, pause auto-refresh
  const isFormActive = showConditionForm || showDisputeForm || showExtensionForm || isTyping;

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      const isNearTop = scrollTop < 100;
      setShouldScrollToTop(isNearTop);
    }
  };
  
  const fetchOtherUser = useCallback(async () => {
    const otherEmail = currentUser.email === request.renter_email 
      ? request.owner_email 
      : request.renter_email;
    
    try {
      const response = await api.request<{ user: UserData }>(`/users/for-chat?email=${encodeURIComponent(otherEmail)}`);
      
      if (response.success && response.data?.user) {
        setOtherUser(response.data.user);
      } else {
        setOtherUser({ 
          email: otherEmail, 
          full_name: 'A User', 
          username: undefined 
        } as UserData);
      }
    } catch (error) {
      console.error("Error fetching other user:", error);
      setOtherUser({ 
        email: otherEmail, 
        full_name: 'A User', 
        username: undefined 
      } as UserData);
    }
  }, [currentUser.email, request.renter_email, request.owner_email]);

  const loadReviews = useCallback(async () => {
    if (isRateLimited) {
      console.log("Skipping review load - rate limited");
      return;
    }
    
    try {
      await delay(1500); // Changed from 1000ms to 1500ms
      const reviewsResponse = await api.request<Review[]>(`/reviews?rental_request_id=${request.id}`);
      const allReviews = reviewsResponse.success && reviewsResponse.data ? reviewsResponse.data : [];
      setReviews(allReviews);
      setIsRateLimited(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        console.log("⚠️ Rate limited when loading reviews");
        setIsRateLimited(true);
      } else {
        console.error("Error loading reviews:", error);
      }
    }
  }, [request.id, isRateLimited]);

  const loadConditionReports = useCallback(async () => {
    if (isRateLimited) {
      console.log("Skipping condition report load - rate limited");
      return;
    }
    
    try {
      await delay(1500); // Changed from 1000ms to 1500ms
      const reportsResponse = await api.request<ConditionReport[]>(`/condition-reports?rental_request_id=${request.id}`);
      const reports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
      setConditionReports(reports);
      setIsRateLimited(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        console.log("⚠️ Rate limited when loading condition reports");
        setIsRateLimited(true);
      } else {
        console.error("Error loading condition reports:", error);
      }
    }
  }, [request.id, isRateLimited]);

  const loadExtensionRequests = useCallback(async () => {
    if (isRateLimited) {
      console.log("Skipping extension request load - rate limited");
      return;
    }
    
    try {
      await delay(1500); // Changed from 1000ms to 1500ms
      const extensionsResponse = await api.request<Extension[]>(`/rental-extensions?rental_request_id=${request.id}`);
      const extensions = extensionsResponse.success && extensionsResponse.data ? extensionsResponse.data : [];
      setExtensionRequests(extensions);
      setIsRateLimited(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        console.log("⚠️ Rate limited when loading extension requests");
        setIsRateLimited(true);
      } else {
        console.error("Error loading extension requests:", error);
      }
    }
  }, [request.id, isRateLimited]);

  const loadAndReadMessages = useCallback(async (isInitial = false) => {
    if (isRateLimited && !isInitial) {
      console.log("Skipping message load - rate limited");
      return;
    }
    
    try {
      const messagesResponse = await api.request<Message[]>(`/messages?rental_request_id=${request.id}`);
      const fetchedMessages = messagesResponse.success && messagesResponse.data ? messagesResponse.data : [];
      
      // Only update if messages actually changed
      const messagesChanged = isInitial || 
        fetchedMessages.length !== messages.length || 
        JSON.stringify(fetchedMessages.map(m => m.id)) !== JSON.stringify(messages.map(m => m.id));
      
      if (messagesChanged) {
        setMessages(fetchedMessages);
      }

      const unreadMessages = fetchedMessages.filter(msg => 
        !msg.is_read && msg.sender_email !== currentUser.email
      );
      
      if (unreadMessages.length > 0) {
        await delay(500); 
        const readAt = new Date().toISOString();
        const updatePromises = unreadMessages.map(msg => 
          api.request(`/messages/${msg.id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_read: true, read_at: readAt })
          })
        );
        await Promise.all(updatePromises);
      }
      
      setIsRateLimited(false);
      setLastRefreshTime(Date.now());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        console.log("⚠️ Rate limited when loading messages");
        setIsRateLimited(true);
      } else {
        console.error("Error loading messages:", error);
      }
    }
  }, [request.id, currentUser.email, messages, isRateLimited]);

  const refreshRequestStatus = useCallback(async () => {
    if (isLocallyInitiatedStatusUpdate || isRateLimited) {
        return; 
    }

    try {
      // Only load rental requests for the current user (much more efficient than loading all)
      const [renterReqsResponse, ownerReqsResponse] = await Promise.all([
        api.request<RentalRequest[]>(`/rental-requests?renter_email=${encodeURIComponent(currentUser.email)}`),
        api.request<RentalRequest[]>(`/rental-requests?owner_email=${encodeURIComponent(currentUser.email)}`)
      ]);
      const renterReqs = renterReqsResponse.success && renterReqsResponse.data ? renterReqsResponse.data : [];
      const ownerReqs = ownerReqsResponse.success && ownerReqsResponse.data ? ownerReqsResponse.data : [];
      const allUserRequests = [...renterReqs, ...ownerReqs];
      const updatedRequest = allUserRequests.find(r => r.id === request.id);
      
      // Only update if status or return_pin_verified actually changed
      if (updatedRequest && (updatedRequest.status !== currentRequest.status || updatedRequest.return_pin_verified !== currentRequest.return_pin_verified)) {
        setCurrentRequest(updatedRequest);
        onUpdateRequest?.();
      }
      setIsRateLimited(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
        console.log("Rate limited when refreshing request status, will retry later");
        setIsRateLimited(true);
      } else {
        console.error("Error refreshing request status:", error);
      }
    }
  }, [isLocallyInitiatedStatusUpdate, request.id, currentRequest.status, currentRequest.return_pin_verified, onUpdateRequest, isRateLimited]);

  // Check if other user is typing
  const checkTypingStatus = useCallback(async () => {
    try {
      const otherEmail = currentUser.email === request.renter_email 
        ? request.owner_email 
        : request.renter_email;
      
      const indicatorsResponse = await api.request<any[]>(`/typing-indicators?rental_request_id=${request.id}&user_email=${otherEmail}`);
      const indicators = indicatorsResponse.success && indicatorsResponse.data ? indicatorsResponse.data : [];
      
      if (indicators.length > 0) {
        const indicator = indicators[0];
        const expiresAt = new Date(indicator.expires_at);
        if (indicator.is_typing && expiresAt > new Date()) {
          setOtherUserTyping(true);
        } else {
          setOtherUserTyping(false);
        }
      } else {
        setOtherUserTyping(false);
      }
    } catch (error) {
      // Silently fail - typing indicator is not critical
    }
  }, [currentUser.email, request.id, request.renter_email, request.owner_email]);

  // Update typing status
  const updateTypingStatus = useCallback(async (typing: boolean) => {
    try {
      const existingResponse = await api.request<any[]>(`/typing-indicators?rental_request_id=${request.id}&user_email=${currentUser.email}`);
      const existingIndicators = existingResponse.success && existingResponse.data ? existingResponse.data : [];
      
      const expiresAt = new Date(Date.now() + 5000).toISOString(); // 5 seconds
      
      if (existingIndicators.length > 0) {
        await api.request(`/typing-indicators/${existingIndicators[0].id}`, {
          method: 'PUT',
          body: JSON.stringify({
            is_typing: typing,
            expires_at: expiresAt
          })
        });
      } else if (typing) {
        await api.request('/typing-indicators', {
          method: 'POST',
          body: JSON.stringify({
            rental_request_id: request.id,
            user_email: currentUser.email,
            is_typing: true,
            expires_at: expiresAt
          })
        });
      }
    } catch (error) {
      // Silently fail
    }
  }, [request.id, currentUser.email]);

  // Use refs to store latest function versions for intervals (after all functions are declared)
  const loadAndReadMessagesRef = useRef(loadAndReadMessages);
  const refreshRequestStatusRef = useRef(refreshRequestStatus);
  const loadReviewsRef = useRef(loadReviews);
  const loadConditionReportsRef = useRef(loadConditionReports);
  const loadExtensionRequestsRef = useRef(loadExtensionRequests);
  const checkTypingStatusRef = useRef(checkTypingStatus);
  
  // Update refs when functions change
  useEffect(() => {
    loadAndReadMessagesRef.current = loadAndReadMessages;
    refreshRequestStatusRef.current = refreshRequestStatus;
    loadReviewsRef.current = loadReviews;
    loadConditionReportsRef.current = loadConditionReports;
    loadExtensionRequestsRef.current = loadExtensionRequests;
    checkTypingStatusRef.current = checkTypingStatus;
  }, [loadAndReadMessages, refreshRequestStatus, loadReviews, loadConditionReports, loadExtensionRequests, checkTypingStatus]);

  // Manual refresh function (no longer exposed in header, but kept for potential internal use)
  const handleManualRefresh = async () => {
    if (isRateLimited) return;
    setIsLoading(true); 
    try {
      await loadAndReadMessages(false);
      await delay(400); 
      await refreshRequestStatus();
      await delay(400); 
      await Promise.all([
        loadReviews(),
        loadConditionReports(),
        loadExtensionRequests()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only run initial load once per component mount
    if (hasInitialLoadRef.current) {
      return;
    }
    
    const initialLoad = async () => {
        hasInitialLoadRef.current = true;
        setIsLoading(true);
        
        try {
          // Step 1: Load user
          try {
            await fetchOtherUser();
          } catch (error) {
            console.error("Error fetching other user:", error);
          }
          await delay(1500);
          
          // Step 2: Load messages (most important)
          try {
            await loadAndReadMessages(true);
          } catch (error) {
            console.error("Error loading messages:", error);
            // Set empty messages array if load fails
            setMessages([]);
          }
          await delay(1500);
          
          // Scroll to top after initial load (newest messages at top)
          setTimeout(() => {
            scrollToTop();
          }, 100);
        } finally {
          // Always clear loading state, even if some requests fail
          setIsLoading(false);
        }

        // Step 3: Load everything else in background with increased delays
        // These are non-critical, so we don't block on them
        try {
          await loadReviews();
        } catch (error) {
          console.error("Error loading reviews:", error);
        }
        await delay(2000);
        
        try {
          await loadConditionReports();
        } catch (error) {
          console.error("Error loading condition reports:", error);
        }
        await delay(2000);
        
        try {
          await loadExtensionRequests();
        } catch (error) {
          console.error("Error loading extension requests:", error);
        }
    };
    initialLoad();
    
    // Auto-refresh every 5 MINUTES (increased from 2 minutes)
    const interval = setInterval(async () => {
      if (isFormActive) {
        console.log("⏸️ Skipping auto-refresh: user is actively typing or using a form");
        return;
      }

      if (!isRateLimited) {
        console.log("🔄 Auto-refreshing data...");
        await loadAndReadMessagesRef.current(false);
        await delay(3000); // Increased delay between calls
        await refreshRequestStatusRef.current();
        await delay(3000);
        await loadReviewsRef.current();
        await delay(3000);
        await loadConditionReportsRef.current();
        await delay(3000);
        await loadExtensionRequestsRef.current();
        console.log("✅ Auto-refresh complete");
      }
    }, 300000); // Changed from 120000 (2 min) to 300000 (5 min)

    // Typing indicator check - every 3 seconds
    const typingInterval = setInterval(() => {
      checkTypingStatusRef.current();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(typingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - use refs for functions to avoid re-renders

  useEffect(() => {
    if (shouldScrollToTop) {
      scrollToTop();
    }
  }, [messages, shouldScrollToTop, conditionReports, extensionRequests]);

  useEffect(() => {
    if (request.id === currentRequest.id && (request.status !== currentRequest.status || request.return_pin_verified !== currentRequest.return_pin_verified)) {
        setCurrentRequest(request);
    } else if (request.id !== currentRequest.id) {
        setCurrentRequest(request);
    }
  }, [request, currentRequest.id, currentRequest.status, currentRequest.return_pin_verified]);

  const sendMessage = async (e?: React.FormEvent<HTMLFormElement> | null, attachments: Array<{ type: 'image' | 'document'; url: string; name?: string; size?: number }> | null = null) => {
    e?.preventDefault?.();
    if ((!newMessage.trim() && !attachments) || isSending) return;

    setIsSending(true);
    try {
      const messageData: {
        rental_request_id: string;
        sender_email: string;
        content: string;
        message_type: string;
        is_read: boolean;
        attachments?: Array<{ type: 'image' | 'document'; url: string; name?: string; size?: number }>;
      } = {
        rental_request_id: request.id,
        sender_email: currentUser.email,
        content: newMessage.trim() || (attachments ? '📎 Sent attachment(s)' : ''),
        message_type: "message",
        is_read: false
      };

      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }

      await api.request('/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      
      setNewMessage('');
      await loadAndReadMessages(false);
      
      // Clear typing state
      setIsTyping(false);
      updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send push notification to other user
      const otherEmail = currentUser.email === request.renter_email 
        ? request.owner_email 
        : request.renter_email;

      try {
        // TODO: Implement push notifications endpoint in backend
        await api.request('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            user_email: otherEmail,
            type: 'message',
            title: `New message from ${currentUser.full_name || 'Someone'}`,
            message: newMessage.trim().substring(0, 100) || 'Sent an attachment',
            link: createPageUrl('Request')
          })
        });
      } catch (notifError) {
        // Notification failed, but message was sent
        console.log('Push notification failed:', notifError);
      }
    }
    catch (error) {
      console.error("Error sending message:", error);
    }
    setIsSending(false);
  };

  const handleAttachmentSend = (attachments: Array<{ type: 'image' | 'document'; url: string; name?: string; size?: number }>) => {
    sendMessage(null, attachments);
  };

  const handleApprove = async () => {
    if (currentRequest.status !== 'pending') return;

    setIsUpdatingStatus(true);
    setIsLocallyInitiatedStatusUpdate(true);
    try {
      await api.request(`/rental-requests/${currentRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });
      
      // Note: Dates are automatically blocked by the backend when status changes to 'approved'
      // No need to manually block dates here

      await api.request('/messages', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: currentRequest.id,
          sender_email: 'system',
          content: 'Request approved! Renter can now proceed with payment.',
          message_type: "status_update",
          is_read: false
        })
      });

      // Email notifications removed - using in-app notifications and chat instead

      setCurrentRequest(prev => ({ ...prev, status: 'approved' }));
      await loadAndReadMessages(false);
      onUpdateRequest?.();
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setIsUpdatingStatus(false);
      setTimeout(() => setIsLocallyInitiatedStatusUpdate(false), 500); 
    }
  };

  const handleDecline = async () => {
    if (currentRequest.status !== 'pending') return;

    setIsUpdatingStatus(true);
    setIsLocallyInitiatedStatusUpdate(true);
    try {
      await api.request(`/rental-requests/${currentRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'declined' })
      });
      
      const availabilitiesResponse = await api.request<any[]>(`/item-availability?rental_request_id=${currentRequest.id}`);
      const availabilities = availabilitiesResponse.success && availabilitiesResponse.data ? availabilitiesResponse.data : [];
      if (availabilities.length > 0) {
        await api.request(`/item-availability/${availabilities[0].id}`, {
          method: 'DELETE'
        });
      }

      await api.request('/messages', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: currentRequest.id,
          sender_email: 'system',
          content: 'Request declined.',
          message_type: "status_update",
          is_read: false
        })
      });

      setCurrentRequest(prev => ({ ...prev, status: 'declined' }));
      await loadAndReadMessages(false);
      onUpdateRequest?.();
    } catch (error) {
      console.error("Error declining request:", error);
    } finally {
      setIsUpdatingStatus(false);
      setTimeout(() => setIsLocallyInitiatedStatusUpdate(false), 500); 
    }
  };

  const handleCancel = async () => {
    if (currentRequest.status === 'cancelled') return;

    setIsUpdatingStatus(true);
    setIsLocallyInitiatedStatusUpdate(true);
    try {
      await api.request(`/rental-requests/${currentRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      const availabilitiesResponse = await api.request<any[]>(`/item-availability?rental_request_id=${currentRequest.id}`);
      const availabilities = availabilitiesResponse.success && availabilitiesResponse.data ? availabilitiesResponse.data : [];
      if (availabilities.length > 0) {
        await api.request(`/item-availability/${availabilities[0].id}`, {
          method: 'DELETE'
        });
      }

      await api.request('/messages', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: currentRequest.id,
          sender_email: 'system',
          content: 'This rental has been cancelled.',
          message_type: "status_update",
          is_read: false
        })
      });

      setCurrentRequest(prev => ({ ...prev, status: 'cancelled' }));
      await loadAndReadMessages(false);
      onUpdateRequest?.();
    } catch (error) {
      console.error("Error cancelling request:", error);
    } finally {
      setIsUpdatingStatus(false);
      setTimeout(() => setIsLocallyInitiatedStatusUpdate(false), 500); 
    }
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      console.log('💳 Starting payment for rental request:', request.id);
      console.log('📍 Return URL:', window.location.origin + createPageUrl('Request'));
      
      const response = await api.request<{ url?: string; checkout_url?: string }>('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: request.id,
          return_url: typeof window !== 'undefined' ? window.location.origin + createPageUrl('Request') : ''
        })
      });

      console.log('✅ Full checkout response:', response);
      console.log('✅ Response data:', response.data);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create checkout session');
      }
      
      const checkoutUrl = response.data.url || response.data.checkout_url;
      
      if (checkoutUrl && typeof window !== 'undefined') {
        console.log('🔗 Redirecting to Stripe checkout:', checkoutUrl);
        window.location.href = checkoutUrl;
      } else {
        console.error('❌ No checkout URL in response:', response);
        alert('Failed to create payment session. No checkout URL received. Please try again.');
        setIsProcessingPayment(false);
      }
    } catch (error) {
      console.error("❌ Error creating checkout:", error);
      const errorObj = error as any;
      console.error("❌ Error response:", errorObj.response);
      console.error("❌ Error data:", errorObj.response?.data);
      
      const errorMsg = errorObj.response?.data?.error || (error instanceof Error ? error.message : String(error)) || 'Unknown error';
      const errorHint = errorObj.response?.data?.hint || '';
      const errorDetails = errorObj.response?.data?.details || '';
      
      alert(`Payment Error:\n${errorMsg}\n\n${errorHint}\n\nDetails: ${errorDetails}`);
      setIsProcessingPayment(false);
    }
  };

  const handleReleasePayment = async () => {
    setIsUpdatingStatus(true);
    setReleaseError(null);
    try {
      const response = await api.request<{ status?: number; data?: any; error?: string }>('/payments/release', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: request.id
        })
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to release payment. Please try again.');
      }

      await api.request('/messages', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: currentRequest.id,
          sender_email: 'system',
          content: `Payment released! This rental has been completed.`,
          message_type: "status_update",
          is_read: false
        })
      });

      await loadAndReadMessages(false);
      onUpdateRequest?.();
      setCurrentRequest(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error("Error releasing payment:", error);
      const errorObj = error as any;
      const errorMessage = errorObj.response?.data?.error || (error instanceof Error ? error.message : String(error)) || "An unknown error occurred. Please try again or contact support.";
      setReleaseError(errorMessage);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReviewImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setIsUploadingReviewImage(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await api.uploadFile(file);
        return result.file_url;
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
    try {
      const isOwner = currentUser.email === currentRequest.owner_email;
      const reviewType = isOwner ? 'for_renter' : 'for_owner';
      const revieweeEmail = isOwner ? currentRequest.renter_email : currentRequest.owner_email;

      await api.request('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: currentRequest.id,
          reviewer_email: currentUser.email,
          reviewee_email: revieweeEmail,
          rating: reviewData.rating,
          comment: reviewData.comment,
          images: reviewData.images,
          review_type: reviewType
        })
      });
      
      await loadReviews();
      setShowReviewDialog(false);
      setReviewData({ rating: 0, comment: '', images: [] });
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteChat = async () => {
    setIsDeletingChat(true);
    try {
      // Delete all messages for this rental request
      const messagesResponse = await api.request<Message[]>(`/messages?rental_request_id=${currentRequest.id}`);
      const allMessages = messagesResponse.success && messagesResponse.data ? messagesResponse.data : [];
      for (const msg of allMessages) {
        await api.request(`/messages/${msg.id}`, {
          method: 'DELETE'
        });
      }

      // Mark rental request as archived (optional - keeps the record but hides it)
      await api.request(`/rental-requests/${currentRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' })
      });

      // Redirect back
      onBack?.();
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete conversation. Please try again.");
    } finally {
      setIsDeletingChat(false);
      setShowDeleteConfirm(false);
    }
  };

  const checkPaymentStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await api.request<{ success: boolean; status?: string; payment_intent_id?: string }>(`/payments/status?session_id=${sessionId}&rental_request_id=${request.id}`, {
        method: 'GET'
      });

      if (response.success && response.data && response.data.success) {
        await loadAndReadMessages(false);
        refreshRequestStatus();
        onUpdateRequest?.();
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  }, [request.id, loadAndReadMessages, refreshRequestStatus, onUpdateRequest]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    const cancelled = urlParams.get('cancelled');
    
    if (success === 'true' && sessionId) {
      checkPaymentStatus(sessionId);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('success');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (cancelled === 'true') {
      console.log('Payment cancelled by user');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('cancelled');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [checkPaymentStatus]);

  const otherUserEmail = currentUser.email === currentRequest.renter_email 
    ? currentRequest.owner_email 
    : currentRequest.renter_email;
  
  const isOwner = currentUser.email === currentRequest.owner_email;
  const isRenter = currentUser.email === currentRequest.renter_email;
  const canApproveDecline = isOwner && currentRequest.status === 'pending';
  const canPay = isRenter && currentRequest.status === 'approved';
  const canCompleteRental = isOwner && currentRequest.status === 'paid'; 

  const rentalCost = currentRequest.total_amount || 0;
  const renterPlatformFee =
    typeof currentRequest.platform_fee === 'number'
      ? currentRequest.platform_fee
      : rentalCost * 0.15;
  const securityDeposit =
    typeof currentRequest.security_deposit === 'number'
      ? currentRequest.security_deposit
      : (item?.deposit || 0);
  const totalPayment =
    typeof currentRequest.total_paid === 'number'
      ? currentRequest.total_paid
      : rentalCost + renterPlatformFee + securityDeposit;

  const hasUserReviewed = reviews.some(review => review.reviewer_email === currentUser.email);
  const canLeaveReview = currentRequest.status === 'completed' && !hasUserReviewed;
  
  const canFileDispute = currentRequest.status === 'paid' || currentRequest.status === 'completed';

  // Extension request check - only show 24 hours before rental end date
  const endDate = currentRequest.end_date ? new Date(currentRequest.end_date) : null;
  const hoursUntilEnd = endDate ? (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60) : null;
  const canRequestExtension = isRenter && currentRequest.status === 'paid' && hoursUntilEnd !== null && hoursUntilEnd <= 24 && hoursUntilEnd > 0;

  const pickupReports = conditionReports.filter(r => r.report_type === 'pickup');
  const returnReports = conditionReports.filter(r => r.report_type === 'return');
  
  const userPickupReport = pickupReports.find(r => r.reported_by_email === currentUser.email);
  const userReturnReport = returnReports.find(r => r.reported_by_email === currentUser.email);
  
  // Pickup reports timing: From start_date - 2 hours to start_date + 2 hours
  // This allows reports to be submitted slightly before pickup (when meeting) and shortly after
  const PICKUP_REPORT_START_HOURS_BEFORE = 2; // Can submit 2 hours before start date
  const PICKUP_REPORT_END_HOURS_AFTER = 2; // Can submit up to 2 hours after start date
  const rentalStartDate = currentRequest.start_date ? new Date(currentRequest.start_date) : null;
  const now = new Date();
  
  let isPickupTime = false;
  let hoursUntilStart = null;
  let hoursSinceStart = null;
  let isPickupWindowOpen = false;
  let isPickupWindowPassed = false;
  
  if (rentalStartDate) {
    // Calculate hours before/after start date
    const hoursDiff = (now.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60);
    hoursSinceStart = hoursDiff;
    hoursUntilStart = -hoursDiff; // Negative means before start date
    
    // Pickup window: from 2 hours before to 2 hours after start date
    isPickupWindowOpen = hoursDiff >= -PICKUP_REPORT_START_HOURS_BEFORE && 
                        hoursDiff <= PICKUP_REPORT_END_HOURS_AFTER;
    isPickupWindowPassed = hoursDiff > PICKUP_REPORT_END_HOURS_AFTER;
    isPickupTime = isPickupWindowOpen || isPickupWindowPassed; // For UI display
  }
  
  // Pickup reports can only be submitted within the window:
  // - From 2 hours before rental start date
  // - Until 2 hours after rental start date
  const needsPickupReport = currentRequest.status === 'paid' && 
                           isPickupWindowOpen &&
                           !userPickupReport;
  
  // Return reports timing: Can be submitted until end_date + 3 hours
  const RETURN_REPORT_DEADLINE_HOURS_AFTER = 3; // Can submit up to 3 hours after end date
  let isReturnWindowOpen = false;
  let isReturnDeadlinePassed = false;
  let hoursSinceEnd = null;
  
  if (endDate) {
    hoursSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60);
    // Return reports can be submitted from when rental ends until 3 hours after
    isReturnWindowOpen = hoursSinceEnd >= 0 && hoursSinceEnd <= RETURN_REPORT_DEADLINE_HOURS_AFTER;
    isReturnDeadlinePassed = hoursSinceEnd > RETURN_REPORT_DEADLINE_HOURS_AFTER;
  }
  
  const needsReturnReport = currentRequest.status === 'paid' && 
                           pickupReports.length === 2 && 
                           isReturnWindowOpen &&
                           !userReturnReport;

  // Check if it's time for return
  // Both pickup reports must be submitted before return reports
  const isTimeForReturn = currentRequest.status === 'paid' && 
                         pickupReports.length === 2 && 
                         returnReports.length === 0;

  // Condition reports required for completion:
  // 1. Both pickup reports (one from renter, one from owner) - document item condition before rental
  // 2. Both return reports (one from renter, one from owner) - document item condition after rental
  const hasAllPickupReports = pickupReports.length === 2;
  const hasAllReturnReports = returnReports.length === 2;
  
  // Check if rental end date has passed (rental duration is finished)
  const rentalEndDate = currentRequest.end_date ? new Date(currentRequest.end_date) : null;
  const isRentalFinished = rentalEndDate ? new Date() >= rentalEndDate : false;
  
  // Release button appears when:
  // - User is owner
  // - Status is 'paid'
  // - Rental end date has passed (rental duration is finished)
  // - Both pickup reports submitted (2 total)
  // - Both return reports submitted (2 total)
  const canReleasePayment = canCompleteRental && 
                           isRentalFinished && 
                           hasAllPickupReports && 
                           hasAllReturnReports;

  const canDeleteChat = (currentRequest.status === 'completed' || currentRequest.status === 'archived') && 
    differenceInDays(new Date(), parseISO(currentRequest.updated_date)) >= 30;

  const itemImage = item?.images?.[0] || item?.videos?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Upwork-style Clean Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-gray-100 text-gray-600 rounded-full h-9 w-9 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {otherUser?.username ? (
                <Link href={`/public-profile?username=${otherUser.username}`} className="flex-shrink-0">
                  <div className="rounded-full w-10 h-10 flex items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-100">
                    {otherUser?.profile_picture ? (
                      <img src={otherUser.profile_picture} alt={otherUser.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="text-gray-400 w-5 h-5" />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="rounded-full w-10 h-10 flex items-center justify-center overflow-hidden border-2 border-gray-200 bg-gray-100 flex-shrink-0">
                  {otherUser?.profile_picture ? (
                    <img src={otherUser.profile_picture} alt={otherUser.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="text-gray-400 w-5 h-5" />
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {otherUser?.username ? (
                  <Link 
                    href={`/public-profile?username=${otherUser.username}`} 
                    className="text-gray-900 hover:text-blue-600 font-semibold truncate block text-sm"
                  >
                    {otherUser?.full_name || `@${otherUser.username}`}
                  </Link>
                ) : (
                  <h3 className="text-gray-900 font-semibold truncate text-sm">
                    {otherUser?.full_name || "Loading..."}
                  </h3>
                )}
                <p className="text-gray-500 text-xs truncate">
                  {item?.title || "Rental Request"}
                </p>
              </div>

              <Badge 
                className={`${statusColors[currentRequest.status as keyof typeof statusColors]} border shadow-sm flex-shrink-0 text-xs px-2 py-1 font-medium`}
              >
                {currentRequest.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Deadline Alert */}
      {currentRequest.status === 'approved' && currentUser.email === currentRequest.renter_email && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <PaymentDeadline request={currentRequest as RentalRequest & {updated_date: string}} />
        </div>
      )}

      {/* Messages Area - Upwork-style clean background */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-3"
        style={{ minHeight: 0 }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div ref={messagesTopRef} />
            {/* Messages - Reversed so newest are at top */}
            {[...messages].reverse().map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.sender_email === currentUser.email}
              />
            ))}

            {/* Typing Indicator */}
            {otherUserTyping && (
              <TypingIndicator userName={otherUser?.full_name || otherUser?.username} />
            )}

            {/* Show action cards if no forms are open */}
            {!showConditionForm && !showDisputeForm && !showExtensionForm && currentRequest.status === 'paid' && (
              <>
                {/* Pickup Report Prompt Card - Only shown on or after rental start date */}
                {needsPickupReport && (
                  <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Camera className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Action Required</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {isRenter 
                            ? "Before taking the item, document its condition with photos" 
                            : "Before handing over the item, document its condition with photos"}
                        </p>
                        <Button
                          onClick={() => setShowConditionForm('pickup')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 px-4"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Create Pickup Report
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Info message if pickup window hasn't opened yet */}
                {currentRequest.status === 'paid' && 
                 !isPickupWindowOpen && 
                 !isPickupWindowPassed &&
                 !userPickupReport && 
                 rentalStartDate && 
                 hoursUntilStart !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Pickup Report Available Soon</h4>
                        <p className="text-sm text-gray-600">
                          Pickup reports can be submitted from 2 hours before to 2 hours after the rental start date ({format(rentalStartDate, 'MMMM d, yyyy')}).
                          {hoursUntilStart > PICKUP_REPORT_START_HOURS_BEFORE && ` Opens in ${Math.ceil(hoursUntilStart - PICKUP_REPORT_START_HOURS_BEFORE)} hours.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Warning message if pickup window is open or passed */}
                {currentRequest.status === 'paid' && 
                 (isPickupWindowOpen || isPickupWindowPassed) && 
                 !userPickupReport && 
                 rentalStartDate && 
                 hoursSinceStart !== null && (
                  <div className={`border rounded-lg p-4 shadow-sm ${
                    isPickupWindowPassed 
                      ? 'bg-red-50 border-red-200' 
                      : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPickupWindowPassed 
                          ? 'bg-red-100' 
                          : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                      }`}>
                        <AlertCircle className={`w-5 h-5 ${
                          isPickupWindowPassed 
                            ? 'text-red-600' 
                            : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm mb-1 ${
                          isPickupWindowPassed 
                            ? 'text-red-900' 
                            : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                            ? 'text-amber-900'
                            : 'text-gray-900'
                        }`}>
                          {isPickupWindowPassed 
                            ? 'Pickup Report Window Closed' 
                            : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                            ? 'Pickup Report Window Closing Soon'
                            : 'Submit Pickup Report'}
                        </h4>
                        <p className={`text-sm ${
                          isPickupWindowPassed 
                            ? 'text-red-700' 
                            : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                            ? 'text-amber-700'
                            : 'text-gray-600'
                        }`}>
                          {isPickupWindowPassed 
                            ? `The pickup report window has closed (2 hours after rental start). Please contact support.`
                            : hoursSinceStart > PICKUP_REPORT_END_HOURS_AFTER - 0.5
                            ? `⚠️ Window closing soon! Only ${Math.max(0, Math.ceil((PICKUP_REPORT_END_HOURS_AFTER - hoursSinceStart) * 60))} minutes remaining.`
                            : hoursSinceStart < 0
                            ? `Window opens in ${Math.ceil(-hoursSinceStart - PICKUP_REPORT_START_HOURS_BEFORE)} hours.`
                            : `Window closes in ${Math.max(0, Math.ceil((PICKUP_REPORT_END_HOURS_AFTER - hoursSinceStart) * 60))} minutes.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show Pickup Reports */}
                {pickupReports.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-2 border border-blue-200">
                        <CheckCircle2 className="w-4 h-4" />
                        Pre-Rental Reports ({pickupReports.length}/2)
                      </span>
                    </div>
                    {pickupReports.map(report => (
                      <ConditionReportDisplay key={report.id} report={report as ConditionReport & {created_date: string, reported_by_email:string}} />
                    ))}
                  </div>
                )}

                {/* Return Report Prompt Card - Only when rental has ended and within 3 hours */}
                {needsReturnReport && (
                  <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Camera className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Return Inspection Required</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Document the item's condition upon return. This protects both parties.
                          {hoursSinceEnd !== null && hoursSinceEnd >= 0 && (
                            <span className="block mt-1 text-xs text-purple-600">
                              {hoursSinceEnd <= RETURN_REPORT_DEADLINE_HOURS_AFTER 
                                ? `You have ${Math.max(0, Math.ceil(RETURN_REPORT_DEADLINE_HOURS_AFTER - hoursSinceEnd))} hours remaining.`
                                : 'Deadline passed.'}
                            </span>
                          )}
                        </p>
                        <Button
                          onClick={() => setShowConditionForm('return')}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-9 px-4"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Create Return Report
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Info message if return window hasn't opened yet (before end date) */}
                {currentRequest.status === 'paid' && 
                 pickupReports.length === 2 && 
                 !userReturnReport && 
                 endDate && 
                 hoursSinceEnd !== null && 
                 hoursSinceEnd < 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Return Report Available After Rental Ends</h4>
                        <p className="text-sm text-gray-600">
                          Return reports can be submitted after the rental end date ({format(endDate, 'MMMM d, yyyy')}). You'll have 3 hours to submit after the end date.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Warning if return report deadline passed */}
                {currentRequest.status === 'paid' && 
                 isReturnDeadlinePassed && 
                 !userReturnReport && 
                 endDate && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-red-900 text-sm mb-1">Return Report Deadline Passed</h4>
                        <p className="text-sm text-red-700">
                          The deadline to submit return reports has passed (3 hours after rental end). Please contact support.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show Return Reports */}
                {returnReports.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-2 border border-purple-200">
                        <CheckCircle2 className="w-4 h-4" />
                        Return Reports ({returnReports.length}/2)
                      </span>
                    </div>
                    {returnReports.map(report => (
                      <ConditionReportDisplay key={report.id} report={report as ConditionReport & {created_date: string, reported_by_email: string}} />
                    ))}
                  </div>
                )}
                
                {/* Extension Requests Display */}
                {extensionRequests.length > 0 && (
                  <div className="space-y-2">
                    {extensionRequests.map(extension => (
                      <ExtensionRequestDisplay
                        key={extension.id}
                        extension={extension as Extension & {new_end_date: string, additional_cost: number}}
                        rentalRequest={currentRequest as RentalRequest & {end_date: string}}
                        item={item}
                        currentUser={currentUser}
                        onUpdate={() => {
                          loadExtensionRequests();
                          loadAndReadMessages(false);
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Extension Request Card */}
                {canRequestExtension && (
                  <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Need More Time?</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Request an extension for your rental period from the owner.
                        </p>
                        <Button
                          onClick={() => setShowExtensionForm(true)}
                          size="sm"
                          variant="outline"
                          className="border-amber-400 text-amber-700 hover:bg-amber-50 hover:border-amber-500 text-sm h-9 px-4"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Request Extension
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Release Payment Card */}
                {canReleasePayment && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Ready to Complete</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Rental period has ended and all condition reports have been submitted. You can now release the payment to complete this rental.
                        </p>
                        {releaseError && (
                          <Alert variant="destructive" className="mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">{releaseError}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          onClick={handleReleasePayment}
                          disabled={isUpdatingStatus}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-sm h-9 px-4"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {isUpdatingStatus ? 'Processing...' : `Release $${rentalCost.toFixed(2)}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Condition Report Form */}
            {showConditionForm && (
              <div className="bg-white border-2 border-slate-200 rounded-lg p-3 shadow-lg">
                <ConditionReportForm
                  rentalRequest={currentRequest}
                  reportType={showConditionForm}
                  currentUser={currentUser}
                  onComplete={() => {
                    setShowConditionForm(null);
                    loadConditionReports();
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowConditionForm(null)}
                  className="w-full mt-2 text-xs h-8"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Dispute Form */}
            {showDisputeForm && (
              <div className="bg-white border-2 border-orange-200 rounded-lg p-3 shadow-lg">
                <DisputeForm 
                  rentalRequest={currentRequest} 
                  onSuccess={() => {
                    setShowDisputeForm(false);
                    alert("Dispute filed successfully. Our team will review it shortly.");
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowDisputeForm(false)}
                  className="w-full mt-2 text-xs h-8"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Extension Request Form */}
            {showExtensionForm && (
              <div className="bg-white border-2 border-slate-200 rounded-lg p-3 shadow-lg">
                <ExtensionRequest
                  rentalRequest={currentRequest as RentalRequest & {end_date: string}}
                  item={item as Item & {daily_rate: number, titile?: string}}
                  onSuccess={() => {
                    setShowExtensionForm(false);
                    loadAndReadMessages(false);
                    loadExtensionRequests();
                    alert("Extension request sent! The owner will review it shortly.");
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowExtensionForm(false)}
                  className="w-full mt-2 text-xs h-8"
                >
                  Cancel
                </Button>
              </div>
            )}

            {messages.length === 0 && !isLoading && conditionReports.length === 0 && extensionRequests.length === 0 && !showConditionForm && !showDisputeForm && !showExtensionForm && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-200">
                  <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-700 font-semibold text-base">Start the conversation</p>
                <p className="text-gray-500 text-sm mt-1">Send a message to get started</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Bottom Actions - Upwork-style */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        {/* Delete Chat Option */}
        {canDeleteChat && !showDeleteConfirm && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 h-10 text-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Delete Conversation
            </Button>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="mb-3">
              <p className="text-sm font-semibold text-red-900 mb-1">Delete this conversation?</p>
              <p className="text-xs text-red-700">This will permanently delete all messages. This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border-gray-300 text-sm h-10"
                disabled={isDeletingChat}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteChat}
                disabled={isDeletingChat}
                className="flex-1 bg-red-600 hover:bg-red-700 text-sm h-10"
              >
                {isDeletingChat ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}

        {/* Approve/Decline Buttons */}
        {canApproveDecline && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isUpdatingStatus}
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 h-10 text-sm font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isUpdatingStatus}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 text-sm font-medium"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        )}

        {/* Payment Button */}
        {canPay && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <Button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-white font-semibold shadow-sm text-sm mb-2"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isProcessingPayment ? 'Processing...' : `Pay $${totalPayment.toFixed(2)}`}
            </Button>
            <p className="text-xs text-gray-600 text-center">
              ${rentalCost.toFixed(2)} rental + ${renterPlatformFee.toFixed(2)} fee + ${securityDeposit.toFixed(2)} deposit
            </p>
          </div>
        )}

        {/* Review & Dispute Actions */}
        {canLeaveReview && (
          <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-2">
            <Button
              onClick={() => setShowReviewDialog(true)}
              variant="outline"
              className="w-full border-yellow-400 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-500 h-10 font-medium text-sm"
            >
              <Star className="w-4 h-4 mr-2" />
              Leave a Review
            </Button>
            {!showDisputeForm && (
              <Button
                onClick={() => setShowDisputeForm(true)}
                variant="outline"
                className="w-full border-orange-400 text-orange-700 hover:bg-orange-50 hover:border-orange-500 h-10 text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                File a Dispute
              </Button>
            )}
          </div>
        )}

        {!canLeaveReview && canFileDispute && !showDisputeForm && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <Button
              onClick={() => setShowDisputeForm(true)}
              variant="outline"
              className="w-full border-orange-400 text-orange-700 hover:bg-orange-50 hover:border-orange-500 h-10 text-sm"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              File a Dispute
            </Button>
          </div>
        )}

        {/* Message Input - Upwork-style clean design */}
        <div className="p-4 bg-white">
          <form onSubmit={sendMessage} className="flex gap-2 items-end">
            <ChatAttachments 
              onAttach={handleAttachmentSend}
              disabled={isSending || !!showConditionForm || showDisputeForm || showExtensionForm}
            />
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  setIsTyping(true);
                  updateTypingStatus(true);
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                    updateTypingStatus(false);
                  }, 3000);
                }}
                placeholder="Type a message..."
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg h-11 text-sm pr-12 bg-gray-50 focus:bg-white transition-colors"
                disabled={isSending || !!showConditionForm || showDisputeForm || showExtensionForm}
              />
            </div>
            <Button
              type="submit"
              disabled={isSending || !newMessage.trim() || !!showConditionForm || showDisputeForm || showExtensionForm}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700 rounded-lg h-11 w-11 flex-shrink-0 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </form>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
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
              onClick={() => {
                setShowReviewDialog(false);
                setReviewData({ rating: 0, comment: '', images: [] });
              }}
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
    </div>
  );
}