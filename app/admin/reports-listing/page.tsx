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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Package,
  Calendar,
  User,
  Eye,
  Camera,
  X
} from "lucide-react";
import { format } from "date-fns";
import Link from 'next/link';

interface ListingReport {
  id: string;
  item_id: string;
  reporter_email: string;
  reason: 'fraud' | 'stolen_item' | 'prohibited_item' | 'misleading' | 'price_gouging' | 'spam' | 'other';
  description: string;
  evidence_urls?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  action_taken?: 'none' | 'warning_sent' | 'listing_removed' | 'user_suspended' | 'user_banned';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  created_date: string;
  created_at: string;
  updated_at?: string;
}

interface Item {
  id: string;
  title: string;
  images?: string[];
  owner_email?: string;
}

const reasonLabels: Record<string, string> = {
  fraud: 'Fraudulent Listing',
  stolen_item: 'Suspected Stolen Item',
  prohibited_item: 'Prohibited Item',
  misleading: 'Misleading Description/Photos',
  price_gouging: 'Price Gouging',
  spam: 'Spam or Duplicate',
  other: 'Other'
};

// Map reasons to risk levels for display
const reasonRiskLevel: Record<string, 'low' | 'medium' | 'high'> = {
  fraud: 'high',
  stolen_item: 'high',
  prohibited_item: 'high',
  misleading: 'medium',
  price_gouging: 'medium',
  spam: 'low',
  other: 'medium'
};

const riskColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200"
};

export default function ReportsListingPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ListingReport | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<'none' | 'warning_sent' | 'listing_removed' | 'user_suspended' | 'user_banned'>('none');
  const [activeTab, setActiveTab] = useState<'pending' | 'investigating' | 'resolved'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

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

      // Fetch listing reports
      const reportsResponse = await api.request<ListingReport[]>('/reports/listing');
      const allReports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
      setReports(allReports);

      // Only fetch items that are in the reports
      if (allReports.length > 0) {
        const itemIds = [...new Set(allReports.map(r => r.item_id).filter(Boolean))];
        if (itemIds.length > 0) {
          const idsParam = itemIds.join(',');
          const itemsResponse = await api.request<Item[]>(`/items?ids=${encodeURIComponent(idsParam)}`);
          const fetchedItems = itemsResponse.success && itemsResponse.data ? itemsResponse.data : [];
          const itemsMap: Record<string, Item> = {};
          fetchedItems.forEach(item => itemsMap[item.id] = item);
          setItems(itemsMap);
        }
      }

    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load reports.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = (report: ListingReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setActionTaken(report.action_taken || 'none');
  };

  const handleUpdateStatus = async (newStatus: 'investigating' | 'resolved') => {
    if (!selectedReport) return;
    
    setProcessingId(selectedReport.id);
    try {
      const response = await api.request(`/reports/listing/${selectedReport.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          admin_notes: adminNotes || undefined,
          action_taken: actionTaken
        })
      });

      if (response.success) {
        // Update local state
        setReports(prev => prev.map(r => 
          r.id === selectedReport.id 
            ? { ...r, status: newStatus, admin_notes: adminNotes || undefined, action_taken: actionTaken }
            : r
        ));
        setSelectedReport(null);
        setAdminNotes('');
        setActionTaken('none');
        alert(`Report marked as ${newStatus === 'resolved' ? 'resolved' : 'under investigation'} successfully.`);
      } else {
        throw new Error(response.error || 'Failed to update report');
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      alert(`Failed to update report: ${error?.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleTakeAction = async () => {
    if (!selectedReport) return;
    
    if (actionTaken === 'none') {
      alert("Please select an action to take.");
      return;
    }
    
    setProcessingId(selectedReport.id);
    try {
      const response = await api.request(`/reports/listing/${selectedReport.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'resolved',
          admin_notes: adminNotes || undefined,
          action_taken: actionTaken
        })
      });

      if (response.success) {
        // Update local state
        setReports(prev => prev.map(r => 
          r.id === selectedReport.id 
            ? { ...r, status: 'resolved', admin_notes: adminNotes || undefined, action_taken: actionTaken }
            : r
        ));
        setSelectedReport(null);
        setAdminNotes('');
        setActionTaken('none');
        
        const actionLabels: Record<string, string> = {
          warning_sent: 'Warning Sent',
          listing_removed: 'Listing Removed',
          user_suspended: 'User Suspended',
          user_banned: 'User Banned'
        };
        alert(`Action taken: ${actionLabels[actionTaken] || actionTaken}. Report resolved.`);
      } else {
        throw new Error(response.error || 'Failed to take action');
      }
    } catch (error: any) {
      console.error("Error taking action:", error);
      alert(`Failed to take action: ${error?.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate counts
  const pendingReports = reports.filter(r => r.status === 'pending');
  const investigatingReports = reports.filter(r => r.status === 'investigating');
  const resolvedReports = reports.filter(r => r.status === 'resolved');

  // Get filtered reports based on active tab
  const filteredReports = activeTab === 'pending' 
    ? pendingReports
    : activeTab === 'investigating'
    ? investigatingReports
    : resolvedReports;

  const ReportCard = ({ report }: { report: ListingReport }) => {
    const item = items[report.item_id];
    const riskLevel = reasonRiskLevel[report.reason] || 'medium';
    const hasEvidence = report.evidence_urls && report.evidence_urls.length > 0;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg mb-4 hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg">
                    {item?.title || "Unknown Item"}
                  </CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <div>Reported: {format(new Date(report.created_date), "MMM d, yyyy")}</div>
                  {hasEvidence && (
                    <>
                      <div>•</div>
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        <Camera className="w-3 h-3 mr-1" />
                        {report.evidence_urls?.length || 0} Evidence
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${riskColors[riskLevel]} border shadow-sm`}>
                  {riskLevel.toUpperCase()} RISK
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
              <p className="text-xs font-semibold text-slate-500 mb-1">Reported by:</p>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-blue-600">{report.reporter_email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 mb-1">Report Reason:</p>
              <div className="flex items-start gap-2 text-sm">
                <span className={`font-semibold ${
                  riskLevel === 'high' ? 'text-red-600' :
                  riskLevel === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {riskLevel.toUpperCase()}:
                </span>
                <span className="text-slate-700">{reasonLabels[report.reason] || report.reason}</span>
              </div>
              {report.description && (
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                  {report.description}
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
              Listing Reports
            </h1>
            <Badge variant="outline" className="text-lg px-4 py-2 bg-yellow-50 border-yellow-200 text-yellow-700">
              {reports.length} Total Reports
            </Badge>
          </div>
          <p className="text-slate-600">Review and take action on flagged listings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 m-6 mb-0">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Pending ({pendingReports.length})
                </TabsTrigger>
                <TabsTrigger value="investigating" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Investigating ({investigatingReports.length})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resolved ({resolvedReports.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="p-6">
                {filteredReports.length > 0 ? (
                  <div>
                    {filteredReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      No {activeTab === 'pending' ? 'pending' : activeTab === 'investigating' ? 'investigating' : 'resolved'} reports
                    </h3>
                    <p className="text-slate-600">All caught up!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Review Dialog */}
        {selectedReport && (
          <Dialog open={!!selectedReport} onOpenChange={() => {
            setSelectedReport(null);
            setAdminNotes('');
            setActionTaken('none');
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="w-6 h-6 text-red-500" />
                  Review Listing Report
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Report Summary Section */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                      <h3 className="text-xl font-bold">{items[selectedReport.item_id]?.title || 'Unknown Item'}</h3>
                    </div>
                    <Badge className={`${riskColors[reasonRiskLevel[selectedReport.reason] || 'medium']} text-sm px-3 py-1`}>
                      {reasonRiskLevel[selectedReport.reason]?.toUpperCase() || 'MEDIUM'} RISK
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div>User: <span className="font-medium text-slate-900">{selectedReport.reporter_email}</span></div>
                    <div>•</div>
                    <div>Reported: {format(new Date(selectedReport.created_date), "MMMM d, yyyy 'at' h:mm a")}</div>
                    {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                      <>
                        <div>•</div>
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <Camera className="w-3 h-3 mr-1" />
                          {selectedReport.evidence_urls.length} Evidence
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Fraud Indicators Section */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Report Reason Detected</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`font-bold text-red-600 uppercase`}>
                        {reasonRiskLevel[selectedReport.reason]?.toUpperCase() || 'MEDIUM'}:
                      </span>
                      <span className="font-semibold text-slate-900">{reasonLabels[selectedReport.reason] || selectedReport.reason}</span>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 ml-auto">
                        {reasonRiskLevel[selectedReport.reason] || 'medium'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                {/* Evidence */}
                {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Evidence ({selectedReport.evidence_urls.length}):</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedReport.evidence_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-32 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Action Section */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Admin Action</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="action-taken">Action to Take</Label>
                      <Select
                        value={actionTaken}
                        onValueChange={(value: any) => setActionTaken(value)}
                        disabled={processingId === selectedReport.id}
                      >
                        <SelectTrigger id="action-taken" className="w-full">
                          <SelectValue placeholder="Select an action" />
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
                      <Label htmlFor="admin-notes">Admin Notes</Label>
                      <Textarea
                        id="admin-notes"
                        placeholder="Add notes about your investigation and decision..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="min-h-[120px] resize-y"
                        disabled={processingId === selectedReport.id}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedReport(null);
                    setAdminNotes('');
                    setActionTaken('none');
                  }}
                  disabled={processingId === selectedReport.id}
                >
                  Cancel
                </Button>
                {selectedReport.status !== 'investigating' && (
                  <Button
                    onClick={() => handleUpdateStatus('investigating')}
                    disabled={processingId === selectedReport.id}
                    variant="outline"
                    className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Mark as Investigating
                  </Button>
                )}
                {actionTaken !== 'none' && (
                  <Button
                    onClick={handleTakeAction}
                    disabled={processingId === selectedReport.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {actionTaken === 'warning_sent' && 'Send Warning'}
                    {actionTaken === 'listing_removed' && 'Remove Listing'}
                    {actionTaken === 'user_suspended' && 'Suspend User'}
                    {actionTaken === 'user_banned' && 'Ban User'}
                  </Button>
                )}
                {selectedReport.status !== 'resolved' && actionTaken === 'none' && (
                  <Button
                    onClick={() => handleUpdateStatus('resolved')}
                    disabled={processingId === selectedReport.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
