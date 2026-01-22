'use client'


import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Check, Calendar, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from 'next/navigation';

// Type definitions
interface Item {
  id: string;
  title: string;
  description?: string;
  category?: string;
  daily_rate: number;
  deposit?: number;
  availability?: boolean;
  min_rental_days?: number;
  max_rental_days?: number;
  notice_period_hours?: number;
  instant_booking?: boolean;
  same_day_pickup?: boolean;
  images?: string[];
  created_by?: string;
  owner_id?: string;
  [key: string]: any;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BulkEditItemsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkChanges, setBulkChanges] = useState<{
    availability: boolean | null;
    min_rental_days: string;
    max_rental_days: string;
    notice_period_hours: string;
    instant_booking: boolean | null;
    same_day_pickup: boolean | null;
    daily_rate_multiplier: string;
    deposit: string;
  }>({
    availability: null,
    min_rental_days: "",
    max_rental_days: "",
    notice_period_hours: "",
    instant_booking: null,
    same_day_pickup: null,
    daily_rate_multiplier: "",
    deposit: ""
  });

  useEffect(() => {
    loadUserItems();
  }, []);

  const loadUserItems = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/profile');
        return;
      }
      setUser(currentUser);

      // Get owner ID (prefer clerk_id, fallback to id or email)
      const ownerId = currentUser.clerk_id || currentUser.id;
      if (!ownerId) {
        console.error('No owner ID found for current user');
        router.push('/profile');
        return;
      }

      const itemsResponse = await api.getItems({ owner_id: ownerId });
      if (itemsResponse.success && itemsResponse.data) {
        const allItems = Array.isArray(itemsResponse.data) ? itemsResponse.data : [];
        setItems(allItems);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      router.push('/profile');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to delete");
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    setShowDeleteDialog(false);

    try {
      // Delete all selected items
      for (const itemId of selectedItems) {
        const response = await api.request(`/items/${itemId}`, { method: 'DELETE' });
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete item');
        }
      }

      alert(`✅ Successfully deleted ${selectedItems.length} item(s)!`);
      
      // Reload items and clear selection
      await loadUserItems();
      setSelectedItems([]);
    } catch (error) {
      console.error("Error deleting items:", error);
      alert("Failed to delete some items. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to update");
      return;
    }

    const changesCount = Object.values(bulkChanges).filter(v => v !== null && v !== "").length;
    if (changesCount === 0) {
      alert("Please specify at least one change to apply");
      return;
    }

    if (!confirm(`Apply these changes to ${selectedItems.length} selected item(s)?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, any> = {};
      
      if (bulkChanges.availability !== null) {
        updates.availability = bulkChanges.availability;
      }
      if (bulkChanges.min_rental_days !== "") {
        updates.min_rental_days = parseInt(bulkChanges.min_rental_days);
      }
      if (bulkChanges.max_rental_days !== "") {
        updates.max_rental_days = parseInt(bulkChanges.max_rental_days);
      }
      if (bulkChanges.notice_period_hours !== "") {
        updates.notice_period_hours = parseInt(bulkChanges.notice_period_hours);
      }
      if (bulkChanges.instant_booking !== null) {
        updates.instant_booking = bulkChanges.instant_booking;
      }
      if (bulkChanges.same_day_pickup !== null) {
        updates.same_day_pickup = bulkChanges.same_day_pickup;
      }
      if (bulkChanges.deposit !== "") {
        updates.deposit = parseFloat(bulkChanges.deposit);
      }

      for (const itemId of selectedItems) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;
        
        const itemUpdates: Record<string, any> = { ...updates };
        
        // Handle rate multiplier
        if (bulkChanges.daily_rate_multiplier !== "") {
          const multiplier = parseFloat(bulkChanges.daily_rate_multiplier);
          itemUpdates.daily_rate = item.daily_rate * multiplier;
        }
        
        const response = await api.request(`/items/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify(itemUpdates)
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to update item');
        }
      }

      alert(`✅ Successfully updated ${selectedItems.length} item(s)!`);
      await loadUserItems();
      setSelectedItems([]);
      setBulkChanges({
        availability: null,
        min_rental_days: "",
        max_rental_days: "",
        notice_period_hours: "",
        instant_booking: null,
        same_day_pickup: null,
        daily_rate_multiplier: "",
        deposit: ""
      });
    } catch (error) {
      console.error("Error updating items:", error);
      alert("Failed to update items. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/profile')}
            className="w-12 h-12 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Bulk Edit Items</h1>
            <p className="text-slate-600">Select items and apply changes to multiple at once</p>
          </div>
          <Badge variant="secondary" className="text-lg">
            {selectedItems.length} / {items.length} selected
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Item Selection List */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Your Items</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={selectedItems.length === 0 || isDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedItems.length})
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedItems.includes(item.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        className="w-5 h-5"
                      />
                      
                      {item.images?.[0] && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            ${item.daily_rate}/day
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${item.availability ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}`}
                          >
                            {item.availability ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                      </div>

                      {selectedItems.includes(item.id) && (
                        <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      )}
                    </motion.div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No items yet</h3>
                      <p className="text-slate-600 text-sm">Create some items to use bulk editing</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Edit Options */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl sticky top-6">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Bulk Changes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Availability Status</Label>
                  <Select
                    value={bulkChanges.availability === null ? "none" : bulkChanges.availability.toString()}
                    onValueChange={(value) => 
                      setBulkChanges(prev => ({
                        ...prev,
                        availability: value === "none" ? null : value === "true"
                      }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="No change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No change</SelectItem>
                      <SelectItem value="true">Make Available</SelectItem>
                      <SelectItem value="false">Make Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Min Days</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="No change"
                      value={bulkChanges.min_rental_days}
                      onChange={(e) =>
                        setBulkChanges(prev => ({ ...prev, min_rental_days: e.target.value }))
                      }
                      className="mt-2 h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Max Days</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="No change"
                      value={bulkChanges.max_rental_days}
                      onChange={(e) =>
                        setBulkChanges(prev => ({ ...prev, max_rental_days: e.target.value }))
                      }
                      className="mt-2 h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Notice Period (hours)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="No change"
                    value={bulkChanges.notice_period_hours}
                    onChange={(e) =>
                      setBulkChanges(prev => ({ ...prev, notice_period_hours: e.target.value }))
                    }
                    className="mt-2 h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs">Price Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g., 1.2 for 20% increase"
                    value={bulkChanges.daily_rate_multiplier}
                    onChange={(e) =>
                      setBulkChanges(prev => ({ ...prev, daily_rate_multiplier: e.target.value }))
                    }
                    className="mt-2 h-9 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">1.0 = no change, 1.2 = +20%</p>
                </div>

                <div>
                  <Label className="text-xs">Security Deposit ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="No change"
                    value={bulkChanges.deposit}
                    onChange={(e) =>
                      setBulkChanges(prev => ({ ...prev, deposit: e.target.value }))
                    }
                    className="mt-2 h-9 text-sm"
                  />
                </div>

                <div className="space-y-3 bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Instant Booking</Label>
                    <Select
                      value={bulkChanges.instant_booking === null ? "none" : bulkChanges.instant_booking.toString()}
                      onValueChange={(value) =>
                        setBulkChanges(prev => ({
                          ...prev,
                          instant_booking: value === "none" ? null : value === "true"
                        }))
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="No change" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No change</SelectItem>
                        <SelectItem value="true">Enable</SelectItem>
                        <SelectItem value="false">Disable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Same-Day Pickup</Label>
                    <Select
                      value={bulkChanges.same_day_pickup === null ? "none" : bulkChanges.same_day_pickup.toString()}
                      onValueChange={(value) =>
                        setBulkChanges(prev => ({
                          ...prev,
                          same_day_pickup: value === "none" ? null : value === "true"
                        }))
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="No change" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No change</SelectItem>
                        <SelectItem value="true">Enable</SelectItem>
                        <SelectItem value="false">Disable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleBulkUpdate}
                  disabled={isSaving || selectedItems.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 h-11"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Apply to {selectedItems.length} Item(s)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete {selectedItems.length} Item(s)?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This will permanently delete the selected items and all associated data:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Item listings and photos</li>
                  <li>Rental history</li>
                  <li>Reviews and ratings</li>
                  <li>Availability calendars</li>
                </ul>
                <p className="font-semibold text-red-600">
                  This action cannot be undone!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete {selectedItems.length} Item(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
