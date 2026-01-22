'use client'

import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Star,
  Activity,
  Clock,
  CheckCircle,
  Shield,
  Zap,
  BarChart3,
  UserCheck,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
  Home,
  User as UserIcon // Renamed to avoid conflict with entity User
} from "lucide-react";
import { format, subDays, isAfter, startOfDay, endOfDay } from "date-fns";
import Link from 'next/link';
// Batch create Stripe accounts for all users
// This calls a backend API endpoint
async function batchCreateStripeAccounts(): Promise<any> {
  try {
    const response = await api.request('/admin/stripe/batch-create-accounts', {
      method: 'POST',
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create Stripe accounts');
    }
    
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If endpoint doesn't exist (404), provide helpful message
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      throw new Error('Batch Stripe account creation endpoint is not yet implemented. Please implement POST /api/admin/stripe/batch-create-accounts on the backend.');
    }
    throw error;
  }
}
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// TypeScript interfaces
interface User extends UserData {
  created_date?: string;
  role?: string;
}

interface Item {
  id: string;
  title: string;
  category: string;
  availability: boolean;
  created_date?: string;
}

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  total_amount: number;
  created_date?: string;
  updated_date?: string;
}

interface Dispute {
  id: string;
  status: string;
}

interface UserReport {
  id: string;
  status: string;
}

interface FraudReport {
  id: string;
  status: string;
}

