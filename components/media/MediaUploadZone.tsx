'use client'

import React, { useState } from 'react';
import { uploadFile } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { X, Image, Video, Play, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { compressMultipleImages, formatFileSize } from '../utils/imageCompressor';

interface MediaUploadZoneProps {
  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
  uploadedVideos: string[];
  setUploadedVideos: React.Dispatch<React.SetStateAction<string[]>>;
  uploadingFiles: File[];
  setUploadingFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export default function MediaUploadZone({ 
  uploadedImages, 
  setUploadedImages, 
  uploadedVideos, 
  setUploadedVideos,
  uploadingFiles,
  setUploadingFiles 
}: MediaUploadZoneProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList | null, type: 'image' | 'video') => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setUploadError(null);
    setCompressionProgress(null);

    try {
      // Compress images before upload
      let processedFiles: File[] = fileArray;
      if (type === 'image') {
        setCompressionProgress('Compressing images...');
        processedFiles = await compressMultipleImages(fileArray, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          maxSizeMB: 2
        });
        setCompressionProgress(null);
      }

      setUploadingFiles((prev: File[]) => [...prev, ...processedFiles]);

      const uploadPromises = processedFiles.map(async (file: File) => {
        try {
          const response = await uploadFile(file);
          return response.file_url;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw new Error(`Failed to upload ${file.name}`);
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      if (type === 'image') {
        setUploadedImages((prev: string[]) => [...prev, ...uploadedUrls]);
      } else {
        setUploadedVideos((prev: string[]) => [...prev, ...uploadedUrls]);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload files. Please try again with smaller files.";
      setUploadError(errorMessage);
    } finally {
      setUploadingFiles([]);
      setCompressionProgress(null);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages((prev: string[]) => prev.filter((_, index: number) => index !== indexToRemove));
  };

  const removeVideo = (indexToRemove: number) => {
    setUploadedVideos((prev: string[]) => prev.filter((_, index: number) => index !== indexToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Compression Progress */}
      {compressionProgress && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
            {compressionProgress}
          </AlertDescription>
        </Alert>
      )}

      {/* Image Upload */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Photos</h3>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-300 transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files, 'image')}
            className="hidden"
            id="image-upload"
            disabled={uploadingFiles.length > 0 || compressionProgress !== null}
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <Image className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Upload Photos</h4>
            <p className="text-slate-500 text-sm">Add up to 10 photos of your item</p>
            <p className="text-slate-400 text-xs mt-1">Images will be automatically compressed for faster upload</p>
          </label>
        </div>

        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {uploadedImages.map((url: string, index: number) => (
              <div key={index} className="relative group">
                <img 
                  src={url} 
                  alt={`Upload ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-xl"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Upload */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Videos (Optional)</h3>
        <div className="border-2 border-dashed border-purple-200 rounded-xl p-6 text-center hover:border-purple-300 transition-colors bg-purple-50/50">
          <input
            type="file"
            multiple
            accept="video/mp4,video/mov,video/avi,video/webm"
            onChange={(e) => handleFileUpload(e.target.files, 'video')}
            className="hidden"
            id="video-upload"
            disabled={uploadingFiles.length > 0 || compressionProgress !== null}
          />
          <label htmlFor="video-upload" className="cursor-pointer">
            <Video className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Upload Short Videos</h4>
            <p className="text-slate-500 text-sm">Add videos to showcase your item (max 30 seconds each)</p>
            <p className="text-purple-600 text-xs mt-1">Keep videos under 10MB for best results</p>
          </label>
        </div>

        {uploadedVideos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {uploadedVideos.map((url: string, index: number) => (
              <div key={index} className="relative group">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                  <video 
                    src={url} 
                    className="w-full h-full object-cover"
                    controls
                  />
                  <div className="absolute top-2 left-2">
                    <div className="bg-purple-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      Video {index + 1}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeVideo(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-slate-900">Uploading files...</h4>
          {uploadingFiles.map((file: File, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-slate-600 truncate block">{file.name}</span>
                <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}