"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, Play, Zap } from "lucide-react";
import Link from "next/link";
import { createPageUrl } from "@/lib/utils";
import FavoriteButton from '../favorites/FavoriteButton';
import { optimizeCardImage } from '../utils/imageOptimizer';
import { useLanguage } from '../language/LanguageContext';

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

const isVideoUrl = (url: any): boolean => typeof url === 'string' && /\.(mp4|mov|webm)$/i.test(url);

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  daily_rate: number;
  availability: boolean;
  instant_booking?: boolean;
  images?: string[];
  videos?: string[];
  view_count?: number;
  favorite_count?: number;
  created_date?: string;
  owner_id?: string;
  created_by?: string;
  [key: string]: any;
}

interface ItemCardProps {
  item: Item;
  userFavorites?: any[];
  currentUser?: any;
  onFavoriteChange?: () => void;
}

export default function ItemCard({ item, userFavorites = [], currentUser = null, onFavoriteChange }: ItemCardProps) {
  const { t } = useLanguage();
  const validVideos = (item.videos || []).filter(Boolean);
  const validImages = (item.images || []).filter(Boolean);

  // Debug: Log image URLs to help diagnose issues
  if (process.env.NODE_ENV === 'development') {
    if (validImages.length > 0) {
      console.log(`✅ Item ${item.id} (${item.title}) has ${validImages.length} image(s):`, validImages);
    } else {
      console.warn(`⚠️ Item ${item.id} (${item.title}) has NO images`);
      console.warn(`   Raw images array:`, item.images);
    }
  }

  // Get the first valid image or video from user uploads (NO placeholder fallback)
  const primaryMedia = validVideos[0] || validImages[0] || null;
  const isPrimaryMediaVideo = primaryMedia ? isVideoUrl(primaryMedia) : false;
  
  // Optimize image for card display (only if we have an actual image)
  const optimizedImage = primaryMedia && !isPrimaryMediaVideo 
    ? optimizeCardImage(primaryMedia) 
    : (primaryMedia || undefined);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white h-full flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          {primaryMedia ? (
            isPrimaryMediaVideo ? (
              <div className="relative">
                <video
                  src={primaryMedia}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                  onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                  controlsList="nodownload"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 text-slate-900 ml-0.5" />
                  </div>
                </div>
              </div>
            ) : optimizedImage ? (
              <img
                src={optimizedImage}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  // If image fails to load, hide it and show "No image" message
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent && !parent.querySelector('.no-image-message')) {
                    const messageDiv = document.createElement('div')
                    messageDiv.className = 'no-image-message w-full h-full bg-slate-200 flex items-center justify-center'
                    messageDiv.innerHTML = `
                      <div class="text-center p-4">
                        <p class="text-slate-500 text-sm">Image failed to load</p>
                      </div>
                    `
                    parent.appendChild(messageDiv)
                  }
                }}
              />
            ) : null
          ) : (
            // Show "No image" message if no images are available
            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-slate-500 text-sm">No image available</p>
                <p className="text-slate-400 text-xs mt-1">Please add an image</p>
              </div>
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge className={`${categoryColors[item.category] || categoryColors.other} border shadow-sm text-[10px] px-1.5 py-0.5`}>
              {item.category}
            </Badge>
            {item.instant_booking && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-sm text-[10px] px-1.5 py-0.5">
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                {t('item.instant')}
              </Badge>
            )}
            {validVideos.length > 0 && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 shadow-sm text-[10px] px-1.5 py-0.5">
                {t('item.video')}
              </Badge>
            )}
          </div>

          <div className="absolute top-2 right-2">
            <FavoriteButton
              itemId={item.id}
              userFavorites={userFavorites}
              currentUser={currentUser}
              onFavoriteChange={onFavoriteChange}
              size="sm"
            />
          </div>

          {!item.availability && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-[10px] font-semibold px-2 py-1">
                {t('item.notAvailable')}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-2 sm:p-3 flex-1 flex flex-col">
          <div className="flex-1 space-y-1 sm:space-y-2">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-tight">
              {item.title}
            </h3>

            <div className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium line-clamp-1">{item.location || 'Location not specified'}</span>
            </div>

            <div className="pt-1 sm:pt-2">
              <span className="text-sm sm:text-lg font-bold text-slate-900">
                ${item.daily_rate}
              </span>
              <span className="text-[10px] text-slate-500 ml-0.5">{t('item.perDay')}</span>
            </div>
          </div>

          <div className="mt-2">
            <Link 
              href={
                currentUser?.id === item.owner_id || 
                (currentUser?.emailAddresses?.[0]?.emailAddress === item.created_by)
                  ? `/manage-item?id=${item.id}`
                  : `/itemdetails?id=${item.id}`
              } 
              className="block"
            >
              <Button
                size="sm"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white transition-all duration-200 rounded-lg h-7 sm:h-8 text-[10px] sm:text-xs px-2"
              >
                <Eye className="w-3 h-3 mr-1" />
                {t('item.view')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
