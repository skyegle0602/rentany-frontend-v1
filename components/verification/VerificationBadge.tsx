import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, XCircle, CreditCard, Building2 } from 'lucide-react';

interface VerificationBadgeProps {
    status: 'verified' | 'pending' | 'failed' | 'unverified';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    stripe_payment_method_id?: string | null; // Check if card is connected (for renting)
}

export default function VerificationBadge({ 
  status, 
  size = "sm", 
  stripe_payment_method_id 
}: VerificationBadgeProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // All users can both rent and lend - show status for both capabilities
  // Show card status if connected, otherwise show bank status
  if (stripe_payment_method_id) {
    // Card is connected (can rent)
    return (
      <Badge className={`bg-green-100 text-green-800 border-green-200 border flex items-center gap-1 ${textSize}`}>
        <CreditCard className={iconSize} />
        Card connected
      </Badge>
    );
  }

  // Show bank account status (for lending)
  if (status === 'verified') {
    // Bank account is connected (can lend)
    return (
      <Badge className={`bg-green-100 text-green-800 border-green-200 border flex items-center gap-1 ${textSize}`}>
        <Building2 className={iconSize} />
        Bank connected
      </Badge>
    );
  } else if (status === 'pending') {
    return (
      <Badge className={`bg-yellow-100 text-yellow-800 border-yellow-200 border flex items-center gap-1 ${textSize}`}>
        <Clock className={iconSize} />
        Verification Pending
      </Badge>
    );
  } else if (status === 'failed') {
    return (
      <Badge className={`bg-red-100 text-red-800 border-red-200 border flex items-center gap-1 ${textSize}`}>
        <XCircle className={iconSize} />
        Verification Failed
      </Badge>
    );
  }

  // No payment setup - show nothing for unverified state
  return null;
}