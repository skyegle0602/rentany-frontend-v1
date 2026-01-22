'use client'


import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
const createPageUrl = (path: string) => path;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Calendar, TrendingUp, Edit, DollarSign, Sparkles, Share2, Settings, EyeOff, Trash2, MapPin, User, CheckCircle, AlertCircle } from "lucide-react";
import AvailabilityCalendar from '@/components/calendar/AvailabilityCalendar';
import EarningsChart from '@/components/analytics/EarningsChart';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SimilarItems from '@/components/items/SimilarItems';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
// TypeScript interfaces
interface Item {
  id: string;
  title: string;
  description?: string;
  category?: string;
  daily_rate: number;
  deposit?: number;
  condition?: string;
  location?: string;
  street_address?: string;
  postcode?: string;
  country?: string;
  show_on_map?: boolean;
  min_rental_days?: number;
  max_rental_days?: number;
  delivery_options?: string[];
  delivery_fee?: number;
  delivery_radius?: string;
  created_by?: string;
  owner_id?: string;
  availability?: boolean;
  images?: string[];
  [key: string]: any;
}

interface ItemFormData {
  title?: string;
  description?: string;
  category?: string;
  daily_rate?: string | number;
  deposit?: string | number;
  condition?: string;
  location?: string;
  street_address?: string;
  postcode?: string;
  country?: string;
  show_on_map?: boolean;
  min_rental_days?: string | number;
  max_rental_days?: string | number;
  delivery_options?: string[];
  delivery_fee?: string | number;
  delivery_radius?: string | number;
  notice_period_hours?: string | number;
  instant_booking?: boolean;
  same_day_pickup?: boolean;
  [key: string]: any;
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


export default function ManageItemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>({});
  const [currentTab, setCurrentTab] = useState('details');
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionType, setPromotionType] = useState('featured');
  const [promotionDays, setPromotionDays] = useState(7);
  const [isProcessingPromotion, setIsProcessingPromotion] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<StripeTestResult | null>(null);
  const [isTestingStripe, setIsTestingStripe] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // React to URL parameter changes (especially tab parameter)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setCurrentTab(tabParam);
    } else {
      setCurrentTab('details'); // Default to details if no tab is specified
    }
  }, [searchParams]);

  useEffect(() => {
    const loadItem = async () => {
      const itemId = searchParams.get('id');

      // Check for promotion success
      if (searchParams.get('promotion_success') === 'true') {
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
          setIsProcessingPromotion(true);
          try {
            const response = await api.request<{ success: boolean }>('/payments/process-promotion', {
              method: 'POST',
              body: JSON.stringify({ session_id: sessionId })
            });
            const data = response.success && response.data ? response.data : { success: false };
            alert('✨ Your item promotion is now live! It will appear in premium placement.');
            // Clean up URL
            router.replace(`/manage-item?id=${itemId}`);
          } catch (error) {
            console.error('Error processing promotion:', error);
            alert('There was an error activating your promotion. Please contact support.');
          } finally {
            setIsProcessingPromotion(false);
          }
        }
      }

      if (!itemId) {
        router.push('/profile');
        return;
      }

      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        const itemsResponse = await api.request<Item[]>('/items');
        const allItems = itemsResponse.success && itemsResponse.data ? itemsResponse.data : [];
        const foundItem = allItems.find(i => i.id === itemId);

        if (!foundItem) {
          router.push('/profile');
          return;
        }
        
        // Check if user is the owner
        // owner_id is the Clerk user ID, so compare with clerk_id
        if (!user) {
          router.push('/profile');
          return;
        }
        
        const isOwner = foundItem.owner_id === user.clerk_id || 
                       foundItem.owner_id === user.id ||
                       foundItem.created_by === user.email;
        
        if (!isOwner) {
          router.push('/profile');
          return;
        }

        setItem(foundItem);
        setFormData({
          title: foundItem.title,
          description: foundItem.description,
          category: foundItem.category,
          daily_rate: foundItem.daily_rate,
          deposit: foundItem.deposit || 0,
          condition: foundItem.condition,
          location: foundItem.location,
          street_address: foundItem.street_address || "",
          postcode: foundItem.postcode || "",
          country: foundItem.country || "",
          show_on_map: foundItem.show_on_map !== false, // Default to true if not explicitly false
          min_rental_days: foundItem.min_rental_days,
          max_rental_days: foundItem.max_rental_days,
          delivery_options: foundItem.delivery_options || ["pickup"],
          delivery_fee: foundItem.delivery_fee || 0,
          delivery_radius: foundItem.delivery_radius || "",
          notice_period_hours: foundItem.notice_period_hours || 24,
          instant_booking: foundItem.instant_booking || false,
          same_day_pickup: foundItem.same_day_pickup || false
        });
      } catch (error) {
        console.error("Error loading item:", error);
        router.push('/profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadItem();
  }, [router, searchParams]);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (!item) {
      alert('Item not found. Please refresh the page.');
      return;
    }

    try {
      await api.request(`/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          daily_rate: parseFloat(formData.daily_rate as string),
          deposit: parseFloat(formData.deposit as string),
          min_rental_days: parseInt(formData.min_rental_days as string),
          max_rental_days: parseInt(formData.max_rental_days as string),
          delivery_fee: parseFloat(formData.delivery_fee as string),
          delivery_radius: formData.delivery_radius ? parseFloat(formData.delivery_radius as string) : null,
          notice_period_hours: parseInt(formData.notice_period_hours as string),
          instant_booking: Boolean(formData.instant_booking),
          same_day_pickup: Boolean(formData.same_day_pickup)
        })
      });
      // Optionally navigate back to profile or show success message
      router.push('/profile');
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestStripe = async () => {
    setIsTestingStripe(true);
    try {
      const response = await api.request<{ success: boolean; keyType?: string; accountEmail?: string; chargesEnabled?: boolean; requirements?: string[]; error?: string; details?: string; hint?: string }>('/stripe/test');
      const data = response.success && response.data ? response.data : { success: false, error: response.error || 'Unknown error' };
      setStripeTestResult(data);
      console.log("Stripe test result:", data);
    } catch (error) {
      console.error("Stripe test error:", error);
      setStripeTestResult({ 
        success: false,
        error: (error as any).response?.data?.error || (error as any).message,
        details: (error as any).response?.data?.details,
        hint: (error as any).response?.data?.hint
      });
    } finally {
      setIsTestingStripe(false);
    }
  };

  const handlePromote = async () => {
    setIsPromoting(true);
    setStripeTestResult(null); // Clear previous test results
    
    try {
      const costs = {
        featured: 5,
        homepage: 10,
        category: 3
      };
      
      const totalCost = costs[promotionType as keyof typeof costs] * promotionDays;
      
      console.log("Starting promotion checkout...");
      console.log("Item ID:", item?.id);
      console.log("Promotion Type:", promotionType);
      console.log("Promotion Days:", promotionDays);
      console.log("Return URL:", window.location.href);
      
      // Create checkout session and redirect to Stripe
      const response = await api.request<{ url?: string; checkout_url?: string }>('/checkout/promotion', {
        method: 'POST',
        body: JSON.stringify({
          item_id: item?.id,
          promotion_type: promotionType,
          promotion_days: promotionDays,
          return_url: window.location.href
        })
      });

      console.log("Checkout response:", response);

      if (response.success && response.data && (response.data.url || response.data.checkout_url)) {
        const checkoutUrl = response.data.url || response.data.checkout_url;
        console.log("Redirecting to:", checkoutUrl);
        if (typeof window !== 'undefined' && checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      } else {
        console.error("No URL in response:", response);
        alert(`Failed to create promotion checkout: ${response.error || 'Unknown error'}\n\nPlease check the browser console for details.`);
        setIsPromoting(false);
      }
    } catch (error) {
      console.error("Error creating promotion checkout:", error);
      const errorMsg = (error as any).response?.data?.error || (error as any).message;
      const errorHint = (error as any).response?.data?.hint || '';
      alert(`Failed to start promotion:\n${errorMsg}\n\n${errorHint}\n\nCheck browser console for details.`);
      setIsPromoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!item) return null;

  // Conditional rendering based on currentTab
  if (currentTab === 'availability') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/manage-item?id=${item?.id}`)}
              className="w-12 h-12 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">Manage Availability</h1>
              <p className="text-slate-600">{item.title}</p>
            </div>
          </div>
          <Card className="border-0 shadow-xl">
            <CardContent>
              <AvailabilityCalendar itemId={item.id} isOwner={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentTab === 'analytics') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/manage-item?id=${item?.id}`)}
              className="w-12 h-12 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">Item Analytics</h1>
              <p className="text-slate-600">{item.title}</p>
            </div>
          </div>
          <Card className="border-0 shadow-xl">
            <CardContent>
              <EarningsChart data={[]} type="line" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentTab === 'edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Processing Promotion Overlay */}
          {isProcessingPromotion && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-lg font-semibold">Activating your promotion...</p>
              </Card>
            </div>
          )}

          {/* Stripe Test Result Alert */}
          {stripeTestResult && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert className={stripeTestResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-start gap-3">
                  {stripeTestResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className={stripeTestResult.success ? "text-green-800" : "text-red-800"}>
                      {stripeTestResult.success ? (
                        <>
                          <strong>{stripeTestResult.details}</strong>
                          <div className="text-sm mt-2 space-y-1">
                            <p>• Mode: <strong>{stripeTestResult.keyType}</strong></p>
                            <p>• Account: {stripeTestResult.accountEmail}</p>
                            <p>• Charges Enabled: {stripeTestResult.chargesEnabled ? '✅ Yes' : '❌ No'}</p>
                            {stripeTestResult.requirements && stripeTestResult.requirements?.length > 0 && (
                              <p className="text-red-600">• Missing requirements: {stripeTestResult.requirements.join(', ')}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <strong>Stripe Configuration Error</strong>
                          <div className="text-sm mt-2">
                            <p>{stripeTestResult.error}</p>
                            {stripeTestResult.details && <p className="mt-1 text-xs opacity-75">{stripeTestResult.details}</p>}
                            {stripeTestResult.hint && <p className="mt-2 font-medium">{stripeTestResult.hint}</p>}
                          </div>
                        </>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/manage-item?id=${item?.id}`)}
              className="w-12 h-12 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">Edit Item</h1>
              <p className="text-slate-600">{item?.title}</p>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={handleTestStripe}
                variant="outline"
                disabled={isTestingStripe}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {isTestingStripe ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Test Stripe
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowPromoteDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Promote
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="tools">Tools</SelectItem>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="vehicles">Vehicles</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="books">Books</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Condition</Label>
                    <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="mt-2"
                      placeholder="City or neighborhood"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Daily Rate ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.daily_rate}
                      onChange={(e) => handleInputChange('daily_rate', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Security Deposit ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.deposit}
                      onChange={(e) => handleInputChange('deposit', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Min/Max Days</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="number"
                        value={formData.min_rental_days}
                        onChange={(e) => handleInputChange('min_rental_days', e.target.value)}
                        placeholder="Min"
                      />
                      <Input
                        type="number"
                        value={formData.max_rental_days}
                        onChange={(e) => handleInputChange('max_rental_days', e.target.value)}
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Rules */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Booking Rules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Notice Period (hours before pickup)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.notice_period_hours || 24}
                      onChange={(e) => handleInputChange('notice_period_hours', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Instant Booking</Label>
                      <p className="text-xs text-slate-600">Allow renters to book without your approval</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.instant_booking || false}
                      onChange={(e) => handleInputChange('instant_booking', e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div>
                      <Label className="text-sm font-medium">Same-Day Pickup</Label>
                      <p className="text-xs text-slate-600">Allow pickup on the same day as booking</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.same_day_pickup || false}
                      onChange={(e) => handleInputChange('same_day_pickup', e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Delivery Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="pickup"
                      checked={formData.delivery_options && formData.delivery_options.includes("pickup")}
                      onChange={() => {
                        const newOptions = formData.delivery_options && formData.delivery_options.includes("pickup")
                          ? formData.delivery_options.filter(o => o !== "pickup")
                          : [...formData.delivery_options || [], "pickup"];
                        handleInputChange('delivery_options', newOptions.length > 0 ? newOptions : ["pickup"]);
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="pickup" className="font-medium">Pickup at location</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="delivery"
                      checked={formData.delivery_options && formData.delivery_options.includes("delivery")}
                      onChange={() => {
                        const newOptions = formData.delivery_options && formData.delivery_options.includes("delivery")
                          ? formData.delivery_options.filter(o => o !== "delivery")
                          : [...formData.delivery_options || [], "delivery"];
                        handleInputChange('delivery_options', newOptions);
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="delivery" className="font-medium">Delivery to renter</label>
                  </div>

                  {formData.delivery_options && formData.delivery_options.includes("delivery") && (
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 ml-7">
                      <div>
                        <Label>Delivery Fee ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.delivery_fee}
                          onChange={(e) => handleInputChange('delivery_fee', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Max Distance (miles)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.delivery_radius}
                          onChange={(e) => handleInputChange('delivery_radius', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" asChild className="justify-start">
                    <Link href={`/manage-item?id=${item?.id}&tab=availability`}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Availability
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="justify-start">
                    <Link href={`/manage-item?id=${item.id}&tab=analytics`}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Analytics
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Save Button */}
              <div className="border-t pt-6">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Promote Dialog */}
          <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Promote Your Item
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-slate-600">
                  Boost your listing visibility and get more bookings! Payment will be processed securely through Stripe.
                </p>

                <div>
                  <Label>Promotion Type</Label>
                  <Select value={promotionType} onValueChange={setPromotionType}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured - $5/day</SelectItem>
                      <SelectItem value="homepage">Homepage Banner - $10/day</SelectItem>
                      <SelectItem value="category">Category Top - $3/day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={promotionDays}
                    onChange={(e) => setPromotionDays(parseInt(e.target.value) || 1)}
                    className="mt-2"
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-slate-900">Total Cost:</span>
                    <span className="text-2xl font-bold text-purple-600">
                      ${((promotionType === 'featured' ? 5 : promotionType === 'homepage' ? 10 : 3) * promotionDays).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 border-t border-purple-200 pt-3">
                    <p>💳 <strong>Secure payment via Stripe</strong></p>
                    <p>✨ <strong>Featured:</strong> Appears in "Featured Items" section</p>
                    <p>🏠 <strong>Homepage:</strong> Top banner on homepage</p>
                    <p>📂 <strong>Category Top:</strong> First in category pages</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handlePromote} 
                  disabled={isPromoting} 
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isPromoting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Default view: item details with management options
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Processing Promotion Overlay */}
        {isProcessingPromotion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-lg font-semibold">Activating your promotion...</p>
            </Card>
          </div>
        )}

        {/* Stripe Test Result Alert */}
        {stripeTestResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className={stripeTestResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start gap-3">
                {stripeTestResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className={stripeTestResult.success ? "text-green-800" : "text-red-800"}>
                    {stripeTestResult.success ? (
                      <>
                        <strong>{stripeTestResult.details}</strong>
                        <div className="text-sm mt-2 space-y-1">
                          <p>• Mode: <strong>{stripeTestResult.keyType}</strong></p>
                          <p>• Account: {stripeTestResult.accountEmail}</p>
                          <p>• Charges Enabled: {stripeTestResult.chargesEnabled ? '✅ Yes' : '❌ No'}</p>
                          {stripeTestResult.requirements && stripeTestResult.requirements?.length > 0 && (
                            <p className="text-red-600">• Missing requirements: {stripeTestResult.requirements.join(', ')}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <strong>Stripe Configuration Error</strong>
                        <div className="text-sm mt-2">
                          <p>{stripeTestResult.error}</p>
                          {stripeTestResult.details && <p className="mt-1 text-xs opacity-75">{stripeTestResult.details}</p>}
                          {stripeTestResult.hint && <p className="mt-2 font-medium">{stripeTestResult.hint}</p>}
                        </div>
                      </>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{item?.title}</h1>
            <div className="flex items-center gap-2 text-slate-600 mt-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{item?.location || 'Location not specified'}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 mb-6">
          {/* Left: Item Image */}
          <div className="w-full">
            <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] flex items-center justify-center">
              {item?.images && item.images.length > 0 ? (
                <img 
                  src={item.images[0]} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-400">No image available</div>
              )}
            </div>
          </div>

          {/* Right: Management Cards */}
          <div className="space-y-4">
            {/* Pricing and Basic Info Card */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="text-3xl font-bold text-slate-900 mb-4">
                  ${item?.daily_rate || 0} <span className="text-base font-normal text-slate-600">/day</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {item?.category && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                      {item.category}
                    </span>
                  )}
                  {item?.condition && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                      {item.condition}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Security Deposit</span>
                    <span className="font-semibold">${item?.deposit || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Min/Max Days</span>
                    <span className="font-semibold">
                      {item?.min_rental_days || 1} - {item?.max_rental_days || 30} days
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {formData.delivery_options && formData.delivery_options.includes("pickup") && (
                    <Button variant="outline" size="sm" className="w-full justify-start bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100">
                      <MapPin className="w-4 h-4 mr-2" />
                      Pickup at location
                    </Button>
                  )}
                  {formData.delivery_options && formData.delivery_options.includes("delivery") && (
                    <>
                      <Button variant="outline" size="sm" className="w-full justify-start bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100">
                        <MapPin className="w-4 h-4 mr-2" />
                        Delivery available
                      </Button>
                      {item?.delivery_fee && item?.delivery_radius && (
                        <p className="text-xs text-slate-600 mt-1">
                          Delivery fee: ${item.delivery_fee} (within {item.delivery_radius} miles)
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About this item Card */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">About this item</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{item?.description || 'No description provided.'}</p>
              </CardContent>
            </Card>

            {/* Owner Information Card */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Owner</p>
                    <p className="text-sm text-slate-600">
                      {currentUser?.username ? `@${currentUser.username}` : currentUser?.email || 'Owner'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manage This Listing Card */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5" />
                  Manage This Listing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white text-slate-900 hover:bg-slate-50"
                  asChild
                >
                  <Link href={`/manage-item?id=${item?.id}&tab=edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Item Details
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white text-slate-900 hover:bg-slate-50"
                  asChild
                >
                  <Link href={`/manage-item?id=${item?.id}&tab=availability`}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Manage Availability
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white text-slate-900 hover:bg-slate-50"
                  asChild
                >
                  <Link href={`/manage-item?id=${item?.id}&tab=analytics`}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
                <div className="pt-2 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Listing
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-red-600 text-white border-red-700 hover:bg-red-700"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                        // TODO: Implement delete functionality
                        alert('Delete functionality not yet implemented');
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Item
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Items Section */}
        {item && item.category && (
          <SimilarItems currentItem={{
            ...item,
            category: item.category,
            availability: item.availability ?? true
          }} />
        )}

        {/* Promote Dialog */}
        <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Promote Your Item
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600">
                Boost your listing visibility and get more bookings! Payment will be processed securely through Stripe.
              </p>

              <div>
                <Label>Promotion Type</Label>
                <Select value={promotionType} onValueChange={setPromotionType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured - $5/day</SelectItem>
                    <SelectItem value="homepage">Homepage Banner - $10/day</SelectItem>
                    <SelectItem value="category">Category Top - $3/day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={promotionDays}
                  onChange={(e) => setPromotionDays(parseInt(e.target.value) || 1)}
                  className="mt-2"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-900">Total Cost:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    ${((promotionType === 'featured' ? 5 : promotionType === 'homepage' ? 10 : 3) * promotionDays).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 border-t border-purple-200 pt-3">
                  <p>💳 <strong>Secure payment via Stripe</strong></p>
                  <p>✨ <strong>Featured:</strong> Appears in "Featured Items" section</p>
                  <p>🏠 <strong>Homepage:</strong> Top banner on homepage</p>
                  <p>📂 <strong>Category Top:</strong> First in category pages</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePromote} 
                disabled={isPromoting} 
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isPromoting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
