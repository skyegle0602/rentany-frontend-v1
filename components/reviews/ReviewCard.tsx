'use client'

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { api, type UserData } from '@/lib/api-client';

interface ReviewCardProps {
  review: {
    reviewer_email: string;
    rating: number;
    comment: string;
    created_date: string;
    review_type: 'for_owner' | 'for_renter';
    images?: string[];
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [reviewer, setReviewer] = useState<UserData | null>(null);

  useEffect(() => {
    const loadReviewer = async () => {
      if (!review.reviewer_email) return;
      
      try {
        // Get user by email - using a generic request since there's no specific endpoint
        const response = await api.request<UserData>(`/users/by-email?email=${encodeURIComponent(review.reviewer_email)}`);
        if (response.success && response.data) {
          setReviewer(response.data);
        }
      } catch (error) {
        console.error("Error loading reviewer:", error);
      }
    };
    loadReviewer();
  }, [review.reviewer_email]);

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {reviewer?.username ? (
            <Link href={`/public-profile?username=${reviewer.username}`} className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-slate-300 transition-all">
                {reviewer?.profile_picture ? (
                  <img src={reviewer.profile_picture} alt={reviewer.full_name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-slate-600" />
                )}
              </div>
            </Link>
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {reviewer?.profile_picture ? (
                <img src={reviewer.profile_picture} alt={reviewer.full_name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-6 h-6 text-slate-600" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div>
                <p className="font-semibold text-slate-900">{reviewer?.full_name || "A user"}</p>
                {reviewer?.username && (
                  <Link 
                    href={`/public-profile?username=${reviewer.username}`}
                    className="text-sm text-slate-600 hover:underline hover:text-slate-900"
                  >
                    @{reviewer.username}
                  </Link>
                )}
              </div>
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {review.review_type === 'for_owner' ? 'As Owner' : 'As Renter'}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'
                  }`}
                />
              ))}
              <span className="text-sm text-slate-500 ml-2">
                {format(new Date(review.created_date), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-slate-700 mb-4 leading-relaxed">{review.comment}</p>
        
        {review.images && review.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {review.images.map((image, index) => (
              <img 
                key={index}
                src={image} 
                alt={`Review ${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}