'use client'

import React, { useState, useEffect } from 'react';
import { differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PaymentDeadlineProps {
  request: {
    updated_date: string;
  };
}

export default function PaymentDeadline({ request }: PaymentDeadlineProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const approvalTime = parseISO(request.updated_date);
      const deadline = new Date(approvalTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      const now = new Date();

      const hoursRemaining = differenceInHours(deadline, now);
      const minutesRemaining = differenceInMinutes(deadline, now) % 60;

      if (hoursRemaining < 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        return;
      }

      if (hoursRemaining < 3) {
        setIsWarning(true);
      }

      if (hoursRemaining < 1) {
        setTimeRemaining(`${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`);
      } else {
        setTimeRemaining(`${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} ${minutesRemaining} min`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [request.updated_date]);

  if (isExpired) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Payment Deadline Expired</AlertTitle>
        <AlertDescription>
          This request will be automatically cancelled. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={`mb-4 ${isWarning ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
      <Clock className={`h-4 w-4 ${isWarning ? 'text-orange-600' : 'text-blue-600'}`} />
      <AlertTitle className={isWarning ? 'text-orange-900' : 'text-blue-900'}>
        {isWarning ? '⚠️ Payment Deadline Soon!' : '⏰ Payment Deadline'}
      </AlertTitle>
      <AlertDescription className={isWarning ? 'text-orange-800' : 'text-blue-800'}>
        <strong>{timeRemaining}</strong> remaining to complete payment, or this request will be cancelled.
      </AlertDescription>
    </Alert>
  );
}