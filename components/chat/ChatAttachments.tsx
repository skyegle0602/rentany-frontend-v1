'use client'

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Image, FileText, X, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { uploadFile } from '@/lib/api-client';

interface Attachment {
  url: string;
  type: 'image' | 'document';
  name: string;
  size: number;
}

interface ChatAttachmentsProps {
  onAttach: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export default function ChatAttachments({ onAttach, disabled }: ChatAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const result = await uploadFile(file);
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
        
        return {
          url: result.file_url,
          type: type,
          name: file.name,
          size: file.size
        };
      });

      const uploaded = await Promise.all(uploadPromises);
      setPendingAttachments(prev => [...prev, ...uploaded]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendAttachments = () => {
    if (pendingAttachments.length > 0) {
      onAttach(pendingAttachments);
      setPendingAttachments([]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="relative">
      {/* Pending Attachments Preview */}
      {pendingAttachments.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg p-2 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">
              {pendingAttachments.length} file(s) ready to send
            </span>
            <Button
              size="sm"
              onClick={sendAttachments}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
            >
              Send
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {pendingAttachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group bg-slate-50 rounded-lg p-2 flex items-center gap-2"
              >
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                    {attachment.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || isUploading}
            className="h-9 w-9 text-slate-500 hover:text-slate-700"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Image className="w-4 h-4 text-blue-500" />
              Photo
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 text-orange-500" />
              Document
            </button>
          </div>
          
          {isUploading && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading... {uploadProgress}%
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full mt-1">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        multiple
        onChange={(e) => handleFileSelect(e, 'document')}
        className="hidden"
      />
    </div>
  );
}