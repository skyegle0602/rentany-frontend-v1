import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, XCircle, CreditCard, Building2 } from 'lucide-react';

interface VerificationBadgeProps {
    status: 'verified' | 'pending' | 'failed' | 'unverified';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    userIntent?: 'renter' | 'owner' | 'both';
    stripe_payment_method_id?: string | null; // For renters - check if card is connected
}

export default function VerificationBadge({ 
  status, 
  size = "sm", 
  userIntent,
  stripe_payment_method_id 
}: VerificationBadgeProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  // Handle renters - check stripe_payment_method_id
  if (userIntent === 'renter') {
    if (stripe_payment_method_id) {
      // Card is connected
      return (
        <Badge className={`bg-green-100 text-green-800 border-green-200 border flex items-center gap-1 ${textSize}`}>
          <CreditCard className={iconSize} />
          Card connected
        </Badge>
      );
    } else {
      // No card connected
      return (
        <Badge className={`bg-slate-100 text-slate-800 border-slate-200 border flex items-center gap-1 ${textSize}`}>
          <CreditCard className={iconSize} />
          Connect Card
        </Badge>
      );
    }
  }

  // Handle owners - check verification_status
  if (userIntent === 'owner') {
    if (status === 'verified') {
      // Bank account is connected
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
    } else {
      // Unverified - show "Setup Payout"
      return (
        <Badge className={`bg-slate-100 text-slate-800 border-slate-200 border flex items-center gap-1 ${textSize}`}>
          <Building2 className={iconSize} />
          Setup Payout
        </Badge>
      );
    }
  }

  // Fallback for users without intent or unknown status
  if (!status || status === 'unverified') return null;

  const configs = {
    verified: {
      icon: ShieldCheck,
      text: 'Verified',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    pending: {
      icon: Clock,
      text: 'Verification Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    failed: {
      icon: XCircle,
      text: 'Verification Failed',
      className: 'bg-red-100 text-red-800 border-red-200'
    }
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge className={`${config.className} border flex items-center gap-1 ${textSize}`}>
      <Icon className={iconSize} />
      {config.text}
    </Badge>
  );
}