"use client";

import { useState } from "react";
import Link from "next/link";
import HowItWorks from "@/components/home/HowItWorks";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import RecommendedItems from "@/components/home/RecommendedItems";
import AIIItems from "@/components/home/AIIItems";
import Testerminal from "@/components/home/Testerminal";
import TrustBadges from "@/components/home/TrustBadge";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language/LanguageContext";

// Dynamically import ItemFilters to avoid SSR hydration issues with Radix UI Select
const ItemFilters = dynamic(() => import("@/components/items/ItemFilters"), {
  ssr: false,
  loading: () => (
    <div className="bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  ),
});

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading map...</p>
      </div>
    </div>
  ),
});

type CategoryValue = "all" | "electronics" | "tools" | "fashion" | "sports" | "vehicles" | "home" | "books" | "music" | "photography" | "other";
type SortByType = "relevance" | "price_low" | "price_high" | "rating" | "newest" | "popular";
type AvailabilityFilterType = "all" | "available" | "unavailable";
type ViewType = "list" | "map";

export default function HomeContent() {
  const { t } = useLanguage();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locationQuery, setLocationQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilterType>("all");
  const [distanceFilter, setDistanceFilter] = useState<{ enabled: boolean; maxDistance: number; centerLocation: string }>({
    enabled: false,
    maxDistance: 10,
    centerLocation: ""
  });
  const [dateFilter, setDateFilter] = useState<{ enabled: boolean; start_date: string; end_date: string }>({
    enabled: false,
    start_date: "",
    end_date: ""
  });
  const [ratingFilter, setRatingFilter] = useState<{ enabled: boolean; min_rating: number }>({
    enabled: false,
    min_rating: 4
  });
  const [sortBy, setSortBy] = useState<SortByType>("relevance");
  const [view, setView] = useState<ViewType>("list");
  const [locationError, setLocationError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dark Section - Hero */}
      <div className="flex-1 bg-[#1A1E28] flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            {t('home.heroTitle')}
          </h1>

          {/* Sub-headline with colored text */}
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            {(() => {
              const highlight = t('home.heroHighlight');
              const parts = highlight.split('. ');
              return (
                <>
                  <span className="text-[#F78B5D]">{parts[0]}.</span>{" "}
                  <span className="text-[#E76F7F]">{parts[1] || ''}</span>
                </>
              );
            })()}
          </h2>

          {/* Descriptive Paragraph */}
          <p className="text-lg md:text-xl text-white mb-12 max-w-2xl mx-auto">
            {t('home.heroSubtitle')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {/* Left Button - 3 items available */}
            <button className="flex items-center justify-center gap-3 px-6 py-4 bg-[#333741] border border-white rounded-lg hover:bg-[#3d4451] transition-colors">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              <span className="text-white font-medium">3 {t('home.itemsAvailable')}</span>
            </button>

            {/* Right Button - Growing community */}
            <button className="flex items-center justify-center gap-3 px-6 py-4 bg-[#333741] border border-white rounded-lg hover:bg-[#3d4451] transition-colors">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <span className="text-white font-medium">{t('home.growingCommunity')}</span>
            </button>
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-center gap-2 text-sm text-white">
            <Link
              href="/privacy-policy"
              className="hover:text-gray-300 transition-colors"
            >
              {t('common.privacyPolicy')}
            </Link>
            <span className="text-white">•</span>
            <Link
              href="/contact"
              className="hover:text-gray-300 transition-colors"
            >
              {t('common.contactUs')}
            </Link>
          </div>
        </div>
      </div>

      {/* Trust Badges Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TrustBadges />
        </div>
      </div>

      {/* Map or List View */}
      {view === "map" ? (
        <div className="bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ItemFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              locationQuery={locationQuery}
              setLocationQuery={setLocationQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              availabilityFilter={availabilityFilter}
              setAvailabilityFilter={setAvailabilityFilter}
              distanceFilter={distanceFilter}
              setDistanceFilter={setDistanceFilter}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              ratingFilter={ratingFilter}
              setRatingFilter={setRatingFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              locationError={locationError}
              view={view}
              setView={setView}
            />
            <div className="mt-8">
              <MapView
                searchQuery={searchQuery}
                locationQuery={locationQuery}
                selectedCategory={selectedCategory}
                priceRange={priceRange}
                availabilityFilter={availabilityFilter}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Recently Viewed Section */}
          <RecentlyViewed />
          {/* Recommended Items Section */}
          <RecommendedItems />
          {/* Item Filters Section */}
          <div className="bg-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ItemFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                locationQuery={locationQuery}
                setLocationQuery={setLocationQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                availabilityFilter={availabilityFilter}
                setAvailabilityFilter={setAvailabilityFilter}
                distanceFilter={distanceFilter}
                setDistanceFilter={setDistanceFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                ratingFilter={ratingFilter}
                setRatingFilter={setRatingFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                locationError={locationError}
                view={view}
                setView={setView}
              />
            </div>
          </div>
          {/* All Items Section */}
          <AIIItems 
            searchQuery={searchQuery}
            locationQuery={locationQuery}
            selectedCategory={selectedCategory}
            priceRange={priceRange}
            availabilityFilter={availabilityFilter}
            sortBy={sortBy}
          />
        </>
      )}
      {/* How It Works Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HowItWorks />
        </div>
      </div>
      {/* Testerminal Section  */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Testerminal />
        </div>
      </div>

    </div>
  );
}
