'use client'

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search,
  MapPin,
  Grid3X3,
  Map,
  X,
  SlidersHorizontal,
  DollarSign,
  Calendar,
  Star,
  Navigation,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from '@/components/language/LanguageContext';

// Type definitions
interface Category {
  value: string;
  label: string;
}

interface PriceRange {
  min: string;
  max: string;
}

interface DistanceFilter {
  enabled: boolean;
  maxDistance: number;
  centerLocation: string;
}

interface DateFilter {
  enabled: boolean;
  start_date: string;
  end_date: string;
}

interface RatingFilter {
  enabled: boolean;
  min_rating: number;
}

type ViewType = "list" | "map";
type SortByType = "relevance" | "price_low" | "price_high" | "rating" | "newest" | "popular";
type AvailabilityFilterType = "all" | "available" | "unavailable";
type CategoryValue = "all" | "electronics" | "tools" | "fashion" | "sports" | "vehicles" | "home" | "books" | "music" | "photography" | "other";

interface ItemFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  selectedCategory: CategoryValue;
  setSelectedCategory: (value: CategoryValue) => void;
  priceRange: PriceRange;
  setPriceRange: (value: PriceRange | ((prev: PriceRange) => PriceRange)) => void;
  availabilityFilter: AvailabilityFilterType;
  setAvailabilityFilter: (value: AvailabilityFilterType) => void;
  distanceFilter: DistanceFilter;
  setDistanceFilter: (value: DistanceFilter | ((prev: DistanceFilter) => DistanceFilter)) => void;
  dateFilter: DateFilter;
  setDateFilter: (value: DateFilter | ((prev: DateFilter) => DateFilter)) => void;
  ratingFilter: RatingFilter;
  setRatingFilter: (value: RatingFilter | ((prev: RatingFilter) => RatingFilter)) => void;
  sortBy?: SortByType;
  setSortBy?: (value: SortByType) => void;
  locationError?: string | null;
  view: ViewType;
  setView: (value: ViewType) => void;
}

const getCategories = (t: (keyPath: string) => string): Category[] => [
  { value: "all", label: t('categories.all') },
  { value: "electronics", label: t('categories.electronics') },
  { value: "tools", label: t('categories.tools') },
  { value: "fashion", label: t('categories.fashion') },
  { value: "sports", label: t('categories.sports') },
  { value: "vehicles", label: t('categories.vehicles') },
  { value: "home", label: t('categories.home') },
  { value: "books", label: t('categories.books') },
  { value: "music", label: t('categories.music') },
  { value: "photography", label: t('categories.photography') },
  { value: "other", label: t('categories.other') },
];

