'use client'

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { type UserData } from '@/lib/api-client';
import { canRent, canLend } from '@/lib/user-capabilities';

interface PaymentStatusBadgesProps {
  currentUser: UserData | null;
  isAdmin?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PaymentStatusBadges({ 
  currentUser, 
  isAdmin = false,
  size = 'md' 
}: PaymentStatusBadgesProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  const canRentItems = canRent(currentUser, isAdmin);
  const canLendItems = canLend(currentUser, isAdmin);
  const hasStripeAccount = !!(currentUser as any)?.stripe_account_id;
  const payoutsEnabled = currentUser?.payouts_enabled === true;
  const verificationStatus = currentUser?.verification_status;

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center">
      {/* Card Status Badge */}
      {canRentItems ? (
        <Badge className={`bg-green-100 text-green-800 border-green-200 border flex items-center gap-1 ${textSize}`}>
          <CheckCircle className={iconSize} />
          Card connected
        </Badge>
      ) : (
        <Badge className={`bg-red-100 text-red-800 border-red-200 border flex items-center gap-1 ${textSize}`}>
          <XCircle className={iconSize} />
          Card not connected
        </Badge>
      )}

      {/* Bank/Payout Status Badge */}
      {payoutsEnabled ? (
        <Badge className={`bg-green-100 text-green-800 border-green-200 border flex items-center gap-1 ${textSize}`}>
          <CheckCircle className={iconSize} />
          Payouts enabled
        </Badge>
      ) : hasStripeAccount && verificationStatus === 'pending' ? (
        <Badge className={`bg-yellow-100 text-yellow-800 border-yellow-200 border flex items-center gap-1 ${textSize}`}>
          <Clock className={iconSize} />
          Payouts pending
        </Badge>
      ) : (
        <Badge className={`bg-red-100 text-red-800 border-red-200 border flex items-center gap-1 ${textSize}`}>
          <XCircle className={iconSize} />
          Bank not connected
        </Badge>
      )}
    </div>
  );
}
