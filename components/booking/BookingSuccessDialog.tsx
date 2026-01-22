'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, MessageSquare, Clock, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

interface BookingSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isInstantBooking: boolean;
  itemTitle: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  onViewConversation: () => void;
}

export default function BookingSuccessDialog({ 
  isOpen, 
  onClose, 
  isInstantBooking, 
  itemTitle,
  startDate,
  endDate,
  totalAmount,
  onViewConversation 
}: BookingSuccessDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-4"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isInstantBooking 
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                : 'bg-gradient-to-br from-green-400 to-emerald-500'
            }`}>
              {isInstantBooking ? (
                <Zap className="w-10 h-10 text-white" />
              ) : (
                <CheckCircle className="w-10 h-10 text-white" />
              )}
            </div>
          </motion.div>
          
          <DialogTitle className="text-2xl font-bold text-center">
            {isInstantBooking ? '🎉 Booking Confirmed!' : '✅ Request Sent!'}
          </DialogTitle>
          
          <DialogDescription className="text-center pt-2">
            {isInstantBooking ? (
              <span className="text-base">
                Your booking for <strong className="text-slate-900">{itemTitle}</strong> has been 
                <span className="text-green-600 font-semibold"> automatically approved</span>!
              </span>
            ) : (
              <span className="text-base">
                Your rental request for <strong className="text-slate-900">{itemTitle}</strong> has been sent to the owner.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 rounded-xl p-4 space-y-3 my-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-slate-600">
              {startDate} → {endDate}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CreditCard className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-slate-600">
              Total: <strong className="text-slate-900">${totalAmount}</strong>
            </span>
          </div>
        </div>

        <div className={`rounded-xl p-4 ${
          isInstantBooking 
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <h4 className={`font-semibold text-sm mb-2 ${
            isInstantBooking ? 'text-orange-800' : 'text-blue-800'
          }`}>
            {isInstantBooking ? '⚡ What happens next?' : '📬 What happens next?'}
          </h4>
          <ul className={`text-sm space-y-1.5 ${
            isInstantBooking ? 'text-orange-700' : 'text-blue-700'
          }`}>
            {isInstantBooking ? (
              <>
                <li>• You can proceed to payment immediately</li>
                <li>• The owner has been notified</li>
                <li>• Coordinate pickup details in the chat</li>
              </>
            ) : (
              <>
                <li>• The owner will review your request</li>
                <li>• You'll receive a notification when they respond</li>
                <li>• If approved, you can proceed with payment</li>
              </>
            )}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
          <Button 
            onClick={onViewConversation}
            className={`w-full h-12 ${
              isInstantBooking 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {isInstantBooking ? 'Go to Chat & Pay' : 'View Conversation'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Continue Browsing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}