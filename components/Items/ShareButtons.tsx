'use client'


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from '../ui/use-toast';

interface ShareButtonsProps {
  item: {
    category: string;
    title: string;
    daily_rate: number;
    location?: string;
  };
  itemUrl: string;
  className?: string;
}

export default function ShareButtons({ item, itemUrl, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const locationText = item.location ? ` in ${item.location}` : '';
  const shareText = `Check out this ${item.category}: ${item.title} - Available for rent at $${item.daily_rate}/day${locationText}`;
  const fullUrl = `${window.location.origin}${itemUrl}`;

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${fullUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy the text and link
    const instagramText = `${shareText}\n\n${fullUrl}`;
    navigator.clipboard.writeText(instagramText).then(() => {
      alert('Link and text copied! You can now paste this in your Instagram story or post.');
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Show toast if available, otherwise fallback to no notification
      if (toast) { // Check if toast function is available
        toast({
          title: "Link copied!",
          description: "The item link has been copied to your clipboard."
        });
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-3 h-3 text-white" />
            </div>
            WhatsApp
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleFacebookShare} className="cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              f
            </div>
            Facebook
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleInstagramShare} className="cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              @
            </div>
            Instagram
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          <div className="flex items-center gap-3">
            {copied ?
            <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </> :

            <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            }
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
