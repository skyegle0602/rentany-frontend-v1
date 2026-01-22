'use client'

import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Shield, Eye, Ban, CheckCircle, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

// TypeScript interfaces
interface FraudReport {
  id: string;
  user_email: string;
  item_id?: string;
  fraud_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending_review' | 'under_investigation' | 'confirmed_fraud' | 'false_positive' | 'resolved';
  indicators: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    details?: string;
    indicators?: string[];
  }>;
  is_stock_photo?: boolean;
  admin_notes?: string;
  action_taken?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  created_date: string;
}

interface Item {
  id: string;
  title: string;
  images?: string[];
  availability?: boolean;
}

interface User extends UserData {
  full_name?: string;
  username?: string;
  profile_picture?: string;
}

// Placeholder functions
async function getUserForChat(params: { email: string }): Promise<any> {
  const response = await api.request<User[]>(`/users?email=${encodeURIComponent(params.email)}`);
  return { data: { user: response.data?.[0] || null } };
}

async function sendNotification(params: any): Promise<void> {
  await api.request('/notifications', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

const riskColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-purple-100 text-purple-800 border-purple-200"
};

const severityColors = {
  low: "text-blue-600",
  medium: "text-yellow-600",
  high: "text-red-600"
};

export default function AdminFraudReportsPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<FraudReport | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviewData, setReviewData] = useState<{
    admin_notes: string;
    action_taken: string;
  }>({
    admin_notes: '',
    action_taken: 'none'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
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

      const reportsResponse = await api.request<FraudReport[]>('/fraud-reports');
      const allReports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
      setReports(allReports);

      // Load items
      const itemsResponse = await api.getItems();
      const allItems = itemsResponse.success && itemsResponse.data ? (Array.isArray(itemsResponse.data) ? itemsResponse.data : []) : [];
      const itemsMap: Record<string, Item> = {};
      allItems.forEach((item: Item) => {
        itemsMap[item.id] = item;
      });
      setItems(itemsMap);

      // Load users
      const involvedEmails = new Set<string>(allReports.map(r => r.user_email));
      const usersDataMap: Record<string, User> = {};
      for (const email of involvedEmails) {
        try {
          const response = await getUserForChat({ email });
          if (response.data?.user) {
            usersDataMap[email] = response.data.user;
          }
        } catch (err) {
          console.error(`Failed to fetch user ${email}:`, err);
        }
      }
      setUsersMap(usersDataMap);

    } catch (error) {
      console.error("Error loading fraud reports:", error);
    }
    setIsLoading(false);
  };

  const handleOpenReport = (report: FraudReport) => {
    setSelectedReport(report);
    setReviewData({
      admin_notes: report.admin_notes || '',
      action_taken: report.action_taken || 'none'
    });
  };

  const handleResolveReport = async (status: string) => {
    if (!selectedReport || !currentUser) return;
    
    setIsUpdating(true);
    try {
      await api.request(`/fraud-reports/${selectedReport.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: status,
          admin_notes: reviewData.admin_notes,
          action_taken: reviewData.action_taken,
          reviewed_by: currentUser.email,
          reviewed_date: new Date().toISOString()
        }),
      });

      // If confirmed fraud and item exists, disable it
      if (status === 'confirmed_fraud' && selectedReport.item_id) {
        await api.request(`/items/${selectedReport.item_id}`, {
          method: 'PUT',
          body: JSON.stringify({ availability: false }),
        });
      }

      // If false positive and item exists, re-enable it
      if (status === 'false_positive' && selectedReport.item_id) {
        await api.request(`/items/${selectedReport.item_id}`, {
          method: 'PUT',
          body: JSON.stringify({ availability: true }),
        });
      }

      // Send notification to user
      const itemTitle = selectedReport.item_id ? items[selectedReport.item_id]?.title : null;
      const actionMessages: Record<string, { title: string; message: string }> = {
        confirmed_fraud: {
          title: "⚠️ Listing Removed - Policy Violation",
          message: selectedReport.item_id 
            ? `Your listing "${itemTitle || 'Unknown Listing'}" has been removed for violating our policies. Repeated violations may result in account suspension.`
            : "Your account has been flagged for suspicious activity. Please review our terms of service."
        },
        false_positive: {
          title: "✅ Review Complete - No Issues Found",
          message: selectedReport.item_id
            ? `Your listing "${itemTitle || 'Unknown Listing'}" has been reviewed and found to be in compliance. Thank you for your patience.`
            : "Your account has been reviewed and no issues were found. Thank you for your patience."
        },
        under_investigation: {
          title: "🔍 Your Listing is Under Review",
          message: selectedReport.item_id
            ? `Your listing "${itemTitle || 'Unknown Listing'}" is being reviewed by our team. We'll notify you of the outcome soon.`
            : "Your account is being reviewed by our team. We'll notify you of the outcome soon."
        }
      };

      const actionMessage = actionMessages[status];
      if (actionMessage) {
        await sendNotification({
          user_email: selectedReport.user_email,
          type: 'review',
          title: actionMessage.title,
          message: actionMessage.message,
          related_id: selectedReport.item_id || selectedReport.id,
          link: selectedReport.item_id ? `/ItemDetails?id=${selectedReport.item_id}` : `/Profile`
        });
      }

      await loadData();
      setSelectedReport(null);
      alert("Report resolved successfully! User has been notified.");
    } catch (error) {
      console.error("Error resolving report:", error);
      alert("Failed to resolve report. Please try again.");
    }
    setIsUpdating(false);
  };

  const FraudReportCard = ({ report }: { report: FraudReport }) => {
    const item = report.item_id ? items[report.item_id] : null;
    const user = usersMap[report.user_email];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg mb-4 hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg">
                    {item?.title || "User Activity Report"}
                  </CardTitle>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <div>Reported: {format(new Date(report.created_date), "MMM d, yyyy")}</div>
                  <div>•</div>
                  <div>Score: {report.fraud_score}/100</div>
                  {report.is_stock_photo && (
                    <>
                      <div>•</div>
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        <Camera className="w-3 h-3 mr-1" />
                        Stock Photos
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${riskColors[report.risk_level]} border shadow-sm`}>
                  {report.risk_level.toUpperCase()} RISK
                </Badge>
                <Button
                  onClick={() => handleOpenReport(report)}
                  size="sm"
                  variant="outline"
                  className="border-slate-300"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 mb-1">Flagged User:</p>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{user?.full_name || "Unknown User"}</div>
                <div className="text-xs text-slate-500">({report.user_email})</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">Fraud Indicators:</p>
              {report.indicators.slice(0, 3).map((indicator, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className={`font-semibold ${severityColors[indicator.severity]}`}>
                    {indicator.severity.toUpperCase()}:
                  </span>
                  <span className="text-slate-700">{indicator.description}</span>
                </div>
              ))}
              {report.indicators.length > 3 && (
                <p className="text-xs text-slate-500 italic">
                  +{report.indicators.length - 3} more indicators
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
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

  const pendingReports = reports.filter(r => r.status === 'pending_review');
  const underInvestigation = reports.filter(r => r.status === 'under_investigation');
  const resolvedReports = reports.filter(r => ['confirmed_fraud', 'false_positive', 'resolved'].includes(r.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              Fraud Detection Reports
            </h1>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {reports.length} Total Reports
            </Badge>
          </div>
          <p className="text-slate-600">Review and take action on flagged listings and users</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3 m-6 mb-0">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Pending ({pendingReports.length})
                </TabsTrigger>
                <TabsTrigger value="investigating" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Investigating ({underInvestigation.length})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resolved ({resolvedReports.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="p-6">
                {pendingReports.length > 0 ? (
                  <div>
                    {pendingReports.map(report => (
                      <FraudReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No pending reports</h3>
                    <p className="text-slate-600">All fraud reports have been reviewed</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="investigating" className="p-6">
                {underInvestigation.length > 0 ? (
                  <div>
                    {underInvestigation.map(report => (
                      <FraudReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No reports under investigation</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resolved" className="p-6">
                {resolvedReports.length > 0 ? (
                  <div>
                    {resolvedReports.map(report => (
                      <FraudReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No resolved reports</h3>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Review Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Review Fraud Report
              </DialogTitle>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-6 py-4">
                {/* Report Summary */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Fraud Score</p>
                      <p className="text-2xl font-bold text-red-600">{selectedReport.fraud_score}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Risk Level</p>
                      <Badge className={`${riskColors[selectedReport.risk_level]} text-base px-3 py-1`}>
                        {selectedReport.risk_level.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p><strong>User:</strong> {selectedReport.user_email}</p>
                    {selectedReport.item_id && items[selectedReport.item_id] && (
                      <p><strong>Item:</strong> {items[selectedReport.item_id].title}</p>
                    )}
                    <p><strong>Reported:</strong> {format(new Date(selectedReport.created_date), "PPP 'at' p")}</p>
                  </div>
                </div>

                {/* All Indicators */}
                <div>
                  <h3 className="font-semibold mb-3">Fraud Indicators Detected</h3>
                  <div className="space-y-3">
                    {selectedReport.indicators.map((indicator, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`font-semibold ${severityColors[indicator.severity]}`}>
                            {indicator.type.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          <Badge variant="outline" className={severityColors[indicator.severity]}>
                            {indicator.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-1">{indicator.description}</p>
                        {indicator.details && (
                          <p className="text-xs text-slate-500 italic">{indicator.details}</p>
                        )}
                        {indicator.indicators && (
                          <ul className="mt-2 text-xs text-slate-600 list-disc list-inside">
                            {indicator.indicators.map((ind, i) => (
                              <li key={i}>{ind}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Item Images if available */}
                {selectedReport.item_id && items[selectedReport.item_id]?.images && (
                  <div>
                    <h3 className="font-semibold mb-3">Item Images</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(items[selectedReport.item_id]?.images || []).slice(0, 6).map((img, index) => (
                        <img 
                          key={index}
                          src={img}
                          alt={`Evidence ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Decision */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Admin Action</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Action to Take</Label>
                      <Select 
                        value={reviewData.action_taken}
                        onValueChange={(value) => setReviewData(prev => ({ ...prev, action_taken: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Action</SelectItem>
                          <SelectItem value="warning_sent">Send Warning</SelectItem>
                          <SelectItem value="listing_removed">Remove Listing</SelectItem>
                          <SelectItem value="user_suspended">Suspend User</SelectItem>
                          <SelectItem value="user_banned">Ban User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Admin Notes</Label>
                      <Textarea
                        value={reviewData.admin_notes}
                        onChange={(e) => setReviewData(prev => ({ ...prev, admin_notes: e.target.value }))}
                        placeholder="Add notes about your investigation and decision..."
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedReport(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveReport('under_investigation')}
                disabled={isUpdating}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                Mark as Investigating
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveReport('false_positive')}
                disabled={isUpdating}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                False Positive
              </Button>
              <Button
                onClick={() => handleResolveReport('confirmed_fraud')}
                disabled={isUpdating}
                className="bg-red-600 hover:bg-red-700"
              >
                <Ban className="w-4 h-4 mr-2" />
                Confirm Fraud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
