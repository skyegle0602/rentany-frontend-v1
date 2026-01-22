'use client'

import React, { useState, useEffect } from "react";
import { api, getCurrentUser, redirectToSignIn, type UserData } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, MessageSquare, FileText, User as UserIcon, Upload, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Link from 'next/link';
import { createPageUrl } from "@/lib/utils";
import { compressMultipleImages } from '@/components/utils/imageCompressor';
import RentalAgreementPreview from '@/components/rental/RentalAgreementPreview';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  created_date: string;
}

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  start_date?: string;
  end_date?: string;
  total_amount: number;
  status: 'inquiry' | 'pending' | 'approved' | 'paid' | 'completed' | 'cancelled' | 'rejected';
  created_date: string;
  message?: string;
}

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  location?: string;
  daily_rate: number;
  deposit?: number;
  images?: string[];
  videos?: string[];
  [key: string]: any;
}

interface User {
  email: string;
  full_name?: string;
  username?: string;
  profile_picture?: string;
  role?: string;
  [key: string]: any;
}

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800 border-red-200",
  under_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200"
};

// Helper to delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function DisputesPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [requests, setRequests] = useState<Record<string, RentalRequest>>({});
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [additionalEvidence, setAdditionalEvidence] = useState<string[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [showAddEvidenceDialog, setShowAddEvidenceDialog] = useState(false);
  const [showAgreementPreview, setShowAgreementPreview] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        redirectToSignIn();
        return;
      }
      setUser(currentUser);

      await delay(100);

      const disputesResponse = await api.request<Dispute[]>('/disputes');
      const allDisputes = disputesResponse.success && disputesResponse.data ? disputesResponse.data : [];
      const userDisputes = allDisputes.filter(
        d => d.filed_by_email === currentUser.email || d.against_email === currentUser.email
      );
      setDisputes(userDisputes);

      await delay(100);

      const requestsResponse = await api.request<RentalRequest[]>('/rental-requests');
      const allRequests = requestsResponse.success && requestsResponse.data ? requestsResponse.data : [];
      const requestsMap: Record<string, RentalRequest> = {};
      allRequests.forEach(req => {
        requestsMap[req.id] = req;
      });
      setRequests(requestsMap);

      await delay(100);

      const itemsResponse = await api.getItems();
      const allItems = itemsResponse.success && itemsResponse.data ? (Array.isArray(itemsResponse.data) ? itemsResponse.data : []) : [];
      const itemsMap: Record<string, Item> = {};
      allItems.forEach((item: Item) => {
        itemsMap[item.id] = item;
      });
      setItems(itemsMap);

      await delay(100);

      // Load user data for all involved parties in disputes
      const involvedEmails = new Set<string>();
      userDisputes.forEach(dispute => {
        involvedEmails.add(dispute.filed_by_email);
        involvedEmails.add(dispute.against_email);
      });
      // Also add users from rental requests to ensure all relevant users are loaded
      allRequests.forEach(req => {
        involvedEmails.add(req.renter_email);
        involvedEmails.add(req.owner_email);
      });

      const usersDataMap: Record<string, User> = {};
      const emailsArray = Array.from(involvedEmails);
      
      for (let i = 0; i < emailsArray.length; i++) {
        const email = emailsArray[i];
        try {
          // Use getUserForChat or similar API endpoint
          const response = await api.request<{ user?: User }>(`/users/chat?email=${encodeURIComponent(email)}`);
          if (response.success && response.data?.user) {
            usersDataMap[email] = response.data.user;
          } else {
            usersDataMap[email] = { email, full_name: 'A User', username: undefined };
          }
          
          if (i < emailsArray.length - 1) {
            await delay(150);
          }
        } catch (err) {
          console.error(`Failed to fetch user ${email}:`, err);
          usersDataMap[email] = { email, full_name: 'A User', username: undefined };
        }
      }

      setUsersMap(usersDataMap);

    } catch (error) {
      console.error("Error loading disputes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedDispute || additionalEvidence.length === 0) return;

    setIsUploadingEvidence(true);
    try {
      const currentEvidenceUrls = selectedDispute.evidence_urls || [];
      const updatedEvidenceUrls = [...currentEvidenceUrls, ...additionalEvidence];

      await api.request(`/disputes/${selectedDispute.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          evidence_urls: updatedEvidenceUrls
        })
      });

      // Note: Admin notification would need backend support
      // For now, we'll skip admin notification

      setShowAddEvidenceDialog(false);
      setAdditionalEvidence([]);
      setSelectedDispute(null);
      await loadData(); // Reload data to reflect changes
      alert('Evidence added successfully!');
    } catch (error) {
      console.error("Error adding evidence:", error);
      alert('Failed to add evidence. Please try again.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleEvidenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploadingEvidence(true);
    try {
      const compressedFiles = await compressMultipleImages(files as File[], {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2
      });

      const uploadPromises = compressedFiles.map(async (file) => {
        const response = await api.uploadFile(file);
        return response.file_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setAdditionalEvidence(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading evidence:", error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploadingEvidence(false);
      event.target.value = ''; // Clear the input so same files can be re-selected
    }
  };

  const filedDisputes = disputes.filter(d => d.filed_by_email === user?.email);
  const receivedDisputes = disputes.filter(d => d.against_email === user?.email);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to view disputes</h2>
          <Button onClick={() => redirectToSignIn()}>Sign In</Button>
        </Card>
      </div>
    );
  }

  if (showAgreementPreview) {
    const previewDispute = disputes.find(d => d.id === showAgreementPreview);
    if (previewDispute) {
      const request = requests[previewDispute.rental_request_id];
      const item = request ? items[request.item_id] : null;
      const renterUser = request ? usersMap[request.renter_email] : undefined;
      const ownerUser = request ? usersMap[request.owner_email] : undefined;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setShowAgreementPreview(null)}
              className="mb-4"
            >
              ← Back to Disputes
            </Button>
            
            {request && item ? (
              <RentalAgreementPreview
                rentalRequest={request}
                item={item}
                renter={renterUser}
                owner={ownerUser}
                conditionReports={[]}
              />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-slate-600">Unable to load agreement details</p>
              </Card>
            )}
          </div>
        </div>
      );
    }
  }

  const DisputeCard = ({ dispute, type }: { dispute: Dispute; type: 'filed' | 'received' }) => {
    const request = requests[dispute.rental_request_id];
    const item = request ? items[request.item_id] : null;
    const otherUserEmail = type === 'filed' ? dispute.against_email : dispute.filed_by_email;
    const otherUser = usersMap[otherUserEmail];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {item?.title || "Item not found"}
              </CardTitle>
              <Badge className={`${statusColors[dispute.status] || statusColors.open} border shadow-sm`}>
                {dispute.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Reason: {dispute.reason.replace('_', ' ')}
                </p>
                <p className="text-sm text-red-800">{dispute.description}</p>
              </div>

              <Button
                onClick={() => setShowAgreementPreview(dispute.id)}
                variant="outline"
                size="sm"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Rental Agreement
              </Button>

              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">Evidence ({dispute.evidence_urls.length}):</p>
                    {type === 'filed' && dispute.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowAddEvidenceDialog(true);
                        }}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add More
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {dispute.evidence_urls.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {dispute.resolution && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-green-900 mb-1">Resolution:</p>
                  <p className="text-sm text-green-800">{dispute.resolution}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t">
                <span>Filed {format(new Date(dispute.created_date), "MMM d, yyyy")}</span>
                {otherUser && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">
                      {type === "filed" ? "Against:" : "From:"}
                    </span>
                    {otherUser.username ? (
                      <Link href={createPageUrl(`PublicProfile?username=${otherUser.username}`)} 
                        className="font-medium text-slate-900 hover:underline flex items-center gap-1"
                      >
                        <UserIcon className="w-3 h-3" />
                        @{otherUser.username}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {otherUser.full_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Disputes</h1>
          <p className="text-slate-600">Manage rental disputes and resolutions</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs defaultValue="filed" className="w-full">
              <TabsList className="grid w-full grid-cols-2 m-6 mb-0">
                <TabsTrigger value="filed" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Filed by Me ({filedDisputes.length})
                </TabsTrigger>
                <TabsTrigger value="received" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Against Me ({receivedDisputes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="filed" className="p-6">
                {filedDisputes.length > 0 ? (
                  <div>
                    {filedDisputes.map(dispute => (
                      <DisputeCard key={dispute.id} dispute={dispute} type="filed" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No disputes filed</h3>
                    <p className="text-slate-600">You haven't filed any disputes</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="received" className="p-6">
                {receivedDisputes.length > 0 ? (
                  <div>
                    {receivedDisputes.map(dispute => (
                      <DisputeCard key={dispute.id} dispute={dispute} type="received" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No disputes received</h3>
                    <p className="text-slate-600">No one has filed a dispute against you</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Add Evidence Dialog */}
        <Dialog open={showAddEvidenceDialog} onOpenChange={setShowAddEvidenceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add More Evidence</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600">
                Upload additional evidence to support your dispute. This will be reviewed by the admin team.
              </p>
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleEvidenceUpload}
                  className="hidden"
                  id="additional-evidence-upload"
                  disabled={isUploadingEvidence}
                />
                <label 
                  htmlFor="additional-evidence-upload" 
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploadingEvidence ? 'Uploading...' : 'Select Files'}
                </label>
              </div>
              {additionalEvidence.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{additionalEvidence.length} file(s) ready to upload:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {additionalEvidence.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`New evidence ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddEvidenceDialog(false);
                  setAdditionalEvidence([]);
                  setSelectedDispute(null); // Clear selected dispute
                }}
                disabled={isUploadingEvidence}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEvidence}
                disabled={isUploadingEvidence || additionalEvidence.length === 0}
              >
                {isUploadingEvidence ? 'Adding...' : 'Add Evidence'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
