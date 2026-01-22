'use client'

import React, { useState } from 'react';
import { Upload, User as UserIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { compressMultipleImages } from '@/components/utils/imageCompressor';
import { uploadFile, api, type UserData } from '@/lib/api-client';

interface ProfilePictureUploadProps {
  currentUser: UserData | null;
  onUpdate: () => void | Promise<void>;
}

export default function ProfilePictureUpload({ currentUser, onUpdate }: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Compress image before upload
      const compressedFiles = await compressMultipleImages([file], {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        maxSizeMB: 1
      });

      if (compressedFiles.length === 0) {
        throw new Error('Failed to compress image');
      }

      const compressedFile = compressedFiles[0];
      const response = await uploadFile(compressedFile);
      
      // Update user profile picture
      const updateResponse = await api.updateUser({ profile_picture: response.file_url });
      
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update profile picture');
      }

      await onUpdate();
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setUploadError("Failed to upload profile picture. Please try again with a smaller image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative group">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white shadow-xl border-4 border-white flex items-center justify-center">
          {currentUser?.profile_picture ? (
            <img 
              src={currentUser.profile_picture} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-14 h-14 sm:w-16 sm:h-16 text-slate-400" />
          )}
        </div>
        
        <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          <div className="text-white text-center">
            {isUploading ? (
              <div className="animate-spin w-7 h-7 border-2 border-white border-t-transparent rounded-full mx-auto" />
            ) : (
              <>
                <Upload className="w-7 h-7 mx-auto mb-1" />
                <span className="text-xs font-medium">Change</span>
              </>
            )}
          </div>
        </label>
      </div>

      {uploadError && (
        <Alert variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}