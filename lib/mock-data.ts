/**
 * Mock data for frontend-only development
 * These will be replaced with real API calls once backend is integrated
 */

export interface MockItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition?: string;
  location?: string;
  daily_rate: number;
  deposit?: number;
  availability: boolean;
  instant_booking?: boolean;
  images?: string[];
  videos?: string[];
  pricing_tiers?: Array<{ days: number; price: number }>;
  min_rental_days?: number;
  max_rental_days?: number;
  delivery_options?: string[];
  delivery_fee?: number;
  delivery_radius?: number;
  created_by?: string;
  [key: string]: any;
}

export interface MockOwner {
  username?: string;
  full_name?: string;
  profile_picture?: string;
  email?: string;
}

export const MOCK_ITEMS: Record<string, { item: MockItem; owner: MockOwner }> = {
  "1": {
    item: {
      id: "1",
      title: "Pressure washer",
      description: "Professional-grade pressure washer perfect for cleaning driveways, decks, and outdoor surfaces. Includes multiple nozzle attachments and a 50-foot hose. Excellent condition, well-maintained.",
      category: "tools",
      condition: "excellent",
      location: "Pozuelo",
      daily_rate: 10,
      deposit: 50,
      availability: true,
      instant_booking: true,
      images: [
        "https://images.unsplash.com/photo-1628177142898-93e36b4afd25?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop",
      ],
      pricing_tiers: [
        { days: 3, price: 27 }, // $9/day
        { days: 7, price: 60 }, // $8.57/day
      ],
      min_rental_days: 1,
      max_rental_days: 30,
      delivery_options: ["pickup", "delivery"],
      delivery_fee: 5,
      delivery_radius: 10,
      created_by: "owner1@example.com",
    },
    owner: {
      username: "handyman_john",
      full_name: "John Smith",
      profile_picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      email: "owner1@example.com",
    },
  },
  "2": {
    item: {
      id: "2",
      title: "Drone",
      description: "Drone with a 4K camera. Perfect for aerial photography and videography. Includes remote control, spare batteries, and carrying case. Latest model with obstacle avoidance technology.",
      category: "electronics",
      condition: "good",
      location: "Paris",
      daily_rate: 25,
      deposit: 100,
      availability: true,
      instant_booking: true,
      images: [
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&h=600&fit=crop",
      ],
      pricing_tiers: [
        { days: 3, price: 70 }, // $23.33/day
        { days: 7, price: 150 }, // $21.43/day
      ],
      min_rental_days: 1,
      max_rental_days: 30,
      delivery_options: ["pickup", "delivery"],
      delivery_fee: 10,
      delivery_radius: 15,
      created_by: "owner2@example.com",
    },
    owner: {
      username: "RPM",
      full_name: "Robert Martinez",
      profile_picture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
      email: "owner2@example.com",
    },
  },
  "3": {
    item: {
      id: "3",
      title: "Skis",
      description: "High-quality alpine skis with bindings, perfect for intermediate to advanced skiers. Length: 165cm. Includes ski poles and ski bag. Recently tuned and waxed.",
      category: "sports",
      condition: "good",
      location: "Madrid",
      daily_rate: 15,
      deposit: 80,
      availability: true,
      instant_booking: true,
      images: [
        "https://images.unsplash.com/photo-1551524164-6cf77f5e7f8b?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&h=600&fit=crop",
      ],
      pricing_tiers: [
        { days: 5, price: 65 }, // $13/day
        { days: 10, price: 120 }, // $12/day
      ],
      min_rental_days: 1,
      max_rental_days: 14,
      delivery_options: ["pickup"],
      created_by: "owner3@example.com",
    },
    owner: {
      username: "snow_lover",
      full_name: "Sarah Johnson",
      profile_picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      email: "owner3@example.com",
    },
  },
};

/**
 * Get mock item by ID
 */
export function getMockItem(id: string): { item: MockItem; owner: MockOwner } | null {
  return MOCK_ITEMS[id] || null;
}

/**
 * Check if we should use mock data (when backend is not available)
 */
export function shouldUseMockData(): boolean {
  // Use mock data if API_BASE is not set or is localhost and we're in development
  if (typeof window === 'undefined') return false;
  
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const isLocalhost = apiBase.includes('localhost') || apiBase.includes('127.0.0.1');
  
  // For now, always use mock data in frontend-only mode
  // You can change this logic based on your needs
  return true; // Set to false once backend is ready
}
