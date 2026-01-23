'use client'


import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Upload, X, Plus, MapPin, DollarSign, Calendar, Check, Shield } from "lucide-react"; // Removed Sparkles
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPageUrl } from "@/lib/utils";
import MediaUploadZone from '@/components/media/MediaUploadZone';
import { geocodeLocation } from "@/lib/geocodeLocation";
// TODO: Implement detectFraud API endpoint
// import { detectFraud } from "@/functions/detectFraud";
// Removed generateAIDescription import
import VerificationPrompt from '@/components/verification/VerificationPrompt';
import { getCurrentUser, type UserData, api, redirectToSignIn } from "@/lib/api-client";

export default function AddItemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  // Removed isGeneratingDescription state
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    daily_rate: string;
    pricing_tiers: Array<{ days: number; price: number }>;
    deposit: string;
    condition: string;
    location: string;
    street_address: string;
    postcode: string;
    country: string;
    show_on_map: boolean;
    min_rental_days: string;
    max_rental_days: string;
    notice_period_hours: string;
    instant_booking: boolean;
    same_day_pickup: boolean;
    delivery_options: string[];
    delivery_fee: string;
    delivery_radius: string;
  }>({
    title: "",
    description: "",
    category: "",
    daily_rate: "",
    pricing_tiers: [],
    deposit: "",
    condition: "good",
    location: "",
    street_address: "",
    postcode: "",
    country: "",
    show_on_map: true,
    min_rental_days: "1",
    max_rental_days: "30",
    notice_period_hours: "24",
    instant_booking: false,
    same_day_pickup: false,
    delivery_options: ["pickup"],
    delivery_fee: "",
    delivery_radius: ""
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [newTier, setNewTier] = useState({ days: "", price: "" });

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to load current user:", error);
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Removed handleGenerateDescription function

  const handleDeliveryOptionToggle = (option: string) => {
    setFormData(prev => {
      const currentOptions = prev.delivery_options;
      if (currentOptions.includes(option)) {
        const newOptions = currentOptions.filter(opt => opt !== option);
        return {
          ...prev,
          delivery_options: newOptions.length > 0 ? newOptions : ["pickup"]
        };
      } else {
        return {
          ...prev,
          delivery_options: [...currentOptions, option]
        };
      }
    });
  };

  const addPricingTier = () => {
    if (!newTier.days || !newTier.price) {
      alert("Please enter both days and price for the tier.");
      return;
    }

    const days = parseInt(newTier.days);
    const price = parseFloat(newTier.price);

    if (isNaN(days) || isNaN(price) || days <= 0 || price <= 0) {
      alert("Days and price must be positive numbers.");
      return;
    }

    if (formData.pricing_tiers.some(tier => tier.days === days)) {
      alert("A pricing tier for this duration already exists!");
      return;
    }

    setFormData((prev: typeof formData) => ({
      ...prev,
      pricing_tiers: [...prev.pricing_tiers, { days, price }].sort((a: { days: number},  b: { days: number}) => a.days - b.days)
    }));

    setNewTier({ days: "", price: "" });
  };

  const removePricingTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pricing_tiers: prev.pricing_tiers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let fraudCheckPassed = true;
      // TODO: Implement fraud detection API endpoint
      // try {
      //   const fraudResult = await detectFraud({
      //     item_id: null,
      //     images: uploadedImages,
      //     title: formData.title,
      //     description: formData.description,
      //     daily_rate: parseFloat(formData.daily_rate),
      //     category: formData.category
      //   });
      //
      //   if (fraudResult.data?.requires_review) {
      //     alert(`⚠️ Your listing has been flagged for review.\n\nReason: ${fraudResult.data.indicators.map(i => i.description).join(', ')}\n\nOur team will review it shortly. You'll be notified once it's approved.`);
      //     fraudCheckPassed = false;
      //   }
      //
      //   if (fraudResult.data?.is_stock_photo && !fraudResult.data.requires_review) {
      //     const proceed = confirm("⚠️ Our system detected that your photos might be stock images.\n\nFor the best experience, we recommend using your own photos of the actual item.\n\nDo you want to continue anyway?");
      //     if (!proceed) {
      //       setIsSubmitting(false);
      //       return;
      //     }
      //   }
      // } catch (fraudError) {
      //   console.error("Fraud detection error:", fraudError);
      // }

      let coordinates: { lat: number | null; lng: number | null } = { lat: null, lng: null };
      if (formData.show_on_map && formData.location) {
        setIsGeocodingLocation(true);
        try {
          let fullAddress = formData.location;
          if (formData.street_address) fullAddress = formData.street_address + ", " + fullAddress;
          if (formData.postcode) fullAddress += ", " + formData.postcode;
          if (formData.country) fullAddress += ", " + fullAddress;

          const geoResult = await geocodeLocation({ location: fullAddress });
          if (geoResult.success && geoResult.data && geoResult.data.lat && geoResult.data.lng) {
            coordinates = {
              lat: geoResult.data.lat,
              lng: geoResult.data.lng
            };
          } else {
            console.warn("Geocoding returned no valid coordinates for:", fullAddress, geoResult.error);
          }
        } catch (geoError) {
          console.error("Geocoding failed:", geoError);
        } finally {
          setIsGeocodingLocation(false);
        }
      }

      const newItemResponse = await api.createItem({
        ...formData,
        daily_rate: parseFloat(formData.daily_rate),
        pricing_tiers: formData.pricing_tiers.length > 0 ? formData.pricing_tiers : undefined,
        deposit: parseFloat(formData.deposit) || 0,
        min_rental_days: parseInt(formData.min_rental_days),
        max_rental_days: parseInt(formData.max_rental_days),
        notice_period_hours: parseInt(formData.notice_period_hours),
        instant_booking: formData.instant_booking,
        same_day_pickup: formData.same_day_pickup,
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        delivery_radius: parseFloat(formData.delivery_radius) || null,
        lat: coordinates.lat,
        lng: coordinates.lng,
        images: uploadedImages,
        videos: uploadedVideos,
        availability: fraudCheckPassed
      });

      if (!newItemResponse.success || !newItemResponse.data) {
        throw new Error(newItemResponse.error || 'Failed to create item');
      }

      const newItem = newItemResponse.data;

      // TODO: Implement post-creation fraud detection
      // if (!fraudCheckPassed) {
      //   try {
      //     await detectFraud({
      //       item_id: newItem.id,
      //       images: uploadedImages,
      //       title: formData.title,
      //       description: formData.description,
      //       daily_rate: parseFloat(formData.daily_rate),
      //       category: formData.category
      //     });
      //   } catch (error) {
      //     console.error("Post-creation fraud detection error:", error);
      //   }
      // }

      router.push(fraudCheckPassed ? createPageUrl("Home") : createPageUrl("Profile"));
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Basic Info", icon: Plus },
    { number: 2, title: "Media", icon: Upload },
    { number: 3, title: "Pricing & Rules", icon: DollarSign },
  ];

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-6 sm:p-8 text-center max-w-md w-full">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Sign in to list items</h2>
          <Button onClick={() => redirectToSignIn()} className="w-full bg-slate-900 hover:bg-slate-800">
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (user.role !== 'admin' && user.verification_status !== 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="p-6 sm:p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Payment Connection Required</h2>
            <p className="text-slate-600 text-sm mb-4">
              To maintain a safe marketplace, you must connect your payment account before listing items.
            </p>
          </div>
          <VerificationPrompt 
            currentUser={user}
            message="Complete payment connection to start listing your items"
          />
          <div className="mt-4 text-center">
            <Link href={createPageUrl("Profile")}>
              <Button variant="outline" className="w-full">
                Go to Profile
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">List Your Item</h1>
              <p className="text-slate-600">Share your items with the community and start earning</p>
            </div>
            {user?.verification_status === 'verified' && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex justify-center">
            <div className="flex items-center space-x-8">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center gap-3 ${currentStep >= step.number ? 'text-slate-900' : 'text-slate-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      currentStep >= step.number
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {currentStep > step.number ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="font-medium hidden sm:block">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${currentStep > step.number ? 'bg-slate-900' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 pb-6">
            <CardTitle className="text-xl font-bold text-slate-900">
              {currentStep === 1 && "Tell us about your item"}
              {currentStep === 2 && "Add photos and videos"}
              {currentStep === 3 && "Set pricing and booking rules"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="title" className="text-sm font-semibold text-slate-700">Item Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="e.g., Canon EOS R5 Camera"
                        className="mt-2 h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe your item in detail..."
                        rows={4}
                        className="mt-2 border-slate-200 focus:border-slate-400 rounded-xl resize-none" // Removed pr-32
                        required
                      />
                      {/* Removed AI description generation button */}
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-sm font-semibold text-slate-700">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="mt-2 h-12 border-slate-200 rounded-xl">
                          <SelectValue placeholder="Choose a category" />
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

                    <div>
                      <Label htmlFor="condition" className="text-sm font-semibold text-slate-700">Condition</Label>
                      <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                        <SelectTrigger className="mt-2 h-12 border-slate-200 rounded-xl">
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

                    <div className="md:col-span-2">
                      <Label htmlFor="location" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location (City/Neighborhood)
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="e.g., Downtown Brooklyn, New York"
                        className="mt-2 h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                        required
                      />
                    </div>

                    <div className="md:col-span-2 border-t border-slate-200 pt-4">
                      <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                        Detailed Address (Optional & Private)
                      </Label>
                      <p className="text-xs text-slate-500 mb-4">
                        This information is private and will only be shared with confirmed renters
                      </p>

                      <div className="space-y-4">
                        <Input
                          id="street_address"
                          value={formData.street_address}
                          onChange={(e) => handleInputChange('street_address', e.target.value)}
                          placeholder="Street address (optional)"
                          className="h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            id="postcode"
                            value={formData.postcode}
                            onChange={(e) => handleInputChange('postcode', e.target.value)}
                            placeholder="Postal/ZIP code (optional)"
                            className="h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                          />

                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            placeholder="Country (optional)"
                            className="h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                          />
                        </div>

                        <div className="flex items-center space-x-3 bg-slate-50 rounded-xl p-4">
                          <input
                            type="checkbox"
                            id="show_on_map"
                            checked={formData.show_on_map}
                            onChange={(e) => handleInputChange('show_on_map', e.target.checked)}
                            className="w-4 h-4 text-slate-600 bg-gray-100 border-gray-300 rounded focus:ring-slate-500 focus:ring-2"
                          />
                          <label htmlFor="show_on_map" className="text-sm font-medium text-slate-900">
                            Show this item on the interactive map
                          </label>
                        </div>
                        {!formData.show_on_map && (
                          <p className="text-xs text-slate-500 pl-7">
                            Your item will still appear in search results, but won't be visible on the map view.
                            Coordinates will not be saved.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Media */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <MediaUploadZone
                    uploadedImages={uploadedImages}
                    setUploadedImages={setUploadedImages}
                    uploadedVideos={uploadedVideos}
                    setUploadedVideos={setUploadedVideos}
                    uploadingFiles={uploadingFiles}
                    setUploadingFiles={setUploadingFiles}
                  />
                </motion.div>
              )}

              {/* Step 3: Pricing & Booking Rules */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Pricing Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="daily_rate" className="text-sm font-semibold text-slate-700">Daily Rate ($)</Label>
                      <Input
                        id="daily_rate"
                        type="number"
                        step="0.01"
                        value={formData.daily_rate}
                        onChange={(e) => handleInputChange('daily_rate', e.target.value)}
                        placeholder="25.00"
                        className="mt-2 h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">Default price per day</p>
                    </div>

                    <div>
                      <Label htmlFor="deposit" className="text-sm font-semibold text-slate-700">Security Deposit ($)</Label>
                      <Input
                        id="deposit"
                        type="number"
                        step="0.01"
                        value={formData.deposit}
                        onChange={(e) => handleInputChange('deposit', e.target.value)}
                        placeholder="50.00"
                        className="mt-2 h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Tiered Pricing Section */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-sm font-semibold text-slate-900">Tiered Pricing (Optional)</Label>
                        <p className="text-xs text-slate-600 mt-1">Offer discounts for longer rentals (e.g., 7 days for $150)</p>
                      </div>
                    </div>

                    {formData.pricing_tiers.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formData.pricing_tiers.map((tier, index) => (
                          <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
                            <span className="font-medium text-slate-900">
                              For {tier.days} {tier.days === 1 ? 'day' : 'days'}: ${tier.price.toFixed(2)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePricingTier(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        placeholder="Days (e.g., 7)"
                        value={newTier.days}
                        onChange={(e) => setNewTier(prev => ({ ...prev, days: e.target.value }))}
                        className="h-10 border-slate-200 focus:border-slate-400 rounded-xl"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price (e.g., 150.00)"
                        value={newTier.price}
                        onChange={(e) => setNewTier(prev => ({ ...prev, price: e.target.value }))}
                        className="h-10 border-slate-200 focus:border-slate-400 rounded-xl"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addPricingTier}
                      variant="outline"
                      className="w-full mt-3 border-blue-300 text-blue-700 hover:bg-blue-100 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Pricing Tier
                    </Button>
                  </div>

                  {/* Booking Rules Section */}
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Booking Rules
                        </Label>
                        <p className="text-xs text-slate-600 mt-1">Set your rental requirements and preferences</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="min_rental_days" className="text-sm font-semibold text-slate-700">Minimum Days</Label>
                          <Input
                            id="min_rental_days"
                            type="number"
                            min="1"
                            value={formData.min_rental_days}
                            onChange={(e) => handleInputChange('min_rental_days', e.target.value)}
                            className="mt-2 h-10 border-slate-200 focus:border-slate-400 rounded-xl"
                          />
                        </div>

                        <div>
                          <Label htmlFor="max_rental_days" className="text-sm font-semibold text-slate-700">Maximum Days</Label>
                          <Input
                            id="max_rental_days"
                            type="number"
                            min="1"
                            value={formData.max_rental_days}
                            onChange={(e) => handleInputChange('max_rental_days', e.target.value)}
                            className="mt-2 h-10 border-slate-200 focus:border-slate-400 rounded-xl"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notice_period_hours" className="text-sm font-semibold text-slate-700">Notice Period (hours)</Label>
                          <Input
                            id="notice_period_hours"
                            type="number"
                            min="0"
                            step="1"
                            value={formData.notice_period_hours}
                            onChange={(e) => handleInputChange('notice_period_hours', e.target.value)}
                            className="mt-2 h-10 border-slate-200 focus:border-slate-400 rounded-xl"
                          />
                          <p className="text-xs text-slate-500 mt-1">Hours before pickup</p>
                        </div>
                      </div>

                      <div className="space-y-3 bg-white rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium text-slate-900">Instant Booking</Label>
                            <p className="text-xs text-slate-600">Allow renters to book without your approval</p>
                          </div>
                          <input
                            type="checkbox"
                            id="instant_booking"
                            checked={formData.instant_booking}
                            onChange={(e) => handleInputChange('instant_booking', e.target.checked)}
                            className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                          <div>
                            <Label className="text-sm font-medium text-slate-900">Same-Day Pickup</Label>
                            <p className="text-xs text-slate-600">Allow pickup on the same day as booking</p>
                          </div>
                          <input
                            type="checkbox"
                            id="same_day_pickup"
                            checked={formData.same_day_pickup}
                            onChange={(e) => handleInputChange('same_day_pickup', e.target.checked)}
                            className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Options */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-slate-700">Delivery Options</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="pickup"
                          checked={formData.delivery_options.includes("pickup")}
                          onChange={() => handleDeliveryOptionToggle("pickup")}
                          className="w-4 h-4 text-slate-600 bg-gray-100 border-gray-300 rounded focus:ring-slate-500 focus:ring-2"
                        />
                        <label htmlFor="pickup" className="text-sm font-medium text-slate-900">
                          Pickup at location
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="delivery"
                          checked={formData.delivery_options.includes("delivery")}
                          onChange={() => handleDeliveryOptionToggle("delivery")}
                          className="w-4 h-4 text-slate-600 bg-gray-100 border-gray-300 rounded focus:ring-slate-500 focus:ring-2"
                        />
                        <label htmlFor="delivery" className="text-sm font-medium text-slate-900">
                          Delivery to renter
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Details - Only show if delivery is selected */}
                  {formData.delivery_options.includes("delivery") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 rounded-xl p-4">
                      <div>
                        <Label htmlFor="delivery_fee" className="text-sm font-semibold text-slate-700">Delivery Fee ($)</Label>
                        <Input
                          id="delivery_fee"
                          type="number"
                          step="0.01"
                          value={formData.delivery_fee}
                          onChange={(e) => handleInputChange('delivery_fee', e.target.value)}
                          placeholder="0.00"
                          className="mt-2 h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="delivery_radius" className="text-sm font-semibold text-slate-700">Max Delivery Distance (miles)</Label>
                        <Input
                          id="delivery_radius"
                          type="number"
                          step="0.1"
                          value={formData.delivery_radius}
                          onChange={(e) => handleInputChange('delivery_radius', e.target.value)}
                          placeholder="10"
                          className="mt-2 h-12 border-slate-200 focus:border-slate-400 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Pricing Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base daily rate:</span>
                        <span className="font-medium">${(parseFloat(formData.daily_rate) || 0).toFixed(2)}/day</span>
                      </div>
                      {formData.pricing_tiers.length > 0 && (
                        <div className="border-t border-slate-200 pt-2">
                          <span className="text-slate-600 text-xs">Special pricing tiers:</span>
                          {formData.pricing_tiers.map((tier, index) => (
                            <div key={index} className="flex justify-between mt-1">
                              <span className="text-slate-600">{tier.days} days:</span>
                              <span className="font-medium">${tier.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-600">Security deposit:</span>
                        <span className="font-medium">${(parseFloat(formData.deposit) || 0).toFixed(2)}</span>
                      </div>
                      {formData.delivery_options.includes("delivery") && parseFloat(formData.delivery_fee) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Delivery fee:</span>
                          <span className="font-medium">${(parseFloat(formData.delivery_fee) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {formData.pricing_tiers.length === 0 && (
                        <div className="flex justify-between border-t border-slate-200 pt-2">
                          <span className="text-slate-600">Weekly estimate (base rate):</span>
                          <span className="font-semibold">${((parseFloat(formData.daily_rate) || 0) * 7).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-slate-100">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-6 h-12 rounded-xl border-slate-200 hover:bg-slate-50"
                  >
                    Previous
                  </Button>
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="ml-auto px-6 h-12 bg-slate-900 hover:bg-slate-800 rounded-xl"
                    disabled={
                      (currentStep === 1 && (!formData.title || !formData.description || !formData.category || !formData.location)) ||
                      (currentStep === 2 && uploadedImages.length === 0 && uploadedVideos.length === 0)
                      // Removed isGeneratingDescription from disabled condition
                    }
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || isGeocodingLocation || !formData.daily_rate}
                    className="ml-auto px-8 h-12 bg-green-600 hover:bg-green-700 rounded-xl"
                  >
                    {isSubmitting || isGeocodingLocation ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        {isGeocodingLocation ? 'Getting location...' : 'Publishing...'}
                      </>
                    ) : (
                      'List Item'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
