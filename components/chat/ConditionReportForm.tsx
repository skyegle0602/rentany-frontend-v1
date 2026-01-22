'use client'


import React, { useState, useRef } from 'react';
import { api, uploadFile } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, CheckCircle, AlertCircle, PenTool, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { compressMultipleImages } from '../utils/imageCompressor'; // Added import

interface ConditionReportFormProps {
  rentalRequest: {
    id: string;
  };
  reportType: 'pickup' | 'return';
  currentUser: {
    email: string;
  };
  onComplete?: () => void;
}

export default function ConditionReportForm({ 
  rentalRequest, 
  reportType, 
  currentUser, 
  onComplete 
}: ConditionReportFormProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [damages, setDamages] = useState<Array<{ description: string; severity: 'minor' | 'moderate' | 'severe'; photo_url: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null); // Clear previous errors
    setCompressionProgress('Compressing images...'); // Set compression message

    try {
      // Compress images before upload
      const compressedFiles = await compressMultipleImages(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2
      });
      
      setCompressionProgress('Uploading...'); // Update message for upload

      const uploadPromises = compressedFiles.map(async (file) => {
        const result = await uploadFile(file);
        return result.file_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotos(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading photos:", error);
      setUploadError("Failed to upload photos. Please try again with smaller images or fewer at once.");
    } finally {
      setIsUploading(false);
      setCompressionProgress(null); // Clear progress message
      event.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addDamageReport = () => {
    setDamages(prev => [...prev, { description: '', severity: 'minor' as const, photo_url: '' }]);
  };

  const updateDamage = (index: number, field: string, value: string) => {
    setDamages(prev => {
      const updated = [...prev];
      if (field === 'severity') {
        updated[index] = { ...updated[index], [field]: value as 'minor' | 'moderate' | 'severe' };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const removeDamage = (index: number) => {
    setDamages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (photos.length === 0) {
      alert('Please upload at least one photo of the item');
      return;
    }
    
    if (!signature) {
      alert('Please provide your digital signature');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.request<{ id: string }>('/condition-reports', {
        method: 'POST',
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          report_type: reportType,
          condition_photos: photos,
          notes: notes,
          damages_reported: damages.filter(d => d.description),
          reported_by_email: currentUser.email,
          signature: signature
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create condition report');
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting condition report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = reportType === 'pickup' 
    ? 'Pre-Rental Condition Report' 
    : 'Return Condition Report';

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Camera className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {reportType === 'pickup' 
              ? 'Document the item\'s condition before rental begins. This protects both parties.'
              : 'Document the item\'s condition upon return. Compare with pickup photos.'}
          </AlertDescription>
        </Alert>

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
          {/* Photo Upload with Camera Option */}
          <div>
            <Label>Condition Photos *</Label>
            <div className="mt-2 flex gap-2">
              {/* Camera Button */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                ref={cameraInputRef}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>

              {/* Upload Button */}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                ref={fileInputRef}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Take clear photos from multiple angles. Images will be compressed automatically.
            </p>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={url} 
                    alt={`Condition ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* General Notes */}
          <div>
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the overall condition of the item..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Damage Reports */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Damages or Issues</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDamageReport}
              >
                + Add Damage
              </Button>
            </div>
            
            {damages.map((damage, index) => (
              <div key={index} className="bg-white border rounded-lg p-3 mb-2">
                <div className="space-y-2">
                  <Input
                    placeholder="Describe the damage..."
                    value={damage.description}
                    onChange={(e) => updateDamage(index, 'description', e.target.value)}
                  />
                  <select
                    value={damage.severity}
                    onChange={(e) => updateDamage(index, 'severity', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeDamage(index)}
                    className="w-full"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Digital Signature */}
          <div>
            <Label htmlFor="signature">Digital Signature *</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name to sign"
                className="flex-1"
                required
              />
              <PenTool className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              By typing your name, you confirm the accuracy of this report
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || photos.length === 0 || !signature || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Condition Report
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
