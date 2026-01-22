'use client'

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: (open?: boolean) => void;
  images: string[];
  initialIndex?: number;
}

export default function ImageZoomModal({ 
  isOpen, 
  onClose, 
  images, 
  initialIndex = 0 
}: ImageZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handlePrev = (): void => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoomLevel(1);
  };

  const handleNext = (): void => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  };

  const handleZoomIn = (): void => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (): void => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  // Reset zoom when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex]);

  if (!images || images.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-0">
        {/* Dialog title for accessibility (visually hidden) */}
        <DialogTitle className="sr-only">
          Image Viewer - Image {currentIndex + 1} of {images.length}
        </DialogTitle>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onClose(false)}
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full w-10 h-10"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Zoom controls */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="text-white hover:bg-white/20 rounded-full w-8 h-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-white text-sm font-medium min-w-[50px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="text-white hover:bg-white/20 rounded-full w-8 h-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full w-12 h-12"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full w-12 h-12"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Image container */}
        <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-zoom-in"
            style={{ transform: `scale(${zoomLevel})` }}
            onClick={() => setZoomLevel(prev => prev < 2 ? prev + 0.5 : 1)}
          />
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 rounded-full px-4 py-2">
            <span className="text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}