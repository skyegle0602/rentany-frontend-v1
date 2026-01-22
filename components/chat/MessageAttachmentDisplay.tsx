'use client'

import React, { useState } from 'react';
import { FileText, Download, ExternalLink, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Attachment {
  type: 'image' | 'document';
  url: string;
  name?: string;
  size?: number;
}

interface MessageAttachmentDisplayProps {
  attachments: Attachment[];
}

export default function MessageAttachmentDisplay({ attachments }: MessageAttachmentDisplayProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(a => a.type === 'image');
  const documents = attachments.filter(a => a.type === 'document');

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Images Grid */}
      {images.length > 0 && (
        <div className={`grid gap-1 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setZoomedImage(img.url)}
              className="relative group rounded-lg overflow-hidden bg-slate-100"
            >
              <img
                src={img.url}
                alt={img.name || 'Attachment'}
                className="w-full h-auto max-h-48 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((doc, index) => (
            <a
              key={index}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
            >
              <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">
                  {doc.name || 'Document'}
                </p>
                {doc.size && (
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(doc.size)}
                  </p>
                )}
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Image Zoom Modal */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Full size"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}