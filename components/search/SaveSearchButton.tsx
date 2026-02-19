'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getCurrentUser, redirectToSignIn, type UserData } from '@/lib/api-client';
import { Bookmark } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface SaveSearchButtonProps {
  filters: {
    searchQuery?: string;
    locationQuery?: string;
    selectedCategory?: string;
    priceRange?: {
      min?: string;
      max?: string;
    };
    dateFilter?: any;
    ratingFilter?: any;
    sortBy?: string;
  };
}

export default function SaveSearchButton({ filters }: SaveSearchButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!searchName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your saved search",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        redirectToSignIn();
        return;
      }

      await api.createSavedSearch({
        name: searchName.trim(),
        filters: {
          category: filters.selectedCategory && filters.selectedCategory !== 'all' ? filters.selectedCategory : undefined,
          location: filters.locationQuery || undefined,
          min_price: filters.priceRange?.min ? parseFloat(filters.priceRange.min) : undefined,
          max_price: filters.priceRange?.max ? parseFloat(filters.priceRange.max) : undefined,
          search_query: filters.searchQuery || undefined,
        },
        notify_new_items: true, // Enable notifications by default
      });

      toast({
        title: "Success",
        description: "Search saved successfully! You'll receive notifications when new items match your criteria.",
      });

      setShowDialog(false);
      setSearchName("");
    } catch (error: any) {
      console.error("Error saving search:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="gap-2 h-12 rounded-xl"
      >
        <Bookmark className="w-4 h-4" />
        Save Search
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save This Search</DialogTitle>
            <DialogDescription>
              Give your search a name so you can easily find it later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSearch}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search-name">Search Name</Label>
                <Input
                  id="search-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="e.g., Weekend Camera Gear"
                  className="w-full"
                />
              </div>
              <p className="text-sm text-slate-600">
                You'll receive notifications when new items match your search criteria.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setSearchName("");
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !searchName.trim()}>
                {isSaving ? "Saving..." : "Save Search"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