export default function ItemFilters({
  searchQuery,
  setSearchQuery,
  locationQuery,
  setLocationQuery,
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  availabilityFilter,
  setAvailabilityFilter,
  distanceFilter,
  setDistanceFilter,
  dateFilter,
  setDateFilter,
  ratingFilter,
  setRatingFilter,
  sortBy,
  setSortBy,
  locationError,
  view,
  setView
}: ItemFiltersProps) {
  const { t } = useLanguage();
  const categories = getCategories(t);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const activeFiltersCount = [
    searchQuery,
    locationQuery,
    selectedCategory !== "all",
    priceRange.min || priceRange.max,
    availabilityFilter !== "all",
    distanceFilter.enabled,
    dateFilter.enabled,
    ratingFilter.enabled
  ].filter(Boolean).length;

  const clearAllFilters = (): void => {
    setSearchQuery("");
    setLocationQuery("");
    setSelectedCategory("all");
    setPriceRange({ min: "", max: "" });
    setAvailabilityFilter("all");
    setDistanceFilter({ enabled: false, maxDistance: 10, centerLocation: "" });
    setDateFilter({ enabled: false, start_date: "", end_date: "" });
    setRatingFilter({ enabled: false, min_rating: 4 });
    if (setSortBy) setSortBy("relevance");
  };

  // When location query changes, update distance filter location if distance is enabled
  const handleLocationQueryChange = (value: string): void => {
    setLocationQuery(value);
    if (distanceFilter.enabled) {
      setDistanceFilter(prev => ({ ...prev, centerLocation: value }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={t('filters.searchItems')}
            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-slate-400"
          />
        </div>

        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={locationQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocationQueryChange(e.target.value)}
            placeholder={t('filters.location') + '...'}
            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-slate-400"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48 h-12 rounded-xl border-slate-200">
            <SelectValue placeholder={t('filters.category')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Filters & Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Advanced Filters Toggle */}
        <Sheet open={showAdvanced} onOpenChange={setShowAdvanced}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              {t('filters.advancedFilters')}
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 bg-blue-600 text-white">{activeFiltersCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('filters.advancedFilters')}</SheetTitle>
              <SheetDescription>
                {t('filters.advancedFilters')}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Price Range */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" />
                  {t('filters.priceRange')} ($/day)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder={t('filters.minPrice')}
                    value={priceRange.min}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="h-10"
                  />
                  <Input
                    type="number"
                    placeholder={t('filters.maxPrice')}
                    value={priceRange.max}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <Label className="mb-3 block">{t('filters.availability')}</Label>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('home.allItems')}</SelectItem>
                    <SelectItem value="available">{t('filters.available')}</SelectItem>
                    <SelectItem value="unavailable">{t('filters.unavailable')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('filters.dateRange')}
                  </Label>
                  <input
                    type="checkbox"
                    checked={dateFilter.enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </div>
                {dateFilter.enabled && (
                  <div className="space-y-3">
                    <Input
                      type="date"
                      value={dateFilter.start_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(prev => ({ ...prev, start_date: e.target.value }))}
                      className="h-10"
                    />
                    <Input
                      type="date"
                      value={dateFilter.end_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(prev => ({ ...prev, end_date: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                )}
              </div>

              {/* Distance Filter */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    {t('filters.distance')}
                  </Label>
                  <input
                    type="checkbox"
                    checked={distanceFilter.enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const enabled = e.target.checked;
                      setDistanceFilter(prev => ({
                        ...prev,
                        enabled,
                        centerLocation: enabled && locationQuery ? locationQuery : prev.centerLocation
                      }));
                    }}
                    className="w-4 h-4"
                  />
                </div>
                {distanceFilter.enabled && (
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter location (e.g., New York, NY)"
                      value={distanceFilter.centerLocation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDistanceFilter(prev => ({ ...prev, centerLocation: e.target.value }))}
                      className="h-10"
                    />
                    <p className="text-xs text-slate-500">
                      💡 Tip: Leave blank to use the main location search above
                    </p>
                    <div>
                      <Label className="text-sm mb-2 block">Max Distance: {distanceFilter.maxDistance} miles</Label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={distanceFilter.maxDistance}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDistanceFilter(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                    {locationError && (
                      <p className="text-sm text-red-600">{locationError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Owner Rating Filter */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {t('filters.rating')}
                  </Label>
                  <input
                    type="checkbox"
                    checked={ratingFilter.enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRatingFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </div>
                {ratingFilter.enabled && (
                  <div>
                    <Label className="text-sm mb-2 block">Minimum: {ratingFilter.min_rating} stars</Label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={ratingFilter.min_rating}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRatingFilter(prev => ({ ...prev, min_rating: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Clear Filters Button */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('filters.clearFilters')}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Sort By */}
        {setSortBy && (
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <div className="flex items-center gap-2 bg-grey-500">
                <ArrowUpDown className="w-4 h-4" />
                <SelectValue placeholder={t('filters.sortBy')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">{t('filters.relevance')}</SelectItem>
              <SelectItem value="price_low">{t('filters.priceLowHigh')}</SelectItem>
              <SelectItem value="price_high">{t('filters.priceHighLow')}</SelectItem>
              <SelectItem value="rating">{t('filters.topRated')}</SelectItem>
              <SelectItem value="newest">{t('filters.newest')}</SelectItem>
              <SelectItem value="popular">{t('filters.mostPopular')}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            className="px-3"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={view === "map" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("map")}
            className="px-3"
          >
            <Map className="w-4 h-4" />
          </Button>
        </div>

        {/* Clear All Filters (Quick Access) */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-4 h-4 mr-1" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filters Pills */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {locationQuery && (
              <Badge variant="secondary" className="gap-1">
                Location: {locationQuery}
                <button onClick={() => setLocationQuery("")} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {categories.find(c => c.value === selectedCategory)?.label}
                <button onClick={() => setSelectedCategory("all")} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {(priceRange.min || priceRange.max) && (
              <Badge variant="secondary" className="gap-1">
                ${priceRange.min || "0"} - ${priceRange.max || "∞"}
                <button onClick={() => setPriceRange({ min: "", max: "" })} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {availabilityFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {t('filters.availability')}: {availabilityFilter === "available" ? t('filters.available') : t('filters.unavailable')}
                <button onClick={() => setAvailabilityFilter("all")} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {distanceFilter.enabled && (
              <Badge variant="secondary" className="gap-1">
                Within {distanceFilter.maxDistance}mi
                {distanceFilter.centerLocation && ` of ${distanceFilter.centerLocation}`}
                <button onClick={() => setDistanceFilter({ enabled: false, maxDistance: 10, centerLocation: "" })} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {dateFilter.enabled && (
              <Badge variant="secondary" className="gap-1">
                Dates: {dateFilter.start_date} to {dateFilter.end_date}
                <button onClick={() => setDateFilter({ enabled: false, start_date: "", end_date: "" })} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {ratingFilter.enabled && (
              <Badge variant="secondary" className="gap-1">
                ⭐ {ratingFilter.min_rating}+ stars
                <button onClick={() => setRatingFilter({ enabled: false, min_rating: 4 })} className="ml-1 hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