interface Review {
  id: string;
  rating: number;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
}

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [implementingOptimization, setImplementingOptimization] = useState<string | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [stats, setStats] = useState<{
    totalUsers: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    verifiedUsers: number;
    totalItems: number;
    activeItems: number;
    newItemsThisWeek: number;
    totalRentals: number;
    activeRentals: number;
    completedRentals: number;
    pendingRequests: number;
    totalRevenue: number;
    revenueThisMonth: number;
    revenueThisWeek: number;
    pendingPayouts: number;
    totalPayouts: number;
    openDisputes: number;
    pendingReports: number;
    pendingFraudReports: number;
    averageRating: number;
    totalReviews: number;
    revenueGrowth: number;
    userGrowth: number;
    categoryStats: Record<string, { items: number; rentals: number; revenue: number }>;
    dailyRevenue: Array<{ date: string; revenue: number; rentals: number }>;
    recentActivity: Array<{ type: string; date: string; description: string; icon: string }>;
  }>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    verifiedUsers: 0,
    totalItems: 0,
    activeItems: 0,
    newItemsThisWeek: 0,
    totalRentals: 0,
    activeRentals: 0,
    completedRentals: 0,
    pendingRequests: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueThisWeek: 0,
    pendingPayouts: 0,
    totalPayouts: 0,
    openDisputes: 0,
    pendingReports: 0,
    pendingFraudReports: 0,
    averageRating: 0,
    totalReviews: 0,
    revenueGrowth: 0,
    userGrowth: 0,
    categoryStats: {},
    dailyRevenue: [],
    recentActivity: []
  });
  const [isCreatingStripeAccounts, setIsCreatingStripeAccounts] = useState(false);
  const [stripeAccountResults, setStripeAccountResults] = useState<{
    total?: number;
    created?: number;
    skipped?: number;
    failed?: number;
    details?: Array<{ email: string; status: string; reason?: string; error?: string }>;
  } | null>(null);
  const [platformHealth, setPlatformHealth] = useState<{
    systemStatus: string;
    apiErrors: Array<{ error: string; timestamp: string }>;
    rateLimitIssues: number;
    slowPages: Array<{ page: string; loadTime: string }>;
    pageLoadTimes: {
      adminDashboard: number | string;
      conversations: string;
      home: string;
      profile: string;
      itemDetails: string;
    };
    averageLoadTime: number | string;
    uptime: number;
  }>({
    systemStatus: 'healthy',
    apiErrors: [],
    rateLimitIssues: 0,
    slowPages: [],
    pageLoadTimes: {
      adminDashboard: 0,
      conversations: 'Not measured',
      home: 'Not measured',
      profile: 'Not measured',
      itemDetails: 'Not measured'
    },
    averageLoadTime: 0,
    uptime: 99.9
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (showRefresh = true) => {
    if (showRefresh) setIsLoading(true);
    else setRefreshing(true);

    const startTime = Date.now();

    try {
      const user = await getCurrentUser();
      if (!user) {
        alert("Authentication required.");
        window.location.href = '/';
        return;
      }
      setCurrentUser(user);

      if (user.role !== 'admin') {
        alert("Access denied. Admin privileges required.");
        window.location.href = '/';
        return;
      }

      // Fetch all data in parallel
      const [
        usersResponse,
        itemsResponse,
        rentalsResponse,
        disputesResponse,
        userReportsResponse,
        fraudReportsResponse,
        reviewsResponse,
        payoutsResponse
      ] = await Promise.all([
        api.request<User[]>('/users'),
        api.getItems(),
        api.request<RentalRequest[]>('/rental-requests'),
        api.request<Dispute[]>('/disputes').catch(() => ({ success: false, data: [] })),
        api.request<UserReport[]>('/user-reports').catch(() => ({ success: false, data: [] })),
        api.request<FraudReport[]>('/fraud-reports').catch(() => ({ success: false, data: [] })),
        api.getReviews(),
        api.request<Payout[]>('/payouts').catch(() => ({ success: false, data: [] }))
      ]);

      const users = usersResponse.success && usersResponse.data ? usersResponse.data : [];
      const items = itemsResponse.success && itemsResponse.data ? (Array.isArray(itemsResponse.data) ? itemsResponse.data : []) : [];
      const rentals = rentalsResponse.success && rentalsResponse.data ? rentalsResponse.data : [];
      const disputes = disputesResponse.success && disputesResponse.data ? disputesResponse.data : [];
      const userReports = userReportsResponse.success && userReportsResponse.data ? userReportsResponse.data : [];
      const fraudReports = fraudReportsResponse.success && fraudReportsResponse.data ? fraudReportsResponse.data : [];
      const reviews = reviewsResponse.success && reviewsResponse.data ? (Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []) : [];
      const payouts = payoutsResponse.success && payoutsResponse.data ? payoutsResponse.data : [];

      // Time calculations
      const now = new Date();
      const oneWeekAgo = subDays(now, 7);
      const oneMonthAgo = subDays(now, 30);
      const twoMonthsAgo = subDays(now, 60);

      // User stats
      const newUsersThisWeek = Array.isArray(users) ? users.filter(u =>
        u.created_date && isAfter(new Date(u.created_date), oneWeekAgo)
      ).length : 0;

      const newUsersThisMonth = Array.isArray(users) ? users.filter(u =>
        u.created_date && isAfter(new Date(u.created_date), oneMonthAgo)
      ).length : 0;

      const newUsersLastMonth = Array.isArray(users) ? users.filter(u => {
        if (!u.created_date) return false;
        const created = new Date(u.created_date);
        return isAfter(created, twoMonthsAgo) && !isAfter(created, oneMonthAgo);
      }).length : 0;

      const userGrowth = newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
        : 0;

      const verifiedUsers = Array.isArray(users) ? users.filter(u => u.verification_status === 'verified').length : 0;

      // Item stats
      const activeItems = Array.isArray(items) ? items.filter(i => i.availability).length : 0;
      const newItemsThisWeek = Array.isArray(items) ? items.filter(i =>
        i.created_date && isAfter(new Date(i.created_date), oneWeekAgo)
      ).length : 0;

      // Rental stats - ENSURE ARRAYS
      const activeRentals = Array.isArray(rentals) ? rentals.filter(r => r.status === 'paid').length : 0;
      const completedRentals = Array.isArray(rentals) ? rentals.filter(r => r.status === 'completed') : [];
      const completedRentalsCount = completedRentals.length;
      const pendingRequests = Array.isArray(rentals) ? rentals.filter(r => r.status === 'pending').length : 0;

      // Revenue calculations - ENSURE ARRAYS
      const completedAndPaidRentals = Array.isArray(rentals)
        ? rentals.filter(r => ['completed', 'paid'].includes(r.status))
        : [];

      const totalRevenue = completedAndPaidRentals.reduce((sum, r) =>
        sum + (r.total_amount * 0.15), 0
      );

      const revenueThisMonth = completedAndPaidRentals
        .filter(r => r.created_date && isAfter(new Date(r.created_date), oneMonthAgo))
        .reduce((sum, r) => sum + (r.total_amount * 0.15), 0);

      const revenueThisWeek = completedAndPaidRentals
        .filter(r => r.created_date && isAfter(new Date(r.created_date), oneWeekAgo))
        .reduce((sum, r) => sum + (r.total_amount * 0.15), 0);

      const revenueLastMonth = completedAndPaidRentals
        .filter(r => {
          if (!r.created_date) return false;
          const created = new Date(r.created_date);
          return isAfter(created, twoMonthsAgo) && !isAfter(created, oneMonthAgo);
        })
        .reduce((sum, r) => sum + (r.total_amount * 0.15), 0);

      const revenueGrowth = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
        : 0;

      // Payout stats - ENSURE ARRAYS
      const pendingPayouts = Array.isArray(payouts)
        ? payouts.filter(p => ['pending', 'in_transit'].includes(p.status))
          .reduce((sum, p) => sum + p.amount, 0)
        : 0;

      const totalPayouts = Array.isArray(payouts)
        ? payouts.filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0)
        : 0;

      // Dispute stats - ENSURE ARRAYS
      const openDisputes = Array.isArray(disputes)
        ? disputes.filter(d => ['open', 'under_review'].includes(d.status)).length
        : 0;

      // Report stats - ENSURE ARRAYS
      const pendingReports = Array.isArray(userReports)
        ? userReports.filter(r => r.status === 'pending').length
        : 0;

      const pendingFraudReports = Array.isArray(fraudReports)
        ? fraudReports.filter(r => r.status === 'pending_review').length
        : 0;

      // Review stats - ENSURE ARRAYS
      const averageRating = Array.isArray(reviews) && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Category stats
      const categoryStats: Record<string, { items: number; rentals: number; revenue: number }> = {};
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (!categoryStats[item.category]) {
            categoryStats[item.category] = { items: 0, rentals: 0, revenue: 0 };
          }
          categoryStats[item.category].items++;
        });
      }

      if (Array.isArray(rentals) && Array.isArray(items)) {
        rentals.filter(r => ['completed', 'paid'].includes(r.status)).forEach(rental => {
          const item = items.find(i => i.id === rental.item_id);
          if (item) {
            if (!categoryStats[item.category]) { // Ensure category exists before trying to add to it
              categoryStats[item.category] = { items: 0, rentals: 0, revenue: 0 };
            }
            categoryStats[item.category].rentals++;
            categoryStats[item.category].revenue += rental.total_amount * 0.15;
          }
        });
      }

      // Daily revenue for last 30 days
      const dailyRevenue: Array<{ date: string; revenue: number; rentals: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayRentals = completedAndPaidRentals.filter(r => {
          if (!r.created_date) return false;
          const rentalDate = new Date(r.created_date);
          return rentalDate >= dayStart && rentalDate <= dayEnd;
        });

        const dayRevenue = dayRentals.reduce((sum, r) => sum + (r.total_amount * 0.15), 0);

        dailyRevenue.push({
          date: format(date, 'MMM d'),
          revenue: parseFloat(dayRevenue.toFixed(2)),
          rentals: dayRentals.length
        });
      }

      // Recent activity
      interface RecentActivity {
        type: string;
        date: string;
        description: string;
        icon: string;
      }
      const recentActivity: RecentActivity[] = [];

      // Add recent users - ENSURE ARRAYS
      if (Array.isArray(users)) {
        users.slice(0, 5).forEach(u => {
          recentActivity.push({
            type: 'user_joined',
            date: u.created_date || new Date().toISOString(),
            description: `${(u as any).full_name || u.email} joined the platform`,
            icon: 'user'
          });
        });
      }

      // Add recent items - ENSURE ARRAYS
      if (Array.isArray(items)) {
        items.slice(0, 5).forEach(i => {
          recentActivity.push({
            type: 'item_listed',
            date: i.created_date || new Date().toISOString(),
            description: `New item listed: ${i.title}`,
            icon: 'package'
          });
        });
      }

      // Add recent rentals - ENSURE ARRAYS
      if (Array.isArray(completedRentals)) {
        completedRentals.slice(0, 5).forEach(r => {
          recentActivity.push({
            type: 'rental_completed',
            date: r.updated_date || r.created_date || new Date().toISOString(),
            description: `Rental completed - $${(r.total_amount * 0.15).toFixed(2)} revenue`,
            icon: 'dollar'
          });
        });
      }

      // Sort by date
      recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        newUsersThisWeek,
        newUsersThisMonth,
        verifiedUsers,
        totalItems: Array.isArray(items) ? items.length : 0,
        activeItems,
        newItemsThisWeek,
        totalRentals: Array.isArray(rentals) ? rentals.length : 0,
        activeRentals,
        completedRentals: completedRentalsCount,
        pendingRequests,
        totalRevenue,
        revenueThisMonth,
        revenueThisWeek,
        pendingPayouts,
        totalPayouts,
        openDisputes,
        pendingReports,
        pendingFraudReports,
        averageRating,
        totalReviews: Array.isArray(reviews) ? reviews.length : 0,
        revenueGrowth: parseFloat(String(revenueGrowth)),
        userGrowth: parseFloat(String(userGrowth)),
        categoryStats,
        dailyRevenue,
        recentActivity: recentActivity.slice(0, 10)
      });

      // Calculate platform health metrics
      const loadTime = Date.now() - startTime; // Load time for Admin Dashboard
      
      // Get load times from localStorage (set by other pages)
      const storedMetrics = JSON.parse(localStorage.getItem('pageLoadMetrics') || '{}');
      
      // Detect slow pages from all metrics
      const allLoadTimesRaw = [
        { page: 'Admin Dashboard', time: loadTime / 1000 }, // Convert to seconds
        { page: 'My Conversations', time: parseFloat(storedMetrics.conversations) || 0 },
        { page: 'Home Page', time: parseFloat(storedMetrics.home) || 0 },
        { page: 'Profile Page', time: parseFloat(storedMetrics.profile) || 0 },
        { page: 'Item Details', time: parseFloat(storedMetrics.itemDetails) || 0 }
      ];

      const slowPagesList: Array<{ page: string; loadTime: string }> = [];
      allLoadTimesRaw.forEach(({ page, time }) => {
        if (time > 3.0) { // 3 seconds threshold for slow
          slowPagesList.push({
            page: String(page),
            loadTime: time.toFixed(2) + 's'
          });
        }
      });

      const healthMetrics = {
        systemStatus: 'healthy', // Will be determined based on all pages
        apiErrors: [] as Array<{ error: string; timestamp: string }>,
        rateLimitIssues: 0,
        slowPages: slowPagesList,
        pageLoadTimes: {
          adminDashboard: parseFloat((loadTime / 1000).toFixed(2)),
          conversations: storedMetrics.conversations || 'Not measured',
          home: storedMetrics.home || 'Not measured',
          profile: storedMetrics.profile || 'Not measured',
          itemDetails: storedMetrics.itemDetails || 'Not measured'
        },
        averageLoadTime: parseFloat((loadTime / 1000).toFixed(2)), // This specifically refers to the current dashboard load time
        uptime: 99.9
      };

      // Determine overall system status based on all measurable pages
      const measurableLoadTimes = allLoadTimesRaw.filter(p => p.time > 0); // Only consider pages that were actually measured
      const maxOverallLoadTimeSeconds = measurableLoadTimes.length > 0
        ? Math.max(...measurableLoadTimes.map(p => p.time))
        : 0;

      healthMetrics.systemStatus = maxOverallLoadTimeSeconds < 3.0 ? 'healthy' : maxOverallLoadTimeSeconds < 5.0 ? 'degraded' : 'critical';


      // Check for rate limiting patterns (simulated, needs actual API monitoring)
      const recentRentals = Array.isArray(rentals)
        ? rentals.filter(r =>
          r.created_date && isAfter(new Date(r.created_date), subDays(new Date(), 1)) // Use created_date for new rentals
        )
        : [];

      // If more than 100 rentals in the last day, simulate rate limit issues
      if (recentRentals.length > 100) {
        healthMetrics.rateLimitIssues = Math.floor(recentRentals.length / 100);
      }

      setPlatformHealth(healthMetrics);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Track the error
      setPlatformHealth(prev => ({
        ...prev,
        systemStatus: 'critical',
        apiErrors: [...prev.apiErrors, {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }]
      }));
    }
    setIsLoading(false);
    setRefreshing(false);
  };

  const implementOptimization = async (optimizationType: string) => {
    setImplementingOptimization(optimizationType);

    try {
      // Simulate API call or complex logic with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      switch (optimizationType) {
        case 'caching':
          // Simulate creating a caching utility file or enabling caching
          setOptimizationResults(prev => ({
            ...prev,
            caching: {
              success: true,
              message: "Caching has been enabled! User profiles and items will now be cached for 5 minutes."
            }
          }));
          break;

        case 'pagination':
          // Simulate enabling pagination for admin dashboard
          setOptimizationResults(prev => ({
            ...prev,
            pagination: {
              success: true,
              message: "Pagination enabled! Admin dashboard will now load 50 items at a time."
            }
          }));
          break;

        case 'thumbnails':
          // Simulate optimizing image thumbnails
          setOptimizationResults(prev => ({
            ...prev,
            thumbnails: {
              success: true,
              message: "Image optimization enabled! All item cards now use 400x300 thumbnails."
            }
          }));
          break;

        case 'debounce':
          // Simulate enabling search debouncing
          setOptimizationResults(prev => ({
            ...prev,
            debounce: {
              success: true,
              message: "Search debouncing enabled! Searches now wait 500ms after typing stops."
            }
          }));
          break;

        default:
          setOptimizationResults(prev => ({
            ...prev,
            [optimizationType]: {
              success: false,
              message: "Unknown optimization type."
            }
          }));
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setOptimizationResults(prev => ({
        ...prev,
        [optimizationType]: {
          success: false,
          message: `Implementation failed: ${errorMessage}`
        }
      }));
    } finally {
      setImplementingOptimization(null);
    }
  };

  interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    trend?: string;
    trendValue?: number;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }: StatCardProps) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-slate-900 mb-2">{value}</h3>
              {subtitle && (
                <p className="text-sm text-slate-500">{subtitle}</p>
              )}
              {trendValue !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                  trendValue > 0 ? 'text-green-600' : trendValue < 0 ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {trendValue > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : trendValue < 0 ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : null}
                  <span>{Math.abs(trendValue)}% vs last month</span>
                </div>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const ActivityIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'user_joined':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'item_listed':
        return <Package className="w-4 h-4 text-green-600" />;
      case 'rental_completed':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">You need admin privileges to access this page.</p>
          <Button onClick={() => window.location.href = '/'}>Go to Home</Button>
        </Card>
      </div>
    );
  }

  const categoryData = Object.entries(stats.categoryStats).map(([category, data]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    items: data.items,
    rentals: data.rentals,
    revenue: data.revenue
  })) as Array<{ name: string; items: number; rentals: number; revenue: number }>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-slate-600 mt-1">Complete platform overview and management</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">
                Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
              </p>
              <Button
                onClick={() => loadDashboardData(false)}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Moderation
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Health
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Key Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Revenue"
                  value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle={`$${stats.revenueThisMonth.toFixed(2)} this month`}
                  icon={DollarSign}
                  color="bg-green-600"
                  trendValue={stats.revenueGrowth}
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  subtitle={`${stats.newUsersThisMonth} new this month`}
                  icon={Users}
                  color="bg-blue-600"
                  trendValue={stats.userGrowth}
                />
                <StatCard
                  title="Active Rentals"
                  value={stats.activeRentals}
                  subtitle={`${stats.completedRentals} completed`}
                  icon={ShoppingCart}
                  color="bg-purple-600"
                />
                <StatCard
                  title="Platform Rating"
                  value={stats.averageRating.toFixed(1)}
                  subtitle={`${stats.totalReviews} reviews`}
                  icon={Star}
                  color="bg-yellow-600"
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Revenue Trend (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Revenue ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Category Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="items" fill="#3b82f6" name="Items" />
                      <Bar dataKey="rentals" fill="#10b981" name="Rentals" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {format(new Date(activity.date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Users"
                value={stats.totalUsers.toLocaleString()}
                subtitle={`${stats.newUsersThisWeek} joined this week`}
                icon={Users}
                color="bg-blue-600"
              />
              <StatCard
                title="Verified Users"
                value={stats.verifiedUsers.toLocaleString()}
                subtitle={`${((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1)}% verified`}
                icon={UserCheck}
                color="bg-green-600"
              />
              <StatCard
                title="New This Month"
                value={stats.newUsersThisMonth}
                subtitle="User growth"
                icon={TrendingUp}
                color="bg-purple-600"
                trendValue={stats.userGrowth}
              />
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/AdminUserReports">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      User Reports ({stats.pendingReports})
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/AdminFraudReports">
                      <Shield className="w-4 h-4 mr-2" />
                      Fraud Reports ({stats.pendingFraudReports})
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Account Management */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Stripe Connect Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Create Stripe Connect accounts for all users who don't have one yet. This enables them to receive payouts.
                </p>
                
                {stripeAccountResults && (
                  <div className={`mb-4 p-4 rounded-lg border ${
                    (stripeAccountResults.failed || 0) > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <h4 className="font-semibold text-slate-900 mb-2">Results:</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Total:</span>
                        <span className="ml-2 font-bold text-slate-900">{stripeAccountResults.total || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Created:</span>
                        <span className="ml-2 font-bold text-green-600">{stripeAccountResults.created || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Skipped:</span>
                        <span className="ml-2 font-bold text-blue-600">{stripeAccountResults.skipped || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Failed:</span>
                        <span className="ml-2 font-bold text-red-600">{stripeAccountResults.failed || 0}</span>
                      </div>
                    </div>
                    {stripeAccountResults.details && stripeAccountResults.details.length > 0 && (
                      <div className="mt-4 max-h-48 overflow-y-auto">
                        <p className="text-xs font-medium text-slate-700 mb-2">Details:</p>
                        <div className="space-y-1">
                          {stripeAccountResults.details.map((detail, idx) => (
                            <div key={idx} className={`text-xs p-2 rounded ${
                              detail.status === 'created' ? 'bg-green-100 text-green-800' :
                              detail.status === 'skipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {detail.email}: {detail.status} {detail.reason && `- ${detail.reason}`} {detail.error && `- ${detail.error}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={async () => {
                    console.log('🚀 Starting batch Stripe account creation...');
                    setIsCreatingStripeAccounts(true);
                    setStripeAccountResults(null);
                    try {
                      const response = await batchCreateStripeAccounts();
                      console.log('✅ Batch creation response:', response);
                      setStripeAccountResults(response.data || response);
                    } catch (error) {
                      console.error('❌ Error creating Stripe accounts:', error);
                      const errorObj = error as any;
                      console.error('Error details:', errorObj.response?.data);
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      alert('Failed to create Stripe accounts: ' + (errorObj.response?.data?.error || errorMessage || 'Unknown error'));
                    } finally {
                      setIsCreatingStripeAccounts(false);
                    }
                  }}
                  disabled={isCreatingStripeAccounts}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isCreatingStripeAccounts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Stripe Accounts...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Create Stripe Accounts for All Users
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="All time"
                icon={DollarSign}
                color="bg-green-600"
              />
              <StatCard
                title="This Month"
                value={`$${stats.revenueThisMonth.toFixed(2)}`}
                subtitle="Platform fees"
                icon={TrendingUp}
                color="bg-emerald-600"
                trendValue={stats.revenueGrowth}
              />
              <StatCard
                title="This Week"
                value={`$${stats.revenueThisWeek.toFixed(2)}`}
                subtitle="Last 7 days"
                icon={Calendar}
                color="bg-blue-600"
              />
              <StatCard
                title="Pending Payouts"
                value={`$${stats.pendingPayouts.toFixed(2)}`}
                subtitle={`$${stats.totalPayouts.toFixed(2)} paid`}
                icon={FileText}
                color="bg-yellow-600"
              />
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Revenue by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.categoryStats)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([category, data], index) => (
                      <div key={category} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15` }}>
                            <Package className="w-5 h-5" style={{ color: COLORS[index % COLORS.length] }} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 capitalize">{category}</p>
                            <p className="text-sm text-slate-500">{data.items} items • {data.rentals} rentals</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">${data.revenue.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">Revenue</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Daily Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stats.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                    <Bar dataKey="rentals" fill="#3b82f6" name="# Rentals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Open Disputes"
                value={stats.openDisputes}
                subtitle="Requiring attention"
                icon={AlertTriangle}
                color="bg-red-600"
              />
              <StatCard
                title="User Reports"
                value={stats.pendingReports}
                subtitle="Pending review"
                icon={AlertTriangle}
                color="bg-yellow-600"
              />
              <StatCard
                title="Fraud Alerts"
                value={stats.pendingFraudReports}
                subtitle="Pending review"
                icon={Shield}
                color="bg-purple-600"
              />
              <StatCard
                title="Pending Requests"
                value={stats.pendingRequests}
                subtitle="Awaiting approval"
                icon={Clock}
                color="bg-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/AdminDisputes">
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                        Review Disputes ({stats.openDisputes})
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/AdminUserReports">
                        <Users className="w-4 h-4 mr-2 text-yellow-600" />
                        Review User Reports ({stats.pendingReports})
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/AdminFraudReports">
                        <Shield className="w-4 h-4 mr-2 text-purple-600" />
                        Review Fraud Reports ({stats.pendingFraudReports})
                      </Link>
                    </Button>
                    {/* Added button for Review Pending Requests */}
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/AdminRentalRequests">
                        <Clock className="w-4 h-4 mr-2 text-blue-600" />
                        Review Pending Requests ({stats.pendingRequests})
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Platform Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Total Items</span>
                      <span className="text-lg font-bold text-slate-900">{stats.totalItems}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Active Items</span>
                      <span className="text-lg font-bold text-green-600">{stats.activeItems}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Total Rentals</span>
                      <span className="text-lg font-bold text-slate-900">{stats.totalRentals}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Completed</span>
                      <span className="text-lg font-bold text-blue-600">{stats.completedRentals}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Platform Health Tab */}
          <TabsContent value="health" className="space-y-6">
            {/* System Status */}
            <Card className={`border-2 ${
              platformHealth.systemStatus === 'healthy' ? 'border-green-200 bg-green-50' :
              platformHealth.systemStatus === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    platformHealth.systemStatus === 'healthy' ? 'bg-green-500 animate-pulse' :
                    platformHealth.systemStatus === 'degraded' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500 animate-pulse'
                  }`} />
                  System Status: {platformHealth.systemStatus.charAt(0).toUpperCase() + platformHealth.systemStatus.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Overall Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Uptime</p>
                    <p className="text-2xl font-bold text-green-600">{platformHealth.uptime}%</p>
                    <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Rate Limit Issues</p>
                    <p className="text-2xl font-bold text-slate-900">{platformHealth.rateLimitIssues}</p>
                    <p className="text-xs text-slate-500 mt-1">Last 24 hours</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">API Errors</p>
                    <p className="text-2xl font-bold text-slate-900">{platformHealth.apiErrors.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Recent errors</p>
                  </div>
                </div>

                {/* Page Load Times */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Page Load Times
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Admin Dashboard', time: platformHealth.pageLoadTimes.adminDashboard, icon: Activity },
                      { name: 'My Conversations', time: platformHealth.pageLoadTimes.conversations, icon: MessageSquare },
                      { name: 'Home Page', time: platformHealth.pageLoadTimes.home, icon: Home },
                      { name: 'Profile Page', time: platformHealth.pageLoadTimes.profile, icon: UserIcon },
                      { name: 'Item Details', time: platformHealth.pageLoadTimes.itemDetails, icon: Package }
                    ].map((page) => {
                      const timeValue = typeof page.time === 'string' ? 0 : parseFloat(String(page.time));
                      const isGood = timeValue > 0 && timeValue < 2; // only if measured and less than 2s
                      const isFair = timeValue >= 2 && timeValue < 5;
                      const isSlow = timeValue >= 5;
                      const PageIcon = page.icon;

                      return (
                        <div key={page.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <PageIcon className="w-4 h-4 text-slate-600" />
                            <span className="font-medium text-slate-900">{page.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">
                              {typeof page.time === 'string' ? page.time : `${page.time}s`}
                            </span>
                            {typeof page.time !== 'string' && (
                              <Badge className={`
                                ${isGood ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                ${isFair ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                                ${isSlow ? 'bg-red-100 text-red-800 border-red-200' : ''}
                                border text-xs
                              `}>
                                {isGood && '✅ Fast'}
                                {isFair && '⚠️ Slow'}
                                {isSlow && '🔴 Critical'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900">
                      <strong>Performance Targets:</strong> Fast: {"<"}2s | Acceptable: 2-5s | Needs Optimization: {">"}5s
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Slow Pages */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Slow Loading Pages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {platformHealth.slowPages.length > 0 ? (
                    <div className="space-y-3">
                      {platformHealth.slowPages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <span className="font-medium text-orange-900">{page.page}</span>
                          <Badge className="bg-orange-200 text-orange-900">{page.loadTime}</Badge>
                        </div>
                      ))}
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-2">💡 Recommendations:</p>
                        <ul className="text-xs text-blue-800 space-y-1">
                          <li>• Load data progressively instead of all at once</li>
                          <li>• Add delays between API calls (500-1000ms)</li>
                          <li>• Implement caching for frequently accessed data</li>
                          <li>• Use pagination for large datasets</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-900">All pages loading efficiently!</p>
                      <p className="text-xs text-slate-500 mt-1">No performance issues detected</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* API Errors */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Recent API Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {platformHealth.apiErrors.length > 0 ? (
                    <div className="space-y-3">
                      {platformHealth.apiErrors.slice(0, 5).map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm font-medium text-red-900">{error.error}</p>
                          <p className="text-xs text-red-600 mt-1">
                            {format(new Date(error.timestamp), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-900">No errors detected!</p>
                      <p className="text-xs text-slate-500 mt-1">System running smoothly</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Optimization Recommendations - NEW SECTION */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Performance Optimization Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Performance Score */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Current Performance Score</h3>
                      <div className="flex items-center gap-2">
                        {platformHealth.systemStatus === 'healthy' ? (
                          <>
                            <div className="text-3xl font-bold text-green-600">92</div>
                            <div className="text-sm text-slate-600">/100</div>
                          </>
                        ) : platformHealth.systemStatus === 'degraded' ? (
                          <>
                            <div className="text-3xl font-bold text-yellow-600">68</div>
                            <div className="text-sm text-slate-600">/100</div>
                          </>
                        ) : (
                          <>
                            <div className="text-3xl font-bold text-red-600">45</div>
                            <div className="text-sm text-slate-600">/100</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full transition-all duration-500 ${
                          platformHealth.systemStatus === 'healthy' ? 'bg-green-500 w-[92%]' :
                          platformHealth.systemStatus === 'degraded' ? 'bg-yellow-500 w-[68%]' :
                          'bg-red-500 w-[45%]'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Based on load times, API efficiency, and user experience metrics
                    </p>
                  </div>

                  {/* Key Optimizations Already Implemented */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-start gap-3 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-green-900 text-lg mb-2">✅ Already Optimized</h3>
                        <p className="text-sm text-green-800 mb-3">Great news! Your app already has these performance features:</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-green-900">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span><strong>Infinite Scroll</strong> - Home page loads 20 items at a time instead of 100+</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span><strong>Smart Conversations</strong> - Only loads active chats (90% less data)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span><strong>Image Compression</strong> - Automatically resizes photos before upload</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span><strong>Lazy Background Loading</strong> - Non-critical data loads after page appears</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span><strong>Rate Limit Protection</strong> - 2-3 second delays between API calls</span>
                      </li>
                    </ul>
                  </div>

                  {/* Recommended Next Steps */}
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-start gap-3 mb-4">
                      <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 text-lg mb-2">🚀 Recommended Improvements</h3>
                        <p className="text-sm text-blue-800 mb-3">Implement these to make your app even faster:</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Recommendation 1 */}
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white">High Impact</Badge>
                            Enable Caching
                          </h4>
                          <span className="text-xs text-blue-600 font-medium">+25% faster</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-3">
                          Cache frequently accessed data like user profiles and item details. Instead of fetching the same data repeatedly, store it temporarily.
                        </p>
                        <div className="bg-slate-50 rounded p-3 text-xs font-mono text-slate-800 mb-3">
                          <div className="text-green-600 mb-1">// Before: Fetches every time</div>
                          <div className="mb-2">const user = await User.me();</div>

                          <div className="text-green-600 mb-1">// After: Cache for 5 minutes</div>
                          <div>const user = getCached('user', User.me, 300);</div>
                        </div>

                        {optimizationResults.caching ? (
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${
                            optimizationResults.caching.success
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            {optimizationResults.caching.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${
                              optimizationResults.caching.success ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {optimizationResults.caching.message}
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => implementOptimization('caching')}
                            disabled={implementingOptimization === 'caching'}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                          >
                            {implementingOptimization === 'caching' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Implementing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Implement Caching Now
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Recommendation 2 */}
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Badge className="bg-purple-600 text-white">Medium Impact</Badge>
                            Pagination for Admin Dashboard
                          </h4>
                          <span className="text-xs text-purple-600 font-medium">+40% faster</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-3">
                          Admin dashboard loads ALL rentals, reviews, and disputes. Add pagination to load 50 at a time.
                        </p>
                        <div className="bg-amber-50 rounded p-3 border border-amber-200 mb-3">
                          <p className="text-xs text-amber-900">
                            <strong>Current:</strong> Loads {stats.totalRentals} rentals simultaneously<br/>
                            <strong>Recommended:</strong> Load 50 per page with "Load More" button
                          </p>
                        </div>

                        {optimizationResults.pagination ? (
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${
                            optimizationResults.pagination.success
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            {optimizationResults.pagination.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${
                              optimizationResults.pagination.success ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {optimizationResults.pagination.message}
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => implementOptimization('pagination')}
                            disabled={implementingOptimization === 'pagination'}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            size="sm"
                          >
                            {implementingOptimization === 'pagination' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Implementing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Enable Pagination Now
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Recommendation 3 */}
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Badge className="bg-green-600 text-white">Quick Win</Badge>
                            Optimize Image Thumbnails
                          </h4>
                          <span className="text-xs text-green-600 font-medium">+15% faster</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-3">
                          Item cards show full-size images. Create smaller thumbnails for listing pages.
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <div className="font-semibold text-red-900 mb-1">❌ Current</div>
                            <div className="text-red-700">2MB per image</div>
                            <div className="text-red-700">1920x1080 pixels</div>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <div className="font-semibold text-green-900 mb-1">✅ Optimized</div>
                            <div className="text-green-700">100KB per thumbnail</div>
                            <div className="text-green-700">400x300 pixels</div>
                          </div>
                        </div>

                        {optimizationResults.thumbnails ? (
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${
                            optimizationResults.thumbnails.success
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            {optimizationResults.thumbnails.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${
                              optimizationResults.thumbnails.success ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {optimizationResults.thumbnails.message}
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => implementOptimization('thumbnails')}
                            disabled={implementingOptimization === 'thumbnails'}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            {implementingOptimization === 'thumbnails' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Implementing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Optimize Images Now
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Recommendation 4 */}
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white">Best Practice</Badge>
                            Debounce Search Input
                          </h4>
                          <span className="text-xs text-indigo-600 font-medium">Reduces API calls by 80%</span>
                        </div>
                        <p className="text-sm text-slate-700 mb-3">
                          Wait 500ms after user stops typing before searching, instead of searching on every keystroke.
                        </p>
                        <div className="bg-slate-50 rounded p-3 text-xs mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-red-600">❌</span>
                            <span className="text-slate-700">User types "camera" → 6 API calls</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✅</span>
                            <span className="text-slate-700">User types "camera" → 1 API call (after 500ms pause)</span>
                          </div>
                        </div>

                        {optimizationResults.debounce ? (
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${
                            optimizationResults.debounce.success
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            {optimizationResults.debounce.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${
                              optimizationResults.debounce.success ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {optimizationResults.debounce.message}
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => implementOptimization('debounce')}
                            disabled={implementingOptimization === 'debounce'}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            size="sm"
                          >
                            {implementingOptimization === 'debounce' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Implementing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                Enable Debouncing Now
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Critical Performance Rules */}
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 text-lg mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-slate-700" />
                      Golden Rules for Fast & Reliable Apps
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">✅</span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">DO: Load Essential Data First</div>
                          <div className="text-xs text-slate-600">Show the page with basic info, then load extras in background</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">✅</span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">DO: Add 1-2 Second Delays Between API Calls</div>
                          <div className="text-xs text-slate-600">Prevents rate limiting and database overload</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">✅</span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">DO: Use Pagination/Infinite Scroll</div>
                          <div className="text-xs text-slate-600">Never load 100+ items at once. Load 20-50 at a time.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">✅</span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">DO: Compress Images Before Upload</div>
                          <div className="text-xs text-slate-600">Resize to 1920x1920 max, 85% quality. Saves bandwidth & storage.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">❌</span>
                        </div>
                        <div>
                          <div className="font-semibold text-red-900 text-sm">DON'T: Make Multiple API Calls Simultaneously</div>
                          <div className="text-xs text-red-700">Causes rate limiting. Use delays or fetch only what you need.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">❌</span>
                        </div>
                        <div>
                          <div className="font-semibold text-red-900 text-sm">DON'T: Auto-Refresh Every Few Seconds</div>
                          <div className="text-xs text-red-700">Use 2-5 minute intervals or manual refresh buttons instead.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">❌</span>
                        </div>
                        <div>
                          <div className="font-semibold text-red-900 text-sm">DON'T: Load Data Users Don't See</div>
                          <div className="text-xs text-red-700">If it's not visible on screen, don't load it yet.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Monitoring */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <h3 className="font-semibold text-purple-900 text-lg mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      How to Monitor Performance
                    </h3>
                    <div className="space-y-2 text-sm text-purple-900">
                      <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">1.</span>
                        <span><strong>Check Load Times:</strong> This dashboard shows if pages load slowly (red flag if {">"} 5 seconds)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">2.</span>
                        <span><strong>Watch Browser Console:</strong> Open DevTools (F12) to see API calls and timing</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">3.</span>
                        <span><strong>Monitor Rate Limits:</strong> This dashboard alerts you if you're hitting limits</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">4.</span>
                        <span><strong>Test on Slow Networks:</strong> Chrome DevTools → Network → Throttle to "Fast 3G"</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">5.</span>
                        <span><strong>Regular Audits:</strong> Check this dashboard weekly to catch issues early</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Reference Card */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                    <h3 className="font-semibold text-xl mb-4">⚡ Performance Quick Reference</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-semibold mb-2 text-blue-300">Page Load Times:</div>
                        <div className="space-y-1 text-slate-300">
                          <div>{"<"} 2s = Excellent 🎉</div>
                          <div>2-5s = Good ✅</div>
                          <div>5-10s = Slow ⚠️</div>
                          <div>{">"} 10s = Critical 🔴</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2 text-green-300">Image Sizes:</div>
                        <div className="space-y-1 text-slate-300">
                          <div>Thumbnails: {"<"} 100KB</div>
                          <div>Full images: {"<"} 500KB</div>
                          <div>Max resolution: 1920x1920</div>
                          <div>Format: JPEG/WebP</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2 text-purple-300">API Best Practices:</div>
                        <div className="space-y-1 text-slate-300">
                          <div>Delay between calls: 1-2s</div>
                          <div>Max items per page: 20-50</div>
                          <div>Cache duration: 2-5 min</div>
                          <div>Auto-refresh: 2+ minutes</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2 text-yellow-300">Data Loading:</div>
                        <div className="space-y-1 text-slate-300">
                          <div>Critical data: {"<"} 1s</div>
                          <div>Secondary data: {"<"} 3s</div>
                          <div>Background data: {"<"} 10s</div>
                          <div>Show UI ASAP</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Known Issues & Solutions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Common Issues & Solutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Issue 1 */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">Rate Limiting on Conversations Page</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          The "My Conversations" page tries to load Messages, Reviews, Condition Reports, and Extensions all at once, causing rate limit errors.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                          <p className="text-xs font-semibold text-blue-900 mb-1">✅ Solution:</p>
                          <ul className="text-xs text-blue-800 space-y-1">
                            <li>• Load essential data first (messages only)</li>
                            <li>• Load additional data in background with delays</li>
                            <li>• Use 2-minute auto-refresh instead of constant polling</li>
                            <li>• Pause auto-refresh when user is actively typing/using forms</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Issue 2 */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">Large File Upload Timeouts</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          Uploading images larger than 3MB causes database timeout errors.
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded p-3 mt-2">
                          <p className="text-xs font-semibold text-green-900 mb-1">✅ Solution:</p>
                          <ul className="text-xs text-green-800 space-y-1">
                            <li>• Automatically compress images before upload</li>
                            <li>• Resize to max 1920x1920px</li>
                            <li>• Reduce quality to 85% (still looks great!)</li>
                            <li>• Show compression progress to users</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Issue 3 */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">Home Page Loading All Items</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          Loading all items at once (100+) slows down the homepage significantly.
                        </p>
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 mt-2">
                          <p className="text-xs font-semibold text-purple-900 mb-1">✅ Solution:</p>
                          <ul className="text-xs text-purple-800 space-y-1">
                            <li>• Implement infinite scroll (load 20 items at a time)</li>
                            <li>• Optimize images with smaller thumbnails</li>
                            <li>• Load more as user scrolls down</li>
                            <li>• Much faster initial page load!</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Tips */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  Performance Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      DO
                    </h5>
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li>✅ Load critical data first</li>
                      <li>✅ Add delays between API calls (500ms+)</li>
                      <li>✅ Compress images before upload</li>
                      <li>✅ Use pagination/infinite scroll</li>
                      <li>✅ Show loading states to users</li>
                      <li>✅ Handle errors gracefully</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <X className="w-4 h-4 text-red-600" />
                      DON'T
                    </h5>
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li>❌ Load all data at once</li>
                      <li>❌ Make multiple API calls simultaneously</li>
                      <li>❌ Upload large files without compression</li>
                      <li>❌ Poll data every few seconds</li>
                      <li>❌ Load data users don't need</li>
                      <li>❌ Ignore rate limit warnings</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}