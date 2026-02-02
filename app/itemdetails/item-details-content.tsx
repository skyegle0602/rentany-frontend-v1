'use client'

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Shield,
  User as UserIcon,
  ArrowLeft,
  MessageSquare,
  Clock,
  Play,
  Trash2,
  EyeOff,
  Eye,
  AlertCircle,
  AlertTriangle,
  Settings,
  Edit,
  Calendar as CalendarIcon,
  TrendingUp,
  Send
} from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPageUrl } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { api, getCurrentUser, redirectToSignIn, createItemAvailability, sendEmail, createViewedItem } from '@/lib/api-client';
import ShareButtons from '@/components/items/ShareButtons';
import SimilarItems from '@/components/items/SimilarItems';
import AvailabilityCalendar from '@/components/calendar/AvailabilityCalendar';
import { createEmailTemplate, createInfoBox } from '@/components/emails/EmailTemplate';
import VerificationPrompt, { type VerificationUser } from '@/components/verification/VerificationPrompt';
import ReportDialog from '@/components/reports/ReportsDialog';
import AIChatAssistant from '@/components/chat/AIChatAssistant';
import BookingSuccessDialog from '@/components/booking/BookingSuccessDialog';
import ImageZoomModal from '@/components/media/ImageZoomModal';
import { useLanguage } from '@/components/language/LanguageContext';

// Type definitions
interface PricingTier {
  days: number;
  price: number;
}

interface ItemType {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition?: string;
  location?: string;
  daily_rate: number;
  deposit?: number;
  availability: boolean;
  instant_booking?: boolean;
  images?: string[];
  videos?: string[];
  pricing_tiers?: PricingTier[];
  min_rental_days?: number;
  max_rental_days?: number;
  delivery_options?: string[];
  delivery_fee?: number;
  delivery_radius?: number;
  created_by?: string;
  [key: string]: any;
}

interface OwnerType {
  username?: string;
  full_name?: string;
  profile_picture?: string;
  email?: string;
}

interface UserType {
  email: string;
  full_name?: string;
  username?: string;
  role?: string;
  verification_status?: string;
  [key: string]: any;
}

interface RentalFormType {
  start_date: string;
  end_date: string;
  selected_dates?: string[]; // For individual date selection
  message: string;
}

interface RentalCostsType {
  rentalCost: number;
  platformFee: number;
  totalCost: number;
}

interface SuccessDialogDataType {
  isInstantBooking: boolean;
  itemTitle: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
}

interface DateChangeType {
  start_date?: string;
  end_date?: string;
  selected_dates?: string[]; // For individual date selection
}

const categoryColors: Record<string, string> = {
  electronics: "bg-blue-100 text-blue-800 border-blue-200",
  tools: "bg-orange-100 text-orange-800 border-orange-200",
  fashion: "bg-pink-100 text-pink-800 border-pink-200",
  sports: "bg-green-100 text-green-800 border-green-200",
  vehicles: "bg-purple-100 text-purple-800 border-purple-200",
  home: "bg-amber-100 text-amber-800 border-amber-200",
  books: "bg-indigo-100 text-indigo-800 border-indigo-200",
  music: "bg-violet-100 text-violet-800 border-violet-200",
  photography: "bg-cyan-100 text-cyan-800 border-cyan-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const conditionColors: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  good: "bg-blue-50 text-blue-700 border-blue-200",
  fair: "bg-yellow-50 text-yellow-700 border-yellow-200",
  poor: "bg-red-50 text-red-700 border-red-200"
};

const isVideoUrl = (url: unknown): boolean => typeof url === 'string' && /\.(mp4|mov|webm)$/i.test(url);

interface ItemDetailsContentProps {
  itemId: string;
}

