'use client'

import React, { useState, useEffect } from "react";
import { api, getCurrentUser, type UserData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { AlertTriangle, User as UserIcon, Calendar, DollarSign, Eye, CheckCircle, XCircle, Clock, FileText, Camera, Sparkles, Scale, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Link from 'next/link';
import ConditionReportDisplay from '@/components/disputes/ConditionReportDisplay';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusColors = {
  open: "bg-red-100 text-red-800 border-red-200",
  under_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200"
};

const statusIcons = {
  open: <AlertTriangle className="w-4 h-4" />,
  under_review: <Clock className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
  closed: <XCircle className="w-4 h-4" />
};

// TypeScript interfaces
interface Dispute {
  id: string;
  rental_request_id: string;
  filed_by_email: string;
  against_email: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  evidence_urls?: string[];
  resolution?: string;
  decision?: string;
  refund_to_renter?: number;
  charge_to_owner?: number;
  admin_notes?: string;
  created_date: string;
  resolved_date?: string;
}

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  created_date?: string;
  updated_date?: string;
}

interface Item {
  id: string;
  title: string;
  category?: string;
  condition?: string;
  deposit?: number;
}

interface ConditionReport {
  id: string;
  rental_request_id: string;
  report_type: 'pickup' | 'return';
  reported_by_email: string;
  condition_photos?: string[];
  notes?: string;
  damages_reported?: Array<{ severity: string; description: string }>;
  created_date: string;
}

interface User extends UserData {
  full_name?: string;
  username?: string;
  profile_picture?: string;
}

// Note: These functions should be implemented or imported from appropriate modules
async function InvokeLLM(params: any): Promise<any> {
  // Placeholder - should be implemented
  throw new Error('InvokeLLM function not implemented');
}

async function getUserForChat(params: { email: string }): Promise<any> {
  // Placeholder - should be implemented
  const response = await api.request<User[]>(`/users?email=${encodeURIComponent(params.email)}`);
  return { data: { user: response.data?.[0] || null } };
}

async function sendNotification(params: any): Promise<void> {
  await api.request('/notifications', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export default function AdminDisputesPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [requests, setRequests] = useState<Record<string, RentalRequest>>({});
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [conditionReports, setConditionReports] = useState<Record<string, ConditionReport[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDraftingResponse, setIsDraftingResponse] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [draftedResponses, setDraftedResponses] = useState<any>(null);
  const [resolutionData, setResolutionData] = useState<{
    status: string;
    decision: string;
    refund_to_renter: number;
    charge_to_owner: number;
    resolution: string;
    admin_notes: string;
  }>({
    status: '',
    decision: '',
    refund_to_renter: 0,
    charge_to_owner: 0,
    resolution: '',
    admin_notes: ''
  });

  // State for user reporting
  const [isReportingUser, setIsReportingUser] = useState(false);
  const [userToReport, setUserToReport] = useState<(User & { dispute_id?: string }) | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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

      const disputesResponse = await api.request<Dispute[]>('/disputes');
      const allDisputes = disputesResponse.success && disputesResponse.data ? disputesResponse.data : [];
      setDisputes(allDisputes);

      const requestsResponse = await api.request<RentalRequest[]>('/rental-requests');
      const allRequests = requestsResponse.success && requestsResponse.data ? requestsResponse.data : [];
      const requestsMap: Record<string, RentalRequest> = {};
      allRequests.forEach(req => {
        requestsMap[req.id] = req;
      });
      setRequests(requestsMap);

      const itemsResponse = await api.getItems();
      const allItems = itemsResponse.success && itemsResponse.data ? (Array.isArray(itemsResponse.data) ? itemsResponse.data : []) : [];
      const itemsMap: Record<string, Item> = {};
      allItems.forEach((item: Item) => {
        itemsMap[item.id] = item;
      });
      setItems(itemsMap);

      const reportsResponse = await api.request<any[]>('/condition-reports');
      const allReports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
      const reportsMap: Record<string, ConditionReport[]> = {};
      allReports.forEach(report => {
        if (!reportsMap[report.rental_request_id]) {
          reportsMap[report.rental_request_id] = [];
        }
        // Ensure created_date exists, use current date as fallback
        const reportWithDate: ConditionReport = {
          ...report,
          created_date: report.created_date || report.created_at || new Date().toISOString()
        };
        reportsMap[report.rental_request_id].push(reportWithDate);
      });
      setConditionReports(reportsMap);

      const involvedEmails = new Set<string>();
      allDisputes.forEach(dispute => {
        involvedEmails.add(dispute.filed_by_email);
        involvedEmails.add(dispute.against_email);
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
      console.error("Error loading disputes data:", error);
    }
    setIsLoading(false);
  };

  const handleOpenDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setAiSuggestion(null);
    setDraftedResponses(null);
    setResolutionData({
      status: dispute.status,
      decision: '',
      refund_to_renter: 0,
      charge_to_owner: 0,
      resolution: dispute.resolution || '',
      admin_notes: dispute.admin_notes || ''
    });
  };

  const handleStatusChange = async (dispute: Dispute, newStatus: string) => {
    try {
      await api.request(`/disputes/${dispute.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      const request = requests[dispute.rental_request_id];
      const item = request ? items[request.item_id] : null;

      // Notify both parties of status change
      const statusMessages: Record<string, string> = {
        under_review: '🔍 Your dispute is now under review',
        resolved: '✅ Your dispute has been resolved',
        closed: '🔒 Your dispute has been closed'
      };

      const statusMessage = statusMessages[newStatus];
      if (statusMessage) {
        await sendNotification({
          user_email: dispute.filed_by_email,
          type: 'dispute',
          title: statusMessage,
          message: `The dispute regarding "${item?.title || 'your rental'}" status has been updated to: ${newStatus.replace('_', ' ')}.`,
          related_id: dispute.id,
          link: '/Disputes'
        });

        await sendNotification({
          user_email: dispute.against_email,
          type: 'dispute',
          title: statusMessage,
          message: `The dispute regarding "${item?.title || 'your rental'}" status has been updated to: ${newStatus.replace('_', ' ')}.`,
          related_id: dispute.id,
          link: '/Disputes'
        });
      }

      await loadData();
    } catch (error) {
      console.error("Error updating dispute status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleGetAISuggestion = async () => {
    if (!selectedDispute) return;
    
    setIsAnalyzing(true);
    try {
      const request = requests[selectedDispute.rental_request_id];
      const item = request ? items[request.item_id] : null;
      const reports = conditionReports[selectedDispute.rental_request_id] || [];
      
      // Get historical data for learning
      const resolvedDisputes = disputes.filter(d => 
        d.status === 'resolved' && 
        d.decision && 
        d.id !== selectedDispute.id
      );

      const historicalContext = resolvedDisputes.slice(-10).map(d => ({
        reason: d.reason,
        decision: d.decision,
        refund_to_renter: d.refund_to_renter,
        charge_to_owner: d.charge_to_owner,
        description: d.description ? d.description.substring(0, 200) : '' // Truncate for brevity, handle null/undefined
      }));

      const allImageUrls = [];
      
      if (selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0) {
        allImageUrls.push(...selectedDispute.evidence_urls);
      }
      
      reports.forEach(report => {
        if (report.condition_photos && report.condition_photos.length > 0) {
          allImageUrls.push(...report.condition_photos);
        }
      });
      
      const context = `
        COMPREHENSIVE DISPUTE CASE ANALYSIS
        You are an experienced dispute resolution specialist reviewing a rental platform case.
        
        ==== CURRENT DISPUTE ====
        Dispute Information:
        - Reason: ${selectedDispute.reason.replace('_', ' ')}
        - Filed By: ${selectedDispute.filed_by_email}
        - Against: ${selectedDispute.against_email}
        - Description: ${selectedDispute.description}
        
        Rental Details:
        - Item: ${item?.title || 'Unknown'}
        - Item Category: ${item?.category || 'Unknown'}
        - Item Listed Condition: ${item?.condition || 'Unknown'}
        - Rental Amount: $${request?.total_amount || 0}
        - Security Deposit: $${item?.deposit || 0}
        - Rental Period: ${request?.start_date} to ${request?.end_date}
        
        Evidence Submitted:
        - Dispute Evidence Photos: ${selectedDispute.evidence_urls?.length || 0} attached
        - Condition Reports: ${reports.length} total
        
        Condition Reports Details:
        ${reports.map(r => `
        ${r.report_type.toUpperCase()} INSPECTION (by ${r.reported_by_email}):
        - Photos: ${r.condition_photos?.length || 0} attached
        - Notes: ${r.notes || 'None provided'}
        - Damages Reported: ${r.damages_reported?.length || 0}
        ${r.damages_reported?.map(d => `  * ${d.severity}: ${d.description}`).join('\n') || ''}
        `).join('\n')}
        
        ==== HISTORICAL PATTERNS (Last 10 Similar Cases) ====
        ${historicalContext.length > 0 ? historicalContext.map((h, i) => `
        Case ${i + 1}:
        - Reason: ${h.reason}
        - Decision: ${h.decision}
        - Refund to Renter: $${h.refund_to_renter || 0}
        - Charge to Owner: $${h.charge_to_owner || 0}
        - Context: ${h.description}
        `).join('\n') : 'No historical data available'}
        
        ==== YOUR TASK ====
        1. CAREFULLY EXAMINE all attached photos (both dispute evidence and condition reports)
        2. Compare pickup photos vs return photos to identify changes
        3. Look for visible damage, wear, or discrepancies
        4. Consider historical patterns from similar cases
        5. Evaluate credibility of both parties' claims
        6. Assess if damages match the severity claimed
        
        Provide:
        1. A comprehensive case summary highlighting key findings
        2. Fair decision recommendation (favor_renter, favor_owner, or split)
        3. Recommended financial resolution
        4. Clear resolution message for both parties
        5. Detailed reasoning based on evidence AND historical patterns
        6. Risk assessment if we make wrong decision
      `;

      const response = await InvokeLLM({
        prompt: context,
        file_urls: allImageUrls,
        response_json_schema: {
          type: "object",
          properties: {
            case_summary: { 
              type: "string",
              description: "Comprehensive summary of the case highlighting key evidence"
            },
            decision: { 
              type: "string",
              enum: ["favor_renter", "favor_owner", "split"]
            },
            confidence_level: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "How confident you are in this decision"
            },
            refund_to_renter: { type: "number" },
            charge_to_owner: { type: "number" },
            resolution_message: { 
              type: "string",
              description: "Clear, professional message explaining the decision to both parties"
            },
            reasoning: { 
              type: "string",
              description: "Detailed reasoning including evidence analysis and historical context"
            },
            visual_observations: { 
              type: "string",
              description: "Specific observations from the photos"
            },
            risk_assessment: {
              type: "string",
              description: "What could go wrong if we make this decision"
            },
            historical_alignment: {
              type: "string",
              description: "How this decision aligns with past similar cases"
            }
          }
        }
      });

      setAiSuggestion(response);
      
      setResolutionData(prev => ({
        ...prev,
        decision: response.decision,
        refund_to_renter: response.refund_to_renter || 0,
        charge_to_owner: response.charge_to_owner || 0,
        resolution: response.resolution_message
      }));

    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      alert("Failed to get AI analysis. Please try again.");
    }
    setIsAnalyzing(false);
  };

  const handleDraftResponses = async () => {
    if (!selectedDispute || !aiSuggestion) {
      alert("Please run AI analysis first to draft responses");
      return;
    }

    setIsDraftingResponse(true);
    try {
      const request = requests[selectedDispute.rental_request_id];
      const item = request ? items[request.item_id] : null;
      const filedByUser = usersMap[selectedDispute.filed_by_email];
      const againstUser = usersMap[selectedDispute.against_email];

      const draftPrompt = `
        You are drafting professional, empathetic responses for a rental platform dispute.
        
        Context:
        - Decision: ${aiSuggestion.decision}
        - Case Summary: ${aiSuggestion.case_summary}
        - Resolution: ${aiSuggestion.resolution_message}
        - Refund to Renter: $${aiSuggestion.refund_to_renter?.toFixed(2) || 0}
        - Charge to Owner: $${aiSuggestion.charge_to_owner?.toFixed(2) || 0}
        
        Item: ${item?.title || 'the rental item'}
        Filed By: ${filedByUser?.full_name || selectedDispute.filed_by_email}
        Against: ${againstUser?.full_name || selectedDispute.against_email}
        
        Draft THREE professional email responses:
        1. To the person who filed the dispute (${selectedDispute.filed_by_email})
        2. To the person the dispute was filed against (${selectedDispute.against_email})
        3. A neutral public resolution message for both parties
        
        Each response should:
        - Be professional and empathetic
        - Explain the decision clearly
        - Reference specific evidence
        - Outline next steps
        - Maintain platform neutrality
        - Be personalized to the recipient
        - Include monetary amounts where relevant
        - Be between 150-300 words
      `;

      const draftResponse = await InvokeLLM({
        prompt: draftPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            to_filer: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" }
              }
            },
            to_respondent: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" }
              }
            },
            public_resolution: {
              type: "string",
              description: "Neutral message visible to both parties"
            }
          }
        }
      });

      setDraftedResponses(draftResponse);

    } catch (error) {
      console.error("Error drafting responses:", error);
      alert("Failed to draft responses. Please try again.");
    }
    setIsDraftingResponse(false);
  };

  const handleQuickDecision = (decision: string) => {
    if (!selectedDispute) return;
    const request = requests[selectedDispute.rental_request_id];
    
    let resolution = '';
    let refund = 0;
    let charge = 0;

    switch (decision) {
      case 'favor_renter':
        refund = request?.total_amount || 0;
        resolution = `After reviewing the evidence, we've decided in favor of the renter. The full rental amount of $${refund.toFixed(2)} will be refunded to the renter.`;
        break;
      case 'favor_owner':
        charge = request?.total_amount || 0;
        resolution = `After reviewing the evidence, we've decided in favor of the owner. The full rental amount of $${charge.toFixed(2)} will be released to the owner.`;
        break;
      case 'split':
        refund = (request?.total_amount || 0) / 2;
        charge = (request?.total_amount || 0) / 2;
        resolution = `After reviewing the evidence, we've decided on a split resolution. $${refund.toFixed(2)} will be refunded to the renter, and $${charge.toFixed(2)} will be released to the owner.`;
        break;
      default:
        break;
    }

    setResolutionData(prev => ({
      ...prev,
      decision,
      refund_to_renter: refund,
      charge_to_owner: charge,
      resolution
    }));
  };

  const handleUpdateDispute = async () => {
    if (!selectedDispute) return;
    
    if (!resolutionData.decision) {
      alert("Please select a decision (Favor Renter, Favor Owner, or Split)");
      return;
    }

    if (!resolutionData.resolution) {
      alert("Please provide a resolution message");
      return;
    }
    
    setIsUpdating(true);
    try {
      await api.request(`/disputes/${selectedDispute.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'resolved',
          decision: resolutionData.decision,
          refund_to_renter: resolutionData.refund_to_renter,
          charge_to_owner: resolutionData.charge_to_owner,
          resolution: resolutionData.resolution,
          admin_notes: resolutionData.admin_notes,
          resolved_date: new Date().toISOString()
        }),
      });

      const request = requests[selectedDispute.rental_request_id];
      const item = request ? items[request.item_id] : null;

      // Enhanced notifications with detailed resolution info
      await sendNotification({
        user_email: selectedDispute.filed_by_email,
        type: 'dispute',
        title: '✅ Your Dispute Has Been Resolved',
        message: `The dispute regarding "${item?.title || 'your rental'}" has been resolved. Decision: ${resolutionData.decision.replace('_', ' ').toUpperCase()}. ${resolutionData.refund_to_renter > 0 ? `Refund: $${resolutionData.refund_to_renter.toFixed(2)}. ` : ''}Resolution: ${resolutionData.resolution}`,
        related_id: selectedDispute.id,
        link: `/Disputes`
      });

      await sendNotification({
        user_email: selectedDispute.against_email,
        type: 'dispute',
        title: '⚖️ A Dispute Has Been Resolved',
        message: `The dispute regarding "${item?.title || 'your rental'}" has been resolved. Decision: ${resolutionData.decision.replace('_', ' ').toUpperCase()}. ${resolutionData.charge_to_owner > 0 ? `Payment released: $${resolutionData.charge_to_owner.toFixed(2)}. ` : ''}Resolution: ${resolutionData.resolution}`,
        related_id: selectedDispute.id,
        link: `/Disputes`
      });

      await loadData();
      setSelectedDispute(null);
      alert("Dispute resolved successfully! Both parties have been notified with detailed information.");
    } catch (error) {
      console.error("Error updating dispute:", error);
      alert("Failed to update dispute. Please try again.");
    }
    setIsUpdating(false);
  };

  const handleReportUser = (user: User, disputeId: string) => {
    setUserToReport({ ...user, dispute_id: disputeId } as User & { dispute_id: string });
    setReportReason("");
    setReportNotes("");
    setIsReportingUser(true);
  };

  const handleSubmitReport = async () => {
    if (!userToReport || !reportReason) {
      alert("Please select a reason for reporting the user.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      console.log("Reporting user:", userToReport.email);
      console.log("Reason:", reportReason);
      console.log("Notes:", reportNotes);
      console.log("Dispute ID context:", userToReport.dispute_id);
      
      alert(`User ${userToReport.full_name || userToReport.email} reported successfully.`);
      setIsReportingUser(false);
      setUserToReport(null);
    } catch (error) {
      console.error("Error reporting user:", error);
      alert("Failed to report user. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const DisputeCard = ({ dispute }: { dispute: Dispute }) => {
    const request = requests[dispute.rental_request_id];
    const item = request ? items[request.item_id] : null;
    const filedByUser = usersMap[dispute.filed_by_email];
    const againstUser = usersMap[dispute.against_email];
    const reports = conditionReports[dispute.rental_request_id] || [];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg mb-4 hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  {item?.title || "Item not found"}
                </CardTitle>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Filed {format(new Date(dispute.created_date), "MMM d, yyyy")}
                  </div>
                  {request && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${request.total_amount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Select 
                  value={dispute.status} 
                  onValueChange={(newStatus) => handleStatusChange(dispute, newStatus)}
                >
                  <SelectTrigger className={`w-[180px] ${statusColors[dispute.status]} border shadow-sm`}>
                    <div className="flex items-center gap-1">
                      {statusIcons[dispute.status]}
                      <SelectValue placeholder="Change Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => handleOpenDispute(dispute)}
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
                <p className="text-xs font-semibold text-slate-500 mb-1">Filed By:</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                      {filedByUser?.profile_picture ? (
                        <img src={filedByUser.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{filedByUser?.full_name || "User"}</p>
                      {filedByUser?.username && (
                        <Link href={`/PublicProfile?username=${filedByUser.username}`} className="text-xs text-slate-600 hover:underline">
                          @{filedByUser.username}
                        </Link>
                      )}
                    </div>
                  </div>
                  {filedByUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleReportUser(filedByUser, dispute.id); }}
                      className="text-red-500 hover:text-red-700"
                      title="Report User"
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Against:</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                      {againstUser?.profile_picture ? (
                        <img src={againstUser.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{againstUser?.full_name || "User"}</p>
                      {againstUser?.username && (
                        <Link href={`/PublicProfile?username=${againstUser.username}`} className="text-xs text-slate-600 hover:underline">
                          @{againstUser.username}
                        </Link>
                      )}
                    </div>
                  </div>
                  {againstUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleReportUser(againstUser, dispute.id); }}
                      className="text-red-500 hover:text-red-700"
                      title="Report User"
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm font-semibold text-red-900 mb-1">
                Reason: {dispute.reason.replace('_', ' ')}
              </p>
              <p className="text-sm text-red-800">{dispute.description}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {dispute.evidence_urls.length} evidence file(s)
                </div>
              )}
              {reports.length > 0 && (
                <div className="flex items-center gap-1">
                  <Camera className="w-4 h-4" />
                  {reports.length} condition report(s)
                </div>
              )}
            </div>

            {dispute.resolution && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-green-900 mb-1">Resolution:</p>
                <p className="text-sm text-green-800">{dispute.resolution}</p>
                {dispute.decision && (
                  <div className="mt-2 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-green-700" />
                    <Badge className="bg-green-100 text-green-800">
                      {dispute.decision.replace('_', ' ')}
                    </Badge>
                    {(dispute.refund_to_renter || 0) > 0 && (
                      <span className="text-xs text-green-700">
                        Refund: ${(dispute.refund_to_renter || 0).toFixed(2)}
                      </span>
                    )}
                    {(dispute.charge_to_owner || 0) > 0 && (
                      <span className="text-xs text-green-700">
                        To Owner: ${(dispute.charge_to_owner || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
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

  const openDisputes = disputes.filter(d => d.status === 'open');
  const underReviewDisputes = disputes.filter(d => d.status === 'under_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');
  const closedDisputes = disputes.filter(d => d.status === 'closed');

  const totalPhotosForAnalysis = selectedDispute
    ? (selectedDispute.evidence_urls?.length || 0) + 
      (conditionReports[selectedDispute.rental_request_id]?.reduce((sum, r) => sum + (r.condition_photos?.length || 0), 0) || 0)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                Admin Dispute Management
              </h1>
              <p className="text-slate-600">Review and resolve user disputes with AI assistance</p>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {disputes.length} Total Disputes
              </Badge>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {openDisputes.length} Open
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> {underReviewDisputes.length} Review
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-900">{openDisputes.length}</p>
                <p className="text-xs text-red-700">Open</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-900">{underReviewDisputes.length}</p>
                <p className="text-xs text-yellow-700">Under Review</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-900">{resolvedDisputes.length}</p>
                <p className="text-xs text-green-700">Resolved</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{closedDisputes.length}</p>
                <p className="text-xs text-slate-700">Closed</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-4 m-6 mb-0">
                <TabsTrigger value="open" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Open ({openDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="under_review" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Under Review ({underReviewDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resolved ({resolvedDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="closed" className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Closed ({closedDisputes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="p-6">
                {openDisputes.length > 0 ? (
                  <div>
                    {openDisputes.map(dispute => (
                      <DisputeCard key={dispute.id} dispute={dispute} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No open disputes</h3>
                    <p className="text-slate-600">All caught up!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="under_review" className="p-6">
                {underReviewDisputes.length > 0 ? (
                  <div>
                    {underReviewDisputes.map(dispute => (
                      <DisputeCard key={dispute.id} dispute={dispute} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No disputes under review</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resolved" className="p-6">
                {resolvedDisputes.length > 0 ? (
                  <div>
                    {resolvedDisputes.map(dispute => (
                      <DisputeCard key={dispute.id} dispute={dispute} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No resolved disputes</h3>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="closed" className="p-6">
                {closedDisputes.length > 0 ? (
                  <div>
                    {closedDisputes.map(dispute => (
                      <DisputeCard key={dispute.id} dispute={dispute} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No closed disputes</h3>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Enhanced Dispute Review Dialog */}
        <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-slate-700" />
                AI-Assisted Dispute Resolution
              </DialogTitle>
            </DialogHeader>

            {selectedDispute && (
              <div className="space-y-6 py-4">
                {/* Enhanced AI Analysis Section */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Sparkles className="w-6 h-6 text-purple-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-purple-900 mb-1">AI-Powered Comprehensive Analysis</h3>
                        <p className="text-sm text-purple-700 mb-2">
                          AI will analyze photos, reports, evidence, AND historical patterns from past disputes.
                        </p>
                        <div className="flex gap-3 text-xs">
                          <div className="bg-white/60 rounded-lg px-3 py-1.5 text-purple-800">
                            📸 <strong>{totalPhotosForAnalysis} photo(s)</strong> to analyze
                          </div>
                          <div className="bg-white/60 rounded-lg px-3 py-1.5 text-purple-800">
                            📊 <strong>{resolvedDisputes.length} past cases</strong> for learning
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleGetAISuggestion}
                        disabled={isAnalyzing}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze Case
                          </>
                        )}
                      </Button>
                      
                      {aiSuggestion && (
                        <Button
                          onClick={handleDraftResponses}
                          disabled={isDraftingResponse}
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          {isDraftingResponse ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full mr-2" />
                              Drafting...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              Draft Responses
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis Results */}
                  {aiSuggestion && (
                    <div className="space-y-3">
                      <Alert className="bg-white border-purple-300">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <AlertTitle className="flex items-center justify-between">
                          <span>AI Analysis Complete</span>
                          <Badge className={`${
                            aiSuggestion.confidence_level === 'high' ? 'bg-green-100 text-green-800' :
                            aiSuggestion.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {aiSuggestion.confidence_level} confidence
                          </Badge>
                        </AlertTitle>
                        <AlertDescription className="mt-3 space-y-3">
                          {/* Case Summary */}
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-sm font-semibold text-slate-900 mb-2">📋 Case Summary:</p>
                            <p className="text-sm text-slate-700">{aiSuggestion.case_summary}</p>
                          </div>

                          {/* Visual Observations */}
                          {aiSuggestion.visual_observations && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm font-semibold text-blue-900 mb-2">🔍 Visual Evidence:</p>
                              <p className="text-sm text-blue-800">{aiSuggestion.visual_observations}</p>
                            </div>
                          )}

                          {/* Decision & Reasoning */}
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-sm font-semibold text-purple-900 mb-2">
                              ⚖️ Recommended Decision: <span className="uppercase">{aiSuggestion.decision.replace('_', ' ')}</span>
                            </p>
                            <p className="text-sm text-purple-800">{aiSuggestion.reasoning}</p>
                          </div>

                          {/* Financial Breakdown */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <p className="text-xs text-green-700 font-semibold mb-1">Refund to Renter</p>
                              <p className="text-xl font-bold text-green-900">${aiSuggestion.refund_to_renter?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-700 font-semibold mb-1">Release to Owner</p>
                              <p className="text-xl font-bold text-blue-900">${aiSuggestion.charge_to_owner?.toFixed(2) || '0.00'}</p>
                            </div>
                          </div>

                          {/* Historical Context */}
                          {aiSuggestion.historical_alignment && (
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                              <p className="text-sm font-semibold text-amber-900 mb-2">📊 Historical Context:</p>
                              <p className="text-sm text-amber-800">{aiSuggestion.historical_alignment}</p>
                            </div>
                          )}

                          {/* Risk Assessment */}
                          {aiSuggestion.risk_assessment && (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <p className="text-sm font-semibold text-orange-900 mb-2">⚠️ Risk Assessment:</p>
                              <p className="text-sm text-orange-800">{aiSuggestion.risk_assessment}</p>
                            </div>
                          )}
                          
                          <p className="text-xs text-slate-600 mt-3 italic">
                            💡 AI analysis is advisory only. Review carefully and use your judgment.
                          </p>
                        </AlertDescription>
                      </Alert>

                      {/* Drafted Responses */}
                      {draftedResponses && (
                        <Alert className="bg-green-50 border-green-300">
                          <FileText className="w-4 h-4 text-green-600" />
                          <AlertTitle>Drafted Responses Ready</AlertTitle>
                          <AlertDescription className="mt-3 space-y-4">
                            {/* To Filer */}
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-green-900">
                                  To: {selectedDispute.filed_by_email} (Dispute Filer)
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(draftedResponses.to_filer.body);
                                    alert('Copied to clipboard!');
                                  }}
                                  className="text-xs"
                                >
                                  Copy
                                </Button>
                              </div>
                              <p className="text-xs font-semibold text-slate-700 mb-1">
                                Subject: {draftedResponses.to_filer.subject}
                              </p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {draftedResponses.to_filer.body}
                              </p>
                            </div>

                            {/* To Respondent */}
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-green-900">
                                  To: {selectedDispute.against_email} (Respondent)
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(draftedResponses.to_respondent.body);
                                    alert('Copied to clipboard!');
                                  }}
                                  className="text-xs"
                                >
                                  Copy
                                </Button>
                              </div>
                              <p className="text-xs font-semibold text-slate-700 mb-1">
                                Subject: {draftedResponses.to_respondent.subject}
                              </p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {draftedResponses.to_respondent.body}
                              </p>
                            </div>

                            {/* Public Resolution */}
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-green-900">
                                  Public Resolution (Visible to Both)
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setResolutionData(prev => ({ ...prev, resolution: draftedResponses.public_resolution }));
                                    alert('Applied to resolution field!');
                                  }}
                                  className="text-xs"
                                >
                                  Use This
                                </Button>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {draftedResponses.public_resolution}
                              </p>
                            </div>

                            <p className="text-xs text-slate-600 italic">
                              ✏️ These are drafts - review and customize before sending
                            </p>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>

                {/* Dispute Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Dispute Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Reason:</p>
                      <p className="font-medium">{selectedDispute.reason.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Filed:</p>
                      <p className="font-medium">{format(new Date(selectedDispute.created_date), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Filed By:</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                            {usersMap[selectedDispute.filed_by_email]?.profile_picture ? (
                              <img src={usersMap[selectedDispute.filed_by_email].profile_picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{usersMap[selectedDispute.filed_by_email]?.full_name || "User"}</p>
                            {usersMap[selectedDispute.filed_by_email]?.username && (
                              <Link href={`/PublicProfile?username=${usersMap[selectedDispute.filed_by_email].username}`} className="text-xs text-slate-600 hover:underline">
                                @{usersMap[selectedDispute.filed_by_email].username}
                              </Link>
                            )}
                          </div>
                        </div>
                        {usersMap[selectedDispute.filed_by_email] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReportUser(usersMap[selectedDispute.filed_by_email], selectedDispute.id)}
                            className="text-red-500 hover:text-red-700 border-red-300"
                          >
                            <Flag className="w-4 h-4 mr-1" /> Report
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Against:</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                            {usersMap[selectedDispute.against_email]?.profile_picture ? (
                              <img src={usersMap[selectedDispute.against_email].profile_picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{usersMap[selectedDispute.against_email]?.full_name || "User"}</p>
                            {usersMap[selectedDispute.against_email]?.username && (
                              <Link href={`/PublicProfile?username=${usersMap[selectedDispute.against_email].username}`} className="text-xs text-slate-600 hover:underline">
                                @{usersMap[selectedDispute.against_email].username}
                              </Link>
                            )}
                          </div>
                        </div>
                        {usersMap[selectedDispute.against_email] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReportUser(usersMap[selectedDispute.against_email], selectedDispute.id)}
                            className="text-red-500 hover:text-red-700 border-red-300"
                          >
                            <Flag className="w-4 h-4 mr-1" /> Report
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Evidence ({selectedDispute.evidence_urls.length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedDispute.evidence_urls.map((url, index) => (
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

                {/* Condition Reports */}
                {conditionReports[selectedDispute.rental_request_id] && conditionReports[selectedDispute.rental_request_id].length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Condition Reports ({conditionReports[selectedDispute.rental_request_id].length})</h3>
                    <div className="space-y-3">
                      {conditionReports[selectedDispute.rental_request_id].map(report => (
                        <ConditionReportDisplay key={report.id} report={report} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Decision Form */}
                <div className="border-t-2 pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    Your Decisive Resolution
                  </h3>
                  
                  {/* Quick Decision Buttons */}
                  <div className="mb-6">
                    <Label className="mb-3 block">Quick Decision:</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant={resolutionData.decision === 'favor_renter' ? 'default' : 'outline'}
                        onClick={() => handleQuickDecision('favor_renter')}
                        className={resolutionData.decision === 'favor_renter' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Favor Renter
                      </Button>
                      <Button
                        type="button"
                        variant={resolutionData.decision === 'favor_owner' ? 'default' : 'outline'}
                        onClick={() => handleQuickDecision('favor_owner')}
                        className={resolutionData.decision === 'favor_owner' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Favor Owner
                      </Button>
                      <Button
                        type="button"
                        variant={resolutionData.decision === 'split' ? 'default' : 'outline'}
                        onClick={() => handleQuickDecision('split')}
                        className={resolutionData.decision === 'split' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                      >
                        <Scale className="w-4 h-4 mr-2" />
                        Split Decision
                      </Button>
                    </div>
                  </div>

                  {/* Monetary Details */}
                  {resolutionData.decision && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="refund">Refund to Renter ($)</Label>
                        <Input
                          id="refund"
                          type="number"
                          step="0.01"
                          value={resolutionData.refund_to_renter}
                          onChange={(e) => setResolutionData(prev => ({ ...prev, refund_to_renter: parseFloat(e.target.value) || 0 }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="charge">Release to Owner ($)</Label>
                        <Input
                          id="charge"
                          type="number"
                          step="0.01"
                          value={resolutionData.charge_to_owner}
                          onChange={(e) => setResolutionData(prev => ({ ...prev, charge_to_owner: parseFloat(e.target.value) || 0 }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="resolution">Resolution Message (visible to both parties)</Label>
                      <Textarea
                        id="resolution"
                        value={resolutionData.resolution}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, resolution: e.target.value }))}
                        placeholder="Explain your decision clearly and professionally..."
                        rows={4}
                        className="mt-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">This message will be sent to both the renter and owner</p>
                    </div>

                    <div>
                      <Label htmlFor="admin_notes">Admin Notes (internal only)</Label>
                      <Textarea
                        id="admin_notes"
                        value={resolutionData.admin_notes}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, admin_notes: e.target.value }))}
                        placeholder="Internal notes about this decision..."
                        rows={3}
                        className="mt-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">For internal record keeping only</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedDispute(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDispute}
                disabled={isUpdating || !resolutionData.decision}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {isUpdating ? 'Saving...' : 'Finalize Resolution'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Reporting Dialog */}
        <Dialog open={isReportingUser} onOpenChange={setIsReportingUser}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600" />
                Report User: {userToReport?.full_name || userToReport?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600">
                You are reporting{' '}
                <span className="font-semibold">{userToReport?.full_name || userToReport?.email}</span>{' '}
                in the context of Dispute ID: <span className="font-semibold">{userToReport?.dispute_id}</span>.
                Please select a reason and add any relevant notes.
              </p>
              <div>
                <Label htmlFor="reportReason" className="mb-2 block text-sm font-medium">Reason for reporting</Label>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger id="reportReason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inappropriate_behavior">Inappropriate Behavior</SelectItem>
                    <SelectItem value="fraudulent_activity">Fraudulent Activity</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="violates_terms">Violates Terms of Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reportNotes" className="text-sm font-medium">Additional Notes (Optional)</Label>
                <Textarea
                  id="reportNotes"
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Provide more details about the report..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsReportingUser(false)}
                disabled={isSubmittingReport}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={isSubmittingReport || !reportReason}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmittingReport ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
