'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Upload, X } from 'lucide-react';
import { uploadFile, getCurrentUser, api } from '@/lib/api-client';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'user' | 'listing';
  targetEmail?: string;
  targetName?: string;
  itemId?: string;
  itemTitle?: string;
}

export default function ReportDialog({ 
  isOpen, 
  onClose, 
  reportType,
  targetEmail, 
  targetName,
  itemId,
  itemTitle 
}: ReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [formData, setFormData] = useState<{
    reason: string;
    description: string;
    evidence_urls: string[];
  }>({
    reason: '',
    description: '',
    evidence_urls: []
  });

  const userReasons = [
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'spam', label: 'Spam or Scam' },
    { value: 'fraud', label: 'Fraudulent Activity' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other' }
  ];

  const listingReasons = [
    { value: 'fraud', label: 'Fraudulent Listing' },
    { value: 'stolen_item', label: 'Suspected Stolen Item' },
    { value: 'prohibited_item', label: 'Prohibited Item' },
    { value: 'misleading', label: 'Misleading Description/Photos' },
    { value: 'price_gouging', label: 'Price Gouging' },
    { value: 'spam', label: 'Spam or Duplicate' },
    { value: 'other', label: 'Other' }
  ];

  const reasons = reportType === 'user' ? userReasons : listingReasons;

  const handleEvidenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploadingEvidence(true);
    try {
      const uploadPromises = files.map(async (file: File) => {
        const { file_url } = await uploadFile(file);
        return file_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        evidence_urls: [...prev.evidence_urls, ...uploadedUrls]
      }));
    } catch (error) {
      console.error("Error uploading evidence:", error);
      alert("Failed to upload evidence. Please try again.");
    } finally {
      setIsUploadingEvidence(false);
      event.target.value = '';
    }
  };

  const removeEvidence = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      evidence_urls: prev.evidence_urls.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e:React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        alert('You must be logged in to submit a report.');
        return;
      }
      
      if (reportType === 'user') {
        // TODO: Implement user report API call
        // await api.createUserReport({
        //   reporter_email: currentUser.email,
        //   reported_email: targetEmail,
        //   reason: formData.reason,
        //   description: formData.description,
        //   evidence_urls: formData.evidence_urls,
        //   status: 'pending'
        // });
        console.log('User report:', {
          reporter_email: currentUser.email,
          reported_email: targetEmail,
          reason: formData.reason,
          description: formData.description,
          evidence_urls: formData.evidence_urls,
          status: 'pending'
        });
      } else {
        // For listing reports, create a report via API
        const response = await api.request('/reports/listing', {
          method: 'POST',
          body: JSON.stringify({
            item_id: itemId,
            reporter_email: currentUser.email,
            reason: formData.reason,
            description: formData.description,
            evidence_urls: formData.evidence_urls,
            status: 'pending'
          }),
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to submit listing report');
        }
      }

      alert('Report submitted successfully. Our team will review it shortly.');
      onClose();
      setFormData({ reason: '', description: '', evidence_urls: [] });
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5" />
            Report {reportType === 'user' ? 'User' : 'Listing'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-slate-700">
              <strong>Reporting:</strong> {reportType === 'user' ? targetName : itemTitle}
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Report</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              required
            >
              <SelectTrigger id="reason" className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide detailed information about the issue. Include dates, specific incidents, or any relevant details..."
              rows={5}
              className="mt-1"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Be as specific as possible. This helps our team investigate the report.
            </p>
          </div>

          <div>
            <Label>Evidence (Screenshots/Photos)</Label>
            <p className="text-xs text-slate-500 mb-2">
              Upload any evidence that supports your report (optional but recommended)
            </p>
            <div className="mt-2">
              <input
                type="file"
                multiple
                accept="image/*"
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

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              <strong>⚠️ Important:</strong> False reports may result in account suspension. 
              Only submit reports for genuine concerns about safety, fraud, or policy violations.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.reason || !formData.description}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}