'use client'

import React, { useState, useEffect } from 'react';
import { api, getCurrentUser, uploadFile, type UserData } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Upload, X, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import ConditionReportDisplay from '../chat/ConditionReportDisplay';
import { compressMultipleImages } from '../utils/imageCompressor';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConditionReport {
  id?: string;
  report_type: 'pickup' | 'return';
  reported_by_email: string;
  created_date: string;
  notes?: string;
  damages_reported?: Array<{
    severity: 'minor' | 'moderate' | 'severe';
    description: string;
    photo_url?: string;
  }>;
  condition_photos?: string[];
  reported_by_username?: string;
  rental_request_id?: string;
}

interface RentalRequest {
  id: string;
  renter_email: string;
  owner_email: string;
  [key: string]: any;
}

interface Item {
  id?: string;
  title?: string;
  [key: string]: any;
}

interface DisputeFormProps {
  rentalRequest: RentalRequest;
  item?: Item;
  onSuccess?: () => void;
}

export default function DisputeForm({ rentalRequest, item, onSuccess }: DisputeFormProps) {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    evidence_urls: [] as string[]
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // Load condition reports for this rental
        // TODO: Implement condition reports endpoint in backend
        const reportsResponse = await api.request<ConditionReport[]>(`/condition-reports?rental_request_id=${rentalRequest.id}`);
        const reports = reportsResponse.success && reportsResponse.data ? reportsResponse.data : [];
        setConditionReports(reports);
      } catch (error) {
        console.error("Error loading data:", error);
        setConditionReports([]);
      } finally {
        setIsLoadingReports(false);
      }
    };
    loadData();
  }, [rentalRequest.id]);

  const handleEvidenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setIsUploadingEvidence(true);
    setUploadError(null);
    setCompressionProgress('Compressing images...');

    try {
      // Compress images before upload
      const compressedFiles = await compressMultipleImages(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2
      });

      setCompressionProgress('Uploading...');

      const uploadPromises = compressedFiles.map(async (file) => {
        const result = await uploadFile(file);
        return result.file_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        evidence_urls: [...prev.evidence_urls, ...uploadedUrls]
      }));
    } catch (error) {
      console.error("Error uploading evidence:", error);
      setUploadError("Failed to upload files. Please try again with smaller images.");
    } finally {
      setIsUploadingEvidence(false);
      setCompressionProgress(null);
      event.target.value = '';
    }
  };

  const removeEvidence = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      evidence_urls: prev.evidence_urls.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const againstEmail = currentUser.email === rentalRequest.renter_email 
        ? rentalRequest.owner_email 
        : rentalRequest.renter_email;

      const disputeResponse = await api.request<{ id: string }>('/disputes', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          filed_by_email: currentUser.email,
          against_email: againstEmail,
          reason: formData.reason,
          description: formData.description,
          evidence_urls: formData.evidence_urls,
          status: 'open'
        })
      });

      if (!disputeResponse.success || !disputeResponse.data) {
        throw new Error(disputeResponse.error || 'Failed to create dispute');
      }

      const newDispute = disputeResponse.data;

      // Send notification to the other party
      // TODO: Implement notifications endpoint in backend
      try {
        await api.request('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            user_email: againstEmail,
            type: 'dispute',
            title: '⚠️ A Dispute Has Been Filed',
            message: `A dispute has been filed regarding "${item?.title || 'your rental'}". Reason: ${formData.reason.replace('_', ' ')}. Please review the details in the disputes section.`,
            related_id: newDispute.id,
            link: '/Disputes'
          })
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }

      // Notify all admins
      const usersResponse = await api.request<UserData[]>('/users');
      const allUsers = usersResponse.success && usersResponse.data ? usersResponse.data : [];
      const admins = allUsers.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        try {
          await api.request('/notifications', {
            method: 'POST',
            body: JSON.stringify({
              user_email: admin.email,
              type: 'dispute',
              title: '🚨 New Dispute Filed - Admin Action Required',
              message: `A new dispute has been filed for "${item?.title || 'a rental'}". Reason: ${formData.reason.replace('_', ' ')}. Filed by: ${currentUser.email}. Please review in Admin Disputes.`,
              related_id: newDispute.id,
              link: '/AdminDisputes'
            })
          });
        } catch (error) {
          console.error('Failed to send notification to admin:', error);
        }
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting dispute:", error);
      alert("Failed to submit dispute. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) return null;

  const pickupReports = conditionReports.filter(r => r.report_type === 'pickup');
  const returnReports = conditionReports.filter(r => r.report_type === 'return');

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="w-5 h-5" />
          File a Dispute
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Condition Reports Section */}
        {!isLoadingReports && conditionReports.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
              <Camera className="w-5 h-5 text-orange-700" />
              <h3 className="font-semibold text-orange-900">Condition Reports</h3>
              <span className="text-xs text-orange-600 ml-auto">
                Review these reports to support your dispute
              </span>
            </div>

            {/* Pickup Reports */}
            {pickupReports.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Pre-Rental Condition ({pickupReports.length} of 2)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pickupReports.map(report => (
                    <ConditionReportDisplay key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}

            {/* Return Reports */}
            {returnReports.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                  Return Condition ({returnReports.length} of 2)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {returnReports.map(report => (
                    <ConditionReportDisplay key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}

            {conditionReports.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-800">
                  No condition reports have been submitted for this rental yet.
                </p>
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {compressionProgress && (
          <Alert className="mb-4">
            <AlertDescription className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
              {compressionProgress}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason for Dispute</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              required
            >
              <SelectTrigger id="reason" className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item_damaged">Item Was Damaged</SelectItem>
                <SelectItem value="item_not_returned">Item Not Returned</SelectItem>
                <SelectItem value="item_not_as_described">Item Not As Described</SelectItem>
                <SelectItem value="payment_issue">Payment Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide detailed information about the issue..."
              rows={4}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>Additional Evidence (Photos/Documents)</Label>
            <p className="text-xs text-slate-500 mb-2">
              Upload any additional photos or documents beyond the condition reports
            </p>
            <div className="mt-2">
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleEvidenceUpload}
                className="hidden"
                id="evidence-upload"
                disabled={isUploadingEvidence}
              />
              <label 
                htmlFor="evidence-upload" 
                className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
              >
                <Upload className="w-4 h-4" />
                {isUploadingEvidence ? 'Uploading...' : 'Add Evidence'}
              </label>
            </div>
            {formData.evidence_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {formData.evidence_urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Evidence ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeEvidence(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-900">
              <strong>Note:</strong> Filing a dispute will notify our support team and the other party. An admin will review the case and mediate between both parties. Please provide as much detail and evidence as possible.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.reason || !formData.description}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}