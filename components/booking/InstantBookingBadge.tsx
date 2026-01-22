"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

interface Item {
  id: string;
  instant_booking?: boolean;
  [key: string]: any;
}

interface InstantBookingBadgeProps {
  item: Item;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

export default function InstantBookingBadge({ item, size = 'default', className }: InstantBookingBadgeProps) {
  if (!item?.instant_booking) return null;

  const sizeClasses = {
    small: 'text-[10px] px-1.5 py-0.5',
    default: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-1.5'
  };

  return (
    <Badge className={`bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 ${sizeClasses[size]}`}>
      <Zap className={size === 'small' ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1'} />
      Instant Book
    </Badge>
  );
}