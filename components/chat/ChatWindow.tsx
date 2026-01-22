'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, uploadFile, sendEmail, getCurrentUser, type UserData } from '@/lib/api-client';
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
import DisputeForm from '../disputes/DisputeForm';
import ConditionReportForm from './ConditionReportForm';
import ConditionReportDisplay from './ConditionReportDisplay';
import PaymentDeadline from './PaymentDeadline';
import ExtensionRequest from '../rental/ExtensionRequest';
import ExtensionRequestDisplay from '../rental/ExtensionRequestDisplay';
// sendEmail already imported from api-client

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
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

  // Check if user is actively using forms - if so, pause auto-refresh
  const isFormActive = showConditionForm || showDisputeForm || showExtensionForm || isTyping;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldScrollToBottom(isNearBottom);
    }
  };
  
  const fetchOtherUser = useCallback(async () => {
    const otherEmail = currentUser.email === request.renter_email 
      ? request.owner_email 
      : request.renter_email;
    
    try {
      // TODO: Implement getUserForChat endpoint in backend
      const response = await api.request<UserData>(`/users?email=${otherEmail}`);
      
      if (response.success && response.data) {
        setOtherUser(response.data);
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
      const requestsResponse = await api.request<RentalRequest[]>('/rental-requests');
      const allRequests = requestsResponse.success && requestsResponse.data ? requestsResponse.data : [];
      const updatedRequest = allRequests.find(r => r.id === request.id);
      
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
    const initialLoad = async () => {
        setIsLoading(true);
        
        // Step 1: Load user
        await fetchOtherUser();
        await delay(1500); // Increased from 1000ms to 1500ms
        
        // Step 2: Load messages (most important)
        await loadAndReadMessages(true);
        await delay(1500); // Increased from 1000ms to 1500ms
        
        setIsLoading(false);

        // Step 3: Load everything else in background with increased delays
        await loadReviews();
        await delay(2000); // Increased from 1000ms to 2000ms
        
        await loadConditionReports();
        await delay(2000); // Increased from 1000ms to 2000ms
        
        await loadExtensionRequests();
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
        await loadAndReadMessages(false);
        await delay(3000); // Increased delay between calls
        await refreshRequestStatus();
        await delay(3000);
        await loadReviews();
        await delay(3000);
        await loadConditionReports();
        await delay(3000);
        await loadExtensionRequests();
        console.log("✅ Auto-refresh complete");
      }
    }, 300000); // Changed from 120000 (2 min) to 300000 (5 min)

    // Typing indicator check - every 3 seconds
    const typingInterval = setInterval(() => {
      checkTypingStatus();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(typingInterval);
    };
  }, [loadAndReadMessages, fetchOtherUser, loadReviews, loadConditionReports, loadExtensionRequests, refreshRequestStatus, isRateLimited, isFormActive, checkTypingStatus]);

  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom, conditionReports, extensionRequests]);

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
            link: '/Requests'
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
      
      if (item && currentRequest.start_date && currentRequest.end_date) {
        await api.request('/item-availability', {
          method: 'POST',
          body: JSON.stringify({
            item_id: item.id,
            blocked_start_date: currentRequest.start_date,
            blocked_end_date: currentRequest.end_date,
            reason: 'rented',
            rental_request_id: currentRequest.id,
          })
        });
      }

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

      try {
        const startDate = new Date(currentRequest.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const endDate = new Date(currentRequest.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        
        await sendEmail({
          to: currentRequest.renter_email,
          subject: '✅ Your Rental Request Has Been Approved!',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Rentable</h1>
                <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px;">Rent Anything, From Anyone</p>
              </div>
              
              <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="margin: 0 0 20px 0; color: #10b981; font-size: 24px; font-weight: 600;">🎉 Request Approved!</h2>
                
                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                  Great news! Your rental request has been approved by the owner.
                </p>
                
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 600;">📦 Rental Details</h3>
                  <p style="margin: 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                    <strong style="color: #1e293b;">Item:</strong> ${item?.title || 'Your Rental'}
                  </p>
                  <p style="margin: 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                    <strong style="color: #1e293b;">Dates:</strong> ${startDate} - ${endDate}
                  </p>
                  <p style="margin: 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                    <strong style="color: #1e293b;">Total Amount:</strong> $${currentRequest.total_amount.toFixed(2)}
                  </p>
                </div>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 600;">⏰ Important: Payment Deadline</h3>
                  <p style="margin: 8px 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                    You have <strong>24 hours</strong> to complete the payment, or your request will be automatically cancelled and the dates will become available again.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/Requests" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Complete Payment Now
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
                  Have questions? Contact the owner through the app chat.
                </p>
              </div>
              
              <div style="background-color: #f1f5f9; padding: 20px; text-align: center; margin-top: 20px; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">Thank you for using Rentable!</p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          `,
          from_name: "Rentable"
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

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
      console.log('📍 Return URL:', window.location.origin + '/Requests');
      
      const response = await api.request<{ url?: string; checkout_url?: string }>('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: request.id,
          return_url: typeof window !== 'undefined' ? window.location.origin + '/Requests' : ''
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
        const result = await uploadFile(file);
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

  const renterPlatformFee = currentRequest.total_amount * 0.15;
  const totalPayment = currentRequest.total_amount + (item?.deposit || 0) + renterPlatformFee;

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
  
  const needsPickupReport = currentRequest.status === 'paid' && !userPickupReport;
  const needsReturnReport = currentRequest.status === 'paid' && 
                           pickupReports.length === 2 && 
                           !userReturnReport;

  // Check if it's time for return
  // Both pickup reports must be submitted before return reports
  const isTimeForReturn = currentRequest.status === 'paid' && 
                         pickupReports.length === 2 && 
                         returnReports.length === 0;

  const hasAllReturnReports = returnReports.length === 2;
  const canReleasePayment = canCompleteRental && hasAllReturnReports;

  const canDeleteChat = (currentRequest.status === 'completed' || currentRequest.status === 'archived') && 
    differenceInDays(new Date(), parseISO(currentRequest.updated_date)) >= 30;

  const itemImage = item?.images?.[0] || item?.videos?.[0] || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Ultra Compact Mobile Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0 border-b border-slate-700">
        {/* Top Row: Back + User Info + Status */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hover:bg-white/10 text-white rounded-lg h-8 w-8 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {otherUser?.username ? (
              <Link href={`/public-profile?username=${otherUser.username}`} className="flex-shrink-0">
                <div className="bg-white/10 rounded-full w-7 h-7 flex items-center justify-center overflow-hidden border border-white/20">
                  {otherUser?.profile_picture ? (
                    <img src={otherUser.profile_picture} alt={otherUser.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="text-white w-3.5 h-3.5" />
                  )}
                </div>
              </Link>
            ) : (
              <div className="bg-white/10 rounded-full w-7 h-7 flex items-center justify-center overflow-hidden border border-white/20 flex-shrink-0">
                {otherUser?.profile_picture ? (
                  <img src={otherUser.profile_picture} alt={otherUser.full_name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-white w-3.5 h-3.5" />
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {otherUser?.username ? (
                <Link 
                  href={`/public-profile?username=${otherUser.username}`} 
                  className="text-white hover:underline font-semibold truncate block text-xs"
                >
                  @{otherUser.username}
                </Link>
              ) : (
                <h3 className="text-white font-semibold truncate text-xs">
                  {otherUser?.full_name || "Loading..."}
                </h3>
              )}
            </div>

            <Badge 
              className={`${statusColors[currentRequest.status as keyof typeof statusColors]} border shadow-sm flex-shrink-0 text-[9px] px-1.5 py-0.5`}
            >
              {currentRequest.status}
            </Badge>
          </div>
        </div>

        {/* Bottom Row: Item Info (Compact) */}
        <div className="px-3 pb-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 flex items-center gap-2">
            <img 
              src={itemImage} 
              alt={item?.title}
              className="rounded w-8 h-8 object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white/90 font-medium truncate text-[11px]">{item?.title}</p>
              <p className="text-white/60 text-[9px]">
                {format(new Date(currentRequest.start_date), "MMM d")} - {format(new Date(currentRequest.end_date), "MMM d")}
              </p>
            </div>
            <span className="text-white/90 font-bold text-xs flex-shrink-0">
              ${currentRequest.total_amount.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Deadline Alert */}
      {currentRequest.status === 'approved' && currentUser.email === currentRequest.renter_email && (
        <div className="p-2 bg-orange-50 border-b border-orange-100 flex-shrink-0">
          <PaymentDeadline request={currentRequest as RentalRequest & {updated_date: string}} />
        </div>
      )}

      {/* Messages Area - Scrollable with better spacing */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-3 bg-gradient-to-b from-slate-50 to-white space-y-2"
        style={{ minHeight: 0 }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Messages */}
            {messages.map((message) => (
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
                {/* Pickup Report Prompt Card */}
                {needsPickupReport && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-blue-900 text-sm mb-1">📸 Action Required</h4>
                        <p className="text-xs text-blue-800 mb-2">
                          {isRenter 
                            ? "Before taking the item, document its condition with photos" 
                            : "Before handing over the item, document its condition with photos"}
                        </p>
                        <Button
                          onClick={() => setShowConditionForm('pickup')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 w-full text-xs h-8"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          Create Pickup Report
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show Pickup Reports */}
                {pickupReports.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-center">
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Pre-Rental Reports ({pickupReports.length}/2)
                      </span>
                    </div>
                    {pickupReports.map(report => (
                      <ConditionReportDisplay key={report.id} report={report as ConditionReport & {created_date: string, reported_by_email:string}} />
                    ))}
                  </div>
                )}

                {/* Prompt to submit return reports */}
                  {isTimeForReturn && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-purple-900 text-sm mb-1">🔄 Ready to Return?</h4>
                          <p className="text-xs text-purple-800 mb-2">
                            {isRenter 
                              ? "When returning the item, document its condition with photos."
                              : "When receiving the item back, document its condition with photos."}
                          </p>
                          <Button
                            onClick={() => setShowConditionForm('return')}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 w-full text-xs h-8"
                          >
                            <Camera className="w-3 h-3 mr-1" />
                            Create Return Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Return Report Prompt Card */}
                {needsReturnReport && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-purple-900 text-sm mb-1">📸 Return Inspection Required</h4>
                        <p className="text-xs text-purple-800 mb-2">
                          Document the item's condition upon return. This protects both parties.
                        </p>
                        <Button
                          onClick={() => setShowConditionForm('return')}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 w-full text-xs h-8"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          Create Return Report
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show Return Reports */}
                {returnReports.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-center">
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
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
                  <div className="bg-lime-50 border-2 border-lime-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lime-900 text-sm mb-1">⏰ Need More Time?</h4>
                        <p className="text-xs text-lime-800 mb-2">
                          Request an extension for your rental period from the owner.
                        </p>
                        <Button
                          onClick={() => setShowExtensionForm(true)}
                          size="sm"
                          variant="outline"
                          className="w-full border-lime-300 text-lime-700 hover:bg-lime-50 text-xs h-8"
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Request Extension
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Release Payment Card */}
                {canReleasePayment && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-green-900 text-sm mb-1">✅ Ready to Complete</h4>
                        <p className="text-xs text-green-800 mb-2">
                          All reports submitted! You can now release the payment to complete this rental.
                        </p>
                        {releaseError && (
                          <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-3 w-3" />
                            <AlertDescription className="text-[10px]">{releaseError}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          onClick={handleReleasePayment}
                          disabled={isUpdatingStatus}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 w-full text-xs h-8"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {isUpdatingStatus ? 'Processing...' : `Release $${currentRequest.total_amount.toFixed(2)}`}
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
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Start the conversation!</p>
                <p className="text-slate-400 text-xs mt-1">Send a message to get started</p>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Bottom Actions - Simplified */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white">
        {/* Delete Chat Option */}
        {canDeleteChat && !showDeleteConfirm && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50 h-9 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Delete Conversation
            </Button>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-3 bg-red-50 border-b border-red-200">
            <div className="mb-2">
              <p className="text-xs font-semibold text-red-900 mb-1">Delete this conversation?</p>
              <p className="text-[10px] text-red-700">This will permanently delete all messages. This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border-slate-300 text-xs h-8"
                disabled={isDeletingChat}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteChat}
                disabled={isDeletingChat}
                className="flex-1 bg-red-600 hover:bg-red-700 text-xs h-8"
              >
                {isDeletingChat ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}

        {/* Approve/Decline Buttons */}
        {canApproveDecline && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isUpdatingStatus}
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50 h-9 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Decline
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isUpdatingStatus}
                className="flex-1 bg-green-600 hover:bg-green-700 h-9 text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        )}

        {/* Payment Button */}
        {canPay && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <Button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-10 text-white font-semibold shadow-lg text-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isProcessingPayment ? 'Processing...' : `Pay $${totalPayment.toFixed(2)}`}
            </Button>
            <p className="text-[10px] text-slate-600 mt-1 text-center">
              ${currentRequest.total_amount.toFixed(2)} rental + ${renterPlatformFee.toFixed(2)} fee + ${(item?.deposit || 0).toFixed(2)} deposit
            </p>
          </div>
        )}

        {/* Review & Dispute Actions */}
        {canLeaveReview && (
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
            <Button
              onClick={() => setShowReviewDialog(true)}
              variant="outline"
              className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 h-9 font-semibold text-xs"
            >
              <Star className="w-3 h-3 mr-1" />
              Leave a Review
            </Button>
            {!showDisputeForm && (
              <Button
                onClick={() => setShowDisputeForm(true)}
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 h-9 text-xs"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                File a Dispute
              </Button>
            )}
          </div>
        )}

        {!canLeaveReview && canFileDispute && !showDisputeForm && (
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <Button
              onClick={() => setShowDisputeForm(true)}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 h-9 text-xs"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              File a Dispute
            </Button>
          </div>
        )}

        {/* Message Input - More compact */}
        <div className="p-2">
          <form onSubmit={sendMessage} className="flex gap-1.5 items-center">
            <ChatAttachments 
              onAttach={handleAttachmentSend}
              disabled={isSending || !!showConditionForm || showDisputeForm || showExtensionForm}
            />
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
              placeholder="Type message..."
              className="flex-1 border-slate-300 focus:border-slate-500 rounded-lg h-9 text-sm"
              disabled={isSending || !!showConditionForm || showDisputeForm || showExtensionForm}
            />
            <Button
              type="submit"
              disabled={isSending || !newMessage.trim() || !!showConditionForm || showDisputeForm || showExtensionForm}
              size="icon"
              className="bg-slate-900 hover:bg-slate-800 rounded-lg h-9 w-9 flex-shrink-0 shadow-lg"
            >
              <Send className="w-4 h-4" />
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