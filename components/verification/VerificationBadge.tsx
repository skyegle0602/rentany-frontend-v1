import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';

interface VerificationBadgeProps {
    status: 'verified' | 'pending' | 'failed' | 'unverified';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function VerificationBadge({ status, size = "sm" }: VerificationBadgeProps) {
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
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge className={`${config.className} border flex items-center gap-1 ${textSize}`}>
      <Icon className={iconSize} />
      {config.text}
    </Badge>
  );
}