'use client'

import React, { useState, useEffect, useCallback } from 'react';
import ItemCard from '@/components/items/ItemCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Item {
  id: string;
  title: string;
  category: string;
  location?: string;
  daily_rate: number;
  availability: boolean;
  instant_booking?: boolean;
  images?: string[];
  videos?: string[];
  [key: string]: any;
}

interface SimilarItemsProps {
  currentItem: Item;
}

export default function SimilarItems({ currentItem }: SimilarItemsProps) {
  const [similarItems, setSimilarItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSimilarItems = useCallback(async () => {
    if (!currentItem) {
      setSimilarItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Mock data for similar items - replace with actual API call
      const mockItems: Item[] = [
        {
          id: "1",
          title: "Pressure washer",
          category: currentItem.category,
          location: "Pozuelo",
          daily_rate: 10,
          availability: true,
          instant_booking: true,
          images: ["https://images.unsplash.com/photo-1628177142898-93e36b4afd25?w=400&h=300&fit=crop"],
        },
        {
          id: "2",
          title: "Drone",
          category: currentItem.category,
          location: "Paris",
          daily_rate: 25,
          availability: true,
          instant_booking: true,
          images: ["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop"],
        },
        {
          id: "3",
          title: "Skis",
          category: currentItem.category,
          location: "Madrid",
          daily_rate: 15,
          availability: true,
          instant_booking: true,
          images: ["https://images.unsplash.com/photo-1551524164-6cf77f5e7f8b?w=400&h=300&fit=crop"],
        },
      ];
      
      const filtered = mockItems
        .filter((item: Item) => item.id !== currentItem.id)
        .slice(0, 4);
      
      setSimilarItems(filtered);
    } catch (error) {
      console.error("Error loading similar items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentItem]);

  useEffect(() => {
    loadSimilarItems();
  }, [loadSimilarItems]);

  if (isLoading || similarItems.length === 0) return null;

  return (
    <Card className="border-0 shadow-xl mt-6">
      <CardHeader>
        <CardTitle>Similar Items You Might Like</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {similarItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}