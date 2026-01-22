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
import { AlertTriangle, User as UserIcon, Eye, Ban, CheckCircle, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Link from 'next/link';

// TypeScript interfaces
interface UserReport {
  id: string;
  reporter_email: string;
  reported_email: string;
  reason: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  evidence_urls?: string[];
  admin_notes?: string;
  action_taken?: string;
  created_date: string;
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

const statusColors = {
  pending: "bg-red-100 text-red-800 border-red-200",
  under_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  dismissed: "bg-gray-100 text-gray-800 border-gray-200"
};

const reasonLabels: Record<string, string> = {
  harassment: "Harassment or Bullying",
  spam: "Spam or Scam",
  fraud: "Fraudulent Activity",
  inappropriate_content: "Inappropriate Content",
  other: "Other"
};

export default function AdminUserReportsPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resolutionData, setResolutionData] = useState<{
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

      const reportsResponse = await api.request<UserReport[]>('/user-reports');
      const allReports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
      setReports(allReports);

      // Load user data for all involved parties
      const involvedEmails = new Set<string>();
      allReports.forEach(report => {
        involvedEmails.add(report.reporter_email);
        involvedEmails.add(report.reported_email);
      });

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
      console.error("Error loading user reports:", error);
    }
    setIsLoading(false);
  };

  const handleOpenReport = (report: UserReport) => {
    setSelectedReport(report);
    setResolutionData({
      admin_notes: report.admin_notes || '',
      action_taken: 'none'
    });
  };

  const handleResolveReport = async (status: string) => {
    if (!selectedReport) return;
    
    setIsUpdating(true);
    try {
      await api.request(`/user-reports/${selectedReport.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: status,
          admin_notes: resolutionData.admin_notes
        }),
      });

      const reportedUserUsername = usersMap[selectedReport.reported_email]?.username || 'a user';
      const reporterUserUsername = usersMap[selectedReport.reporter_email]?.username || 'a user';

      if (status === 'dismissed') {
        // Notify reported user (no action taken)
        await sendNotification({
          user_email: selectedReport.reported_email,
          type: 'report_outcome',
          title: '✅ Report Dismissed',
          message: 'A report filed against you has been reviewed and dismissed. No action was taken on your account.',
          related_id: selectedReport.id,
          link: `/Profile`
        });

        // Notify reporter
        await sendNotification({
          user_email: selectedReport.reporter_email,
          type: 'report_outcome',
          title: '✅ Report Update: Dismissed',
          message: `Your report concerning @${reportedUserUsername} has been reviewed and dismissed. No action was taken. Thank you for your vigilance.`,
          related_id: selectedReport.id,
          link: `/Profile`
        });
        alert("Report dismissed successfully! Notifications sent to relevant parties.");
      } else if (status === 'under_review') {
        // Notify reporter that the report is under review
        await sendNotification({
          user_email: selectedReport.reporter_email,
          type: 'report_outcome',
          title: '⏳ Report Update: Under Review',
          message: `Your report concerning @${reportedUserUsername} is now under review. We will notify you once a final decision has been made.`,
          related_id: selectedReport.id,
          link: `/Profile`
        });
        alert("Report marked as 'Under Review'. Reporter has been notified.");
      } else {
        // Fallback for other statuses if needed, though current UI only uses 'dismissed' and 'under_review' here.
        alert(`Report status updated to ${status.replace('_', ' ')}!`);
      }

      await loadData();
      setSelectedReport(null);
    } catch (error) {
      console.error("Error resolving report:", error);
      alert("Failed to resolve report. Please try again.");
    }
    setIsUpdating(false);
  };

  const handleTakeAction = async () => {
    if (!selectedReport || !resolutionData.action_taken || resolutionData.action_taken === 'none') {
      alert("Please select an action to take.");
      return;
    }

    setIsUpdating(true);
    try {
      // Update report with action taken
      await api.request(`/user-reports/${selectedReport.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'resolved',
          admin_notes: resolutionData.admin_notes
        }),
      });

      const reportedUserUsername = usersMap[selectedReport.reported_email]?.username || 'a user';
      const reporterUserUsername = usersMap[selectedReport.reporter_email]?.username || 'a user';

      const actionMessages: Record<string, string> = {
        warning_sent: "⚠️ Warning Issued",
        user_suspended: "🚫 Account Suspended",
        user_banned: "❌ Account Banned"
      };

      const actionDescriptions: Record<string, string> = {
        warning_sent: "You have received a warning for violating our community guidelines. Continued violations may result in account suspension.",
        user_suspended: "Your account has been temporarily suspended for 7 days due to policy violations. During this time, you will not be able to list items or make rental requests.",
        user_banned: "Your account has been permanently banned for serious violations of our terms of service. If you believe this is an error, please contact support."
      };

      // Notify reported user about the specific action taken
      const actionMessage = actionMessages[resolutionData.action_taken];
      const actionDescription = actionDescriptions[resolutionData.action_taken];
      if (actionMessage && actionDescription) {
        await sendNotification({
          user_email: selectedReport.reported_email,
          type: 'account_action',
          title: actionMessage,
          message: actionDescription,
          related_id: selectedReport.id,
          link: `/Profile`
        });
      }

      // Notify reporter that action has been taken
      await sendNotification({
        user_email: selectedReport.reporter_email,
        type: 'report_outcome',
        title: '✅ Report Update: Action Taken',
        message: `Your report concerning @${reportedUserUsername} has been reviewed and appropriate action has been taken. Thank you for helping keep our community safe.`,
        related_id: selectedReport.id,
        link: `/Profile`
      });

      await loadData();
      setSelectedReport(null);
      alert(`Action taken: ${resolutionData.action_taken}. Relevant parties have been notified.`);
    } catch (error) {
      console.error("Error taking action:", error);
      alert("Failed to take action. Please try again.");
    }
    setIsUpdating(false);
  };

  const ReportCard = ({ report }: { report: UserReport }) => {
    const reporter = usersMap[report.reporter_email];
    const reported = usersMap[report.reported_email];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg mb-4 hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg">
                    {reasonLabels[report.reason] || report.reason}
                  </CardTitle>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <div>Reported: {format(new Date(report.created_date), "MMM d, yyyy")}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${statusColors[report.status]} border shadow-sm`}>
                  {report.status.replace('_', ' ').toUpperCase()}
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
            <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Reported By:</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                    {reporter?.profile_picture ? (
                      <img src={reporter.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{reporter?.full_name || "User"}</p>
                    {reporter?.username && (
                      <Link href={`/PublicProfile?username=${reporter.username}`} className="text-xs text-slate-600 hover:underline">
                        @{reporter.username}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Reported User:</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                    {reported?.profile_picture ? (
                      <img src={reported.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{reported?.full_name || "User"}</p>
                    {reported?.username && (
                      <Link href={`/PublicProfile?username=${reported.username}`} className="text-xs text-slate-600 hover:underline">
                        @{reported.username}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-900 mb-2"><strong>Description:</strong></p>
              <p className="text-sm text-red-800">{report.description}</p>
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

  const pendingReports = reports.filter(r => r.status === 'pending');
  const underReviewReports = reports.filter(r => r.status === 'under_review');
  const resolvedReports = reports.filter(r => r.status === 'resolved');
  const dismissedReports = reports.filter(r => r.status === 'dismissed');

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
              <AlertTriangle className="w-8 h-8 text-red-500" />
              User Reports
            </h1>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {reports.length} Total Reports
            </Badge>
          </div>
          <p className="text-slate-600">Review and take action on reported users</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4 m-6 mb-0">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Pending ({pendingReports.length})
                </TabsTrigger>
                <TabsTrigger value="under_review" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Under Review ({underReviewReports.length})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resolved ({resolvedReports.length})
                </TabsTrigger>
                <TabsTrigger value="dismissed" className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Dismissed ({dismissedReports.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="p-6">
                {pendingReports.length > 0 ? (
                  <div>
                    {pendingReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No pending reports</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="under_review" className="p-6">
                {underReviewReports.length > 0 ? (
                  <div>
                    {underReviewReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No reports under review</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resolved" className="p-6">
                {resolvedReports.length > 0 ? (
                  <div>
                    {resolvedReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No resolved reports</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dismissed" className="p-6">
                {dismissedReports.length > 0 ? (
                  <div>
                    {dismissedReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No dismissed reports</h3>
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
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Review User Report
              </DialogTitle>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-6 py-4">
                {/* Report Details */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Reason</p>
                      <p className="font-semibold">{reasonLabels[selectedReport.reason] || selectedReport.reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Reported</p>
                      <p className="font-semibold">{format(new Date(selectedReport.created_date), "PPP 'at' p")}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-sm">{selectedReport.description}</p>
                  </div>
                </div>

                {/* Evidence Photos */}
                {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Evidence ({selectedReport.evidence_urls.length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReport.evidence_urls.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={url} 
                            alt={`Evidence ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Action */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Admin Action</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Action to Take</Label>
                      <Select 
                        value={resolutionData.action_taken}
                        onValueChange={(value) => setResolutionData(prev => ({ ...prev, action_taken: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Action</SelectItem>
                          <SelectItem value="warning_sent">Send Warning</SelectItem>
                          <SelectItem value="user_suspended">Suspend User (7 days)</SelectItem>
                          <SelectItem value="user_banned">Ban User Permanently</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Admin Notes</Label>
                      <Textarea
                        value={resolutionData.admin_notes}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, admin_notes: e.target.value }))}
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
                onClick={() => handleResolveReport('under_review')}
                disabled={isUpdating}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Mark as Under Review
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveReport('dismissed')}
                disabled={isUpdating}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Dismiss
              </Button>
              <Button
                onClick={handleTakeAction}
                disabled={isUpdating || resolutionData.action_taken === 'none'}
                className="bg-red-600 hover:bg-red-700"
              >
                <Ban className="w-4 h-4 mr-2" />
                Take Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