export default function ItemDetailsContent({ itemId }: ItemDetailsContentProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [item, setItem] = useState<ItemType | null>(null);
  const [owner, setOwner] = useState<OwnerType | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [rentalForm, setRentalForm] = useState<RentalFormType>({
    start_date: "",
    end_date: "",
    selected_dates: [],
    message: ""
  });
  const [rentalCosts, setRentalCosts] = useState<RentalCostsType>({ rentalCost: 0, platformFee: 0, totalCost: 0 });
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false);
  const [showInquiryModal, setShowInquiryModal] = useState<boolean>(false);
  const [inquiryMessage, setInquiryMessage] = useState<string>("");
  const [isSendingInquiry, setIsSendingInquiry] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [successDialogData, setSuccessDialogData] = useState<SuccessDialogDataType | null>(null);
  const [showImageZoom, setShowImageZoom] = useState<boolean>(false);

  useEffect(() => {
    const loadItemDetails = async () => {
      if (!itemId) {
        router.push(createPageUrl("Home"));
        return;
      }

      setIsLoading(true);
      setError(null); // Reset error state on new load
      const startTime = Date.now(); // Start time for page load tracking

      try {
        console.log(`Loading details for item ID: ${itemId}`);
        const response = await api.getItem(itemId);

        if (response.success && response.data) {
          // Handle both single item response and nested response structure
          // Mock data returns { item, owner }, API might return different structure
          const itemData = (response.data as any).item || response.data;
          const ownerData = (response.data as any).owner || null;
          
          if (!itemData || !itemData.id) {
            console.error('Invalid item data received:', response.data);
            setError("Item data is invalid. Please try again.");
            setIsLoading(false);
            return;
          }
          
          setItem(itemData);
          setOwner(ownerData);

          // Track viewed item for recently viewed items feature
          try {
            const user = await getCurrentUser();
            // Check if user is logged in before tracking view
            if (user && user.email) {
              console.log('📊 Tracking view for item:', itemId, 'user:', user.email);
              // Use the helper function for consistency
              const viewResponse = await createViewedItem({
                user_email: user.email,
                item_id: itemId,
                viewed_date: new Date().toISOString(),
              });
              if (viewResponse.success) {
                console.log('✅ View tracked successfully - item will appear in recently viewed');
              } else {
                console.warn('⚠️ Failed to track view:', viewResponse.error);
              }
            } else {
              console.log('ℹ️ User not logged in, skipping view tracking');
            }
          } catch (viewError) {
            // Silently handle view tracking errors (non-critical)
            console.warn('⚠️ Error tracking view (non-critical):', viewError);
            console.error('❌ Error tracking view:', viewError);
          }

          // Page load time tracking for admin dashboard
          const loadTime = (Date.now() - startTime) / 1000;
          const metrics = JSON.parse(localStorage.getItem('pageLoadMetrics') || '{}');
          metrics.itemDetails = loadTime.toFixed(2);
          localStorage.setItem('pageLoadMetrics', JSON.stringify(metrics));
          console.log(`✅ Item Details page loaded in ${loadTime.toFixed(2)}s`);

        } else {
          setError(`Item not found for ID: ${itemId}. Available items: 1, 2, 3`);
          console.error("Item not found for ID:", itemId);
        }
      } catch (err) {
        console.error("Error loading item details:", err);
        setError("Failed to load item details. Please try again.");
        // Don't redirect on error - let user see the error message
      } finally {
        setIsLoading(false);
      }
    };

    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        setCurrentUser(null);
      }
    };

    loadItemDetails();
    loadCurrentUser();
  }, [router, itemId]);

  const calculateRentalCost = useCallback((days: number): number => {
    if (!item || days <= 0) return 0;

    if (!item.pricing_tiers || item.pricing_tiers.length === 0) {
      return days * item.daily_rate;
    }

    const sortedTiers = [...item.pricing_tiers].sort((a, b) => b.days - a.days);
    const applicableTier = sortedTiers.find((tier) => tier.days <= days);

    if (applicableTier) {
      const tierSets = Math.floor(days / applicableTier.days);
      const remainingDays = days % applicableTier.days;
      return tierSets * applicableTier.price + remainingDays * item.daily_rate;
    }

    return days * item.daily_rate;
  }, [item]);

  useEffect(() => {
    if (item) {
      // Only use individual dates
      const days = rentalForm.selected_dates?.length || 0;
      
      if (days > 0) {
        const minDays = item.min_rental_days || 1;
        const baseCost = calculateRentalCost(Math.max(days, minDays));
        const fee = baseCost * 0.15;
        setRentalCosts({
          rentalCost: baseCost,
          platformFee: fee,
          totalCost: baseCost + fee
        });
      } else {
        setRentalCosts({ rentalCost: 0, platformFee: 0, totalCost: 0 });
      }
    }
  }, [rentalForm.selected_dates, item, calculateRentalCost]);

  const handleRentalFormChange = (field: keyof RentalFormType, value: string): void => {
    setRentalForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (dates: { selected_dates: string[] }): void => {
    // Only handle individual dates selection
    const selectedDates = dates.selected_dates || [];
    setRentalForm((prev) => ({
      ...prev,
      selected_dates: selectedDates,
      // Calculate min/max dates for display purposes
      start_date: selectedDates.length > 0 ? selectedDates[0] : "",
      end_date: selectedDates.length > 0 ? selectedDates[selectedDates.length - 1] : ""
    }));
  };

  const handleOpenInquiryFromAI = (): void => {
    setShowInquiryModal(true);
  };

  const handleSubmitInquiry = async (): Promise<void> => {
    if (!inquiryMessage.trim() || !currentUser || !item) return;
    setIsSendingInquiry(true);
    try {
      // Check if an inquiry thread already exists
      const existingInquiriesResponse = await api.request<Array<{ id: string }>>(
        `/rental-requests?item_id=${item.id}&renter_email=${currentUser.email}&owner_email=${item.created_by}&status=inquiry`
      );

      let inquiryRequest: { id: string };
      if (existingInquiriesResponse.success && existingInquiriesResponse.data && existingInquiriesResponse.data.length > 0) {
        inquiryRequest = existingInquiriesResponse.data[0];
      } else {
        // Create a new inquiry "request" to act as a conversation thread
        const createResponse = await api.createRentalRequest({
          item_id: item.id,
          renter_email: currentUser.email,
          owner_email: item.created_by,
          status: "inquiry",
          start_date: null,
          end_date: null,
          total_amount: 0,
        });
        if (!createResponse.success || !createResponse.data) {
          throw new Error(createResponse.error || 'Failed to create inquiry');
        }
        inquiryRequest = createResponse.data as { id: string };
      }

      // Add the message to the thread
      await api.sendMessage({
        rental_request_id: inquiryRequest.id,
        content: inquiryMessage,
      });

      setShowInquiryModal(false);
      setInquiryMessage("");
      router.push(createPageUrl("Requests")); // Navigate to the requests/messages page
    } catch (error) {
      console.error("Error sending inquiry:", error);
      alert("Failed to send your message. Please try again.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  const handleSubmitRentalRequest = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!currentUser) {
      redirectToSignIn();
      return;
    }

    if (!item) {
      alert("Item not found. Please refresh the page.");
      return;
    }

    // Check if user is owner (cannot rent)
    if (currentUser.intent === 'owner') {
      alert("You need to switch your account type to Renter or Both to book items.");
      return;
    }

    // Check payment method for renters and both (admins are exempt)
    const hasPaymentMethod = !!(currentUser as any)?.stripe_payment_method_id;
    const isRenterOrBoth = currentUser.intent === 'renter' || currentUser.intent === 'both';
    
    if (currentUser.role !== 'admin' && isRenterOrBoth && !hasPaymentMethod) {
      alert("You must connect your card before renting items.");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      // Only use individual dates
      const selectedDates = rentalForm.selected_dates || [];
      
      if (selectedDates.length === 0) {
        alert("Please select at least one date.");
        setIsSubmittingRequest(false);
        return;
      }
      
      // First validate the dates are available
      const validationResponse = await api.request<{ available: boolean; verification_required?: boolean }>('/rental-requests/validate', {
        method: 'POST',
        body: JSON.stringify({
          item_id: item.id,
          selected_dates: selectedDates
        }),
      });

      // Check if validation returned verification error
      if (validationResponse.data?.verification_required) {
        alert("You must verify your identity before renting items.");
        setIsSubmittingRequest(false);
        return;
      }

      if (!validationResponse.data || !validationResponse.data.available) {
        alert("Sorry, some or all of the selected dates are no longer available. Please select different dates.");
        setIsSubmittingRequest(false);
        setRentalForm({ start_date: "", end_date: "", selected_dates: [], message: "" });
        return;
      }

      const totalCost = rentalCosts.rentalCost;

      // Calculate start_date and end_date from selected dates (for backend compatibility)
      const sortedDates = [...selectedDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      // Check if item has instant booking enabled - set initial status accordingly
      const initialStatus = item.instant_booking ? "approved" : "pending";
      
      console.log('Creating rental request with status:', initialStatus, 'Instant booking:', item.instant_booking);

      const requestResponse = await api.createRentalRequest({
        item_id: item.id,
        renter_email: currentUser.email,
        owner_email: item.created_by,
        start_date: startDate,
        end_date: endDate,
        total_amount: totalCost,
        message: rentalForm.message,
        status: initialStatus
      });

      if (!requestResponse.success || !requestResponse.data) {
        throw new Error(requestResponse.error || 'Failed to create rental request');
      }

      const request = requestResponse.data as { id: string; status: string };
      console.log('Created rental request:', request.id, 'with status:', request.status);

      // Create one availability block per individual date
      await Promise.all(selectedDates.map(date => 
        createItemAvailability({
          item_id: item.id,
          blocked_start_date: date,
          blocked_end_date: date, // Same date for start and end
          reason: 'rented',
        } as any)
      ));

      // Create initial message
      await api.sendMessage({
        rental_request_id: request.id,
        content: rentalForm.message || "Hi! I'm interested in renting your item.",
      });

      // Send email notifications
      try {
        const startDateFormatted = format(parseISO(startDate), 'MMM d, yyyy');
        const endDateFormatted = format(parseISO(endDate), 'MMM d, yyyy');
        const days = selectedDates.length;
        
        // Format dates display for email
        let datesDisplay: string;
        if (selectedDates.length === 1) {
          datesDisplay = format(parseISO(selectedDates[0]), 'MMM d, yyyy');
        } else {
          datesDisplay = `${startDateFormatted} to ${endDateFormatted} (${selectedDates.length} dates: ${selectedDates.map(d => format(parseISO(d), 'MMM d')).join(', ')})`;
        }

        const renterReviewsResponse = await api.getReviews(undefined, currentUser.email);
        const renterReviews: Array<{ rating: number }> = renterReviewsResponse.success && renterReviewsResponse.data 
          ? (Array.isArray(renterReviewsResponse.data) 
              ? renterReviewsResponse.data.filter((r: any) => r.reviewee_email === currentUser.email)
              : [])
          : [];
        const averageRating = renterReviews.length > 0 ?
          (renterReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / renterReviews.length).toFixed(1) :
          'No reviews yet';

        // Renters/both must have card connected to submit request
        // Owners can't send rental requests (they receive them)
        // So anyone sending a request must have card connected
        const verificationBadge = '<span style="display: inline-block; background-color: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">✓ CARD CONNECTED</span>';
        const statusLabel = 'Payment Method';

        const renterInfo = createInfoBox({
          title: '👤 Renter Information',
          items: [
            { label: 'Name', value: currentUser.full_name || currentUser.email || 'Not set' },
            { label: 'Username', value: currentUser.username ? '@' + currentUser.username : 'Not set' },
            { label: 'Rating', value: averageRating + (renterReviews.length > 0 ? ' ⭐ (' + renterReviews.length + ' reviews)' : '') },
            { label: statusLabel, value: verificationBadge }]

        });

        const rentalInfo = createInfoBox({
          title: '📅 Rental Details',
          items: [
            { label: 'Item', value: item.title },
            { label: 'Dates', value: datesDisplay + ' (' + days + ' day' + (days !== 1 ? 's' : '') + ')' },
            { label: 'Rental Amount', value: '$' + rentalCosts.rentalCost.toFixed(2) },
            { label: 'Your Payout (after 15% fee)', value: '$' + (rentalCosts.rentalCost * 0.85).toFixed(2) }],

          highlight: true
        });

        const messageContent = rentalForm.message ?
          `<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
               <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px; font-weight: 600;">💬 Message from Renter:</h3>
               <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6; font-style: italic;">"${rentalForm.message}"</p>
             </div>` :
          '';

        const emailTitle = item.instant_booking ? '✅ New Instant Booking!' : '🎉 New Rental Request!';
        const emailIntro = item.instant_booking
          ? `<strong style="color: #10b981;">This rental has been automatically approved</strong> because you have instant booking enabled for this item.`
          : 'You have received a new rental request.';

        const emailBody = createEmailTemplate({
          title: emailTitle,
          content: `
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
              ${emailIntro} for your item <strong style="color: #0f172a;">"${item.title}"</strong>!
            </p>
            ${renterInfo}
            ${rentalInfo}
            ${messageContent}
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
              ${item.instant_booking
                ? 'The renter can now proceed with payment. You can view this booking in <strong>"My Conversations"</strong>.'
                : 'To review and respond to this request, please log in to your Rentable account and go to <strong>"My Conversations"</strong>.'}
            </p>
          `,
          buttonText: item.instant_booking ? 'View Booking' : 'View Request',
          buttonUrl: window.location.origin + createPageUrl('Requests'),
          footerText: 'Thank you for being part of the Rentable community!'
        });

        if (item.created_by) {
          await sendEmail({
            to: item.created_by,
            subject: item.instant_booking ? `✅ New Instant Booking for ${item.title}` : `🔔 New Rental Request for ${item.title}`,
            body: emailBody,
            from_name: "Rentable"
          });
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      // Store data for success dialog
      const startDateFormatted = format(parseISO(startDate), 'MMM d, yyyy');
      const endDateFormatted = format(parseISO(endDate), 'MMM d, yyyy');
      
      setSuccessDialogData({
        isInstantBooking: item.instant_booking || false,
        itemTitle: item.title,
        startDate: `${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}: ${selectedDates.map(d => format(parseISO(d), 'MMM d')).join(', ')}`,
        endDate: '',
        totalAmount: rentalCosts.totalCost.toFixed(2)
      });
      
      setRentalForm({ start_date: "", end_date: "", selected_dates: [], message: "" });
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error submitting rental request:", error);
      alert("Failed to submit rental request. Please try again.");
    }
    setIsSubmittingRequest(false);
  };

  const handleToggleAvailability = async (): Promise<void> => {
    if (!item) return;
    setIsToggling(true);
    try {
      const response = await api.updateItem(item.id, { availability: !item.availability });
      if (response.success) {
        setItem((prev) => prev ? ({ ...prev, availability: !prev.availability }) : null);
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDeleteItem = async (): Promise<void> => {
    if (!item) return;
    setIsDeleting(true);
    try {
      const response = await api.deleteItem(item.id);
      if (response.success) {
        router.push(createPageUrl("Profile"));
      } else {
        throw new Error(response.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>);

  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('itemDetails.itemNotFound')}</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Button onClick={() => router.push(createPageUrl("Home"))}>
            {t('itemDetails.goBackToBrowse')}
          </Button>
        </div>
      </div>);

  }


  const defaultImage = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop";
  const itemImages = (item.images || []).filter(Boolean);
  const itemVideos = (item.videos || []).filter(Boolean);
  const allMedia = [...itemVideos, ...itemImages];
  const displayMedia = allMedia.length > 0 ? allMedia : [defaultImage];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(createPageUrl("Home"))}
              className="w-12 h-12 rounded-xl border-slate-200 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{item.title}</h1>
              <p className="text-slate-600 flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                {item.location}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShareButtons
                item={item}
                itemUrl={`/ItemDetails?id=${item.id}`}
              />
              {currentUser && currentUser.email !== item.created_by && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowReportDialog(true)}
                  className="w-10 h-10 border-red-200 text-red-600 hover:bg-red-50"
                  title="Report this listing"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}>

              <Card className="overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <div className="aspect-[4/3] relative">
                  {isVideoUrl(displayMedia[selectedImage]) ?
                    <video
                      src={displayMedia[selectedImage]}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                      controlsList="nodownload" /> :


                    <img
                      src={displayMedia[selectedImage]}
                      alt={item.title}
                      className="w-full h-full object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                      onClick={() => setShowImageZoom(true)} />

                  }
                  {!item.availability &&
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive" className="text-lg font-semibold px-4 py-2">
                        {t('item.notAvailable')}
                      </Badge>
                    </div>
                  }
                </div>

                {displayMedia.length > 1 &&
                  <div className="p-4 border-t">
                    <div className="flex gap-2 overflow-x-auto">
                      {displayMedia.map((media, index) =>
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors relative ${selectedImage === index ? 'border-slate-400' : 'border-slate-200'}`
                          }>

                          {isVideoUrl(media) ?
                            <>
                              <video src={media} className="w-full h-full object-cover" muted controlsList="nodownload" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white" />
                              </div>
                            </> :

                            <img src={media} alt={`${item.title} ${index + 1}`} className="w-full h-full object-cover" />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                }
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6">

              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-4xl font-bold text-slate-900">
                        ${item.daily_rate}
                      </span>
                      <span className="text-slate-500 text-lg ml-2">{t('itemDetails.perDay')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${categoryColors[item.category] || categoryColors.other} border shadow-sm`}>
                        {item.category}
                      </Badge>
                      {item.condition && (
                        <Badge className={`${conditionColors[item.condition] || conditionColors.good} border shadow-sm`}>
                          {item.condition}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {currentUser && currentUser.email !== item.created_by && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={() => currentUser ? setShowInquiryModal(true) : redirectToSignIn()}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t('itemDetails.askQuestion')}
                      </Button>
                    </div>
                  )}

                  {item.pricing_tiers && item.pricing_tiers.length > 0 &&
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">{t('itemDetails.specialPricing')}:</h4>
                      <div className="space-y-1">
                        {item.pricing_tiers.
                          sort((a, b) => a.days - b.days).
                          map((tier, index) =>
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-blue-800">
                                {t('itemDetails.rentFor')} {tier.days} {tier.days === 1 ? t('itemDetails.day') : t('itemDetails.days')}:
                              </span>
                              <span className="font-semibold text-blue-900">
                                ${(tier.price || 0).toFixed(2)}
                                <span className="text-xs text-blue-600 ml-1">
                                  (${(tier.price / tier.days || 0).toFixed(2)}{t('itemDetails.perDay')})
                                </span>
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  }

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t('itemDetails.securityDeposit')}
                      </span>
                      <span className="font-semibold">${item.deposit || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t('itemDetails.minMaxDays')}
                      </span>
                      <span className="font-semibold">{item.min_rental_days} - {item.max_rental_days} {t('itemDetails.days')}</span>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-slate-600 text-sm font-medium mb-2 block">{t('itemDetails.deliveryOptions')}:</span>
                      <div className="flex flex-wrap gap-2">
                        {(item.delivery_options || ["pickup"]).map((option) =>
                          <Badge key={option} variant="outline" className="text-xs">
                            {option === "pickup" ? `📍 ${t('itemDetails.pickupAtLocation')}` : `🚚 ${t('itemDetails.deliveryAvailable')}`}
                          </Badge>
                        )}
                      </div>
                      {item.delivery_options?.includes("delivery") && item.delivery_fee && item.delivery_fee > 0 &&
                        <p className="text-xs text-slate-500 mt-2">
                          {t('itemDetails.deliveryFee')}: ${item.delivery_fee} {item.delivery_radius && `(${t('itemDetails.within')} ${item.delivery_radius} ${t('itemDetails.miles')})`}
                        </p>
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{t('itemDetails.aboutThisItem')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {owner?.username ?
                      <Link href={createPageUrl(`PublicProfile?username=${owner.username}`)} className="flex-shrink-0">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                          {owner.profile_picture ?
                            <img src={owner.profile_picture} alt={owner.full_name} className="w-full h-full object-cover" /> :

                            <UserIcon className="w-6 h-6 text-slate-600" />
                          }
                        </div>
                      </Link> :

                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                        <UserIcon className="w-6 h-6 text-slate-600" />
                      </div>
                    }
                    <div>
                      <p className="font-semibold text-slate-900">{t('itemDetails.owner')}</p>
                      {owner?.username ?
                        <Link href={createPageUrl(`PublicProfile?username=${owner.username}`)} className="text-sm text-slate-600 hover:underline">
                          @{owner.username}
                        </Link> :

                        <span className="text-sm text-slate-600">A user</span>
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Item Management Card for Owner */}
              {currentUser?.email === item.created_by &&
                <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      {t('itemDetails.manageThisListing')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-gray-50 pt-0 p-6 space-y-3">
                    <Link href={`${createPageUrl("ManageItem")}?id=${item.id}`} className="block">
                      <Button variant="secondary" className="w-full justify-start h-12 text-base">
                        <Edit className="w-5 h-5 mr-3" />
                        {t('itemDetails.editItemDetails')}
                      </Button>
                    </Link>

                    <Link href={`${createPageUrl("ManageItem")}?id=${item.id}&tab=availability`} className="block">
                      <Button variant="secondary" className="w-full justify-start h-12 text-base">
                        <CalendarIcon className="w-5 h-5 mr-3" />
                        {t('itemDetails.manageAvailability')}
                      </Button>
                    </Link>

                    <Link href={`${createPageUrl("ManageItem")}?id=${item.id}&tab=analytics`} className="block">
                      <Button variant="secondary" className="w-full justify-start h-12 text-base">
                        <TrendingUp className="w-5 h-5 mr-3" />
                        {t('itemDetails.viewAnalytics')}
                      </Button>
                    </Link>

                    <div className="pt-3 border-t border-white/20 space-y-2">
                      <Button
                        onClick={handleToggleAvailability}
                        disabled={isToggling}
                        variant="outline" className="bg-slate-950 text-white px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-10 w-full border-white/20 hover:bg-white/20">


                        {isToggling ?
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" /> :
                          item.availability ?
                            <EyeOff className="w-4 h-4 mr-2" /> :

                            <Eye className="w-4 h-4 mr-2" />
                        }
                        {isToggling ? t('itemDetails.updating') : item.availability ? t('itemDetails.hideListing') : t('itemDetails.makeAvailable')}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('itemDetails.deleteItem')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('itemDetails.areYouSure')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('itemDetails.deleteWarning')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteItem}
                              disabled={isDeleting}
                              className="bg-red-600 hover:bg-red-700">

                              {isDeleting ?
                                <>
                                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                  {t('itemDetails.deleting')}
                                </> :

                                t('itemDetails.yesDeleteIt')
                              }
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              }

              {/* Rental Section - Updated with payment method check */}
              {item && item.availability && currentUser?.email !== item.created_by &&
                <div className="space-y-6">
                  {(() => {
                    // Check if user is owner (cannot rent)
                    if (currentUser?.intent === 'owner') {
                      return (
                        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                          <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <AlertCircle className="w-6 h-6 text-slate-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Switch to Renter or Both to book</h3>
                            <p className="text-slate-600 mb-4">
                              You need to switch your account type to Renter or Both to book items.
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }

                    // For renters and both: check payment method ID
                    const hasPaymentMethod = !!(currentUser as any)?.stripe_payment_method_id;
                    const isRenterOrBoth = currentUser?.intent === 'renter' || currentUser?.intent === 'both';
                    const isAdmin = currentUser?.role === 'admin';

                    // Show alert if no payment method (unless admin)
                    if (!isAdmin && isRenterOrBoth && !hasPaymentMethod) {
                      return (
                        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                          <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-2">Card Connection Required</h3>
                            <p className="text-slate-600 mb-4">
                              {t('itemDetails.verifyToRent')}
                            </p>
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <Badge className="bg-slate-100 text-slate-800 border-slate-200 border flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Not connected
                              </Badge>
                            </div>
                            <VerificationPrompt
                              currentUser={currentUser as VerificationUser | null}
                              message={t('itemDetails.verifyIdentity')} />
                          </CardContent>
                        </Card>
                      );
                    }

                     // Show calendar if payment method exists or is admin
                     return (
                       <>
                         <AvailabilityCalendar 
                           itemId={item.id} 
                           selectionMode="multiple"
                           onDateChange={handleDateChange} 
                         />

                      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle>{t('itemDetails.requestToRent')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {!rentalForm.selected_dates || rentalForm.selected_dates.length === 0 ? (
                            <div className="text-center py-4">
                              <p className="text-slate-600 font-medium">{t('itemDetails.selectDatesPrompt')}</p>
                            </div>
                          ) : (
                            <form onSubmit={handleSubmitRentalRequest} className="space-y-4">
                              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-600">{t('itemDetails.rentalPeriod')}:</span>
                                  <span className="font-medium text-slate-800">
                                    {rentalForm.selected_dates.length === 1 
                                      ? format(parseISO(rentalForm.selected_dates[0]), 'PPP')
                                      : `${rentalForm.selected_dates.length} dates: ${rentalForm.selected_dates.map(d => format(parseISO(d), 'MMM d')).join(', ')}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-600">{t('itemDetails.rentalCost')} ({rentalForm.selected_dates.length} {t('itemDetails.days')}):</span>
                                  <span className="font-medium text-slate-800">
                                    ${rentalCosts.rentalCost.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-600">{t('itemDetails.platformFee')} (15%):</span>
                                  <span className="font-medium text-slate-800">
                                    ${rentalCosts.platformFee.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                  <span className="font-medium">{t('itemDetails.totalPrice')}:</span>
                                  <span className="text-xl font-bold text-slate-900">
                                    ${rentalCosts.totalCost.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="message">{t('itemDetails.messageToOwner')}</Label>
                                <Textarea
                                  id="message"
                                  value={rentalForm.message}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleRentalFormChange('message', e.target.value)}
                                  placeholder={t('itemDetails.messagePlaceholder')}
                                  rows={3}
                                  className="mt-1 rounded-lg" />

                              </div>

                              <Button
                                type="submit"
                                disabled={isSubmittingRequest}
                                className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-lg">

                                {isSubmittingRequest ?
                                  <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                    {t('itemDetails.sendingRequest')}
                                  </> :

                                  t('itemDetails.confirmAndSend')
                                }
                              </Button>
                            </form>
                          )}
                        </CardContent>
                      </Card>
                    </>
                    );
                  })()}
                </div>
              }

              {!currentUser && item.availability &&
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <p className="text-slate-600 mb-4">{t('itemDetails.signInToRent')}</p>
                    <Button
                      onClick={() => redirectToSignIn()}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl">

                      {t('itemDetails.signIn')}
                    </Button>
                  </CardContent>
                </Card>
              }
            </motion.div>
          </div>
          <SimilarItems currentItem={item} />
        </div>
      </div>

      {/* AI Chat Assistant - Always available */}
      {item && (
        <AIChatAssistant
          item={item}
          onContactOwner={handleOpenInquiryFromAI}
        />
      )}

      {/* Report Dialog */}
      {item && (
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          reportType="listing"
          itemId={item.id}
          itemTitle={item.title}
          targetEmail={item.created_by}
          targetName={item.title}
        />
      )}

      {/* Booking Success Dialog */}
      {successDialogData && (
        <BookingSuccessDialog
          isOpen={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            setSuccessDialogData(null);
          }}
          isInstantBooking={successDialogData.isInstantBooking}
          itemTitle={successDialogData.itemTitle}
          startDate={successDialogData.startDate}
          endDate={successDialogData.endDate}
          totalAmount={successDialogData.totalAmount}
          onViewConversation={() => {
            setShowSuccessDialog(false);
            window.location.href = createPageUrl("Requests");
          }}
        />
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={showImageZoom}
        onClose={(open?: boolean) => setShowImageZoom(false)}
        images={itemImages.length > 0 ? itemImages : [defaultImage]}
        initialIndex={selectedImage < itemVideos.length ? 0 : selectedImage - itemVideos.length}
      />

      {/* Inquiry Dialog */}
      <Dialog open={showInquiryModal} onOpenChange={setShowInquiryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('itemDetails.askOwnerQuestion')}</DialogTitle>
            <DialogDescription>
              {t('itemDetails.yourMessageWillStart')} "{item?.title || t('itemDetails.thisItem')}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="inquiry-message">{t('itemDetails.yourMessage')}</Label>
            <Textarea
              id="inquiry-message"
              placeholder={t('itemDetails.messagePlaceholderQuestion')}
              rows={4}
              value={inquiryMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInquiryMessage(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInquiryModal(false)} disabled={isSendingInquiry}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmitInquiry} disabled={isSendingInquiry || !inquiryMessage.trim()}>
              {isSendingInquiry ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  {t('itemDetails.sending')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('itemDetails.sendMessage')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}