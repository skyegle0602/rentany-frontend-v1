import React from 'react';
import { Shield, CreditCard, Users, Clock, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from '../language/LanguageContext';

const getBadges = (t: (keyPath: string) => string) => [
  {
    icon: Shield,
    label: t('trust.verifiedUsers'),
    sublabel: t('trust.idChecked'),
    tooltip: t('trust.verifiedTooltip')
  },
  {
    icon: CreditCard,
    label: t('trust.securePayments'),
    sublabel: t('trust.stripeProtected'),
    tooltip: t('trust.paymentsTooltip')
  },
  {
    icon: Users,
    label: t('trust.depositProtection'),
    sublabel: t('trust.fullyRefundable'),
    tooltip: t('trust.depositTooltip')
  },
  {
    icon: Clock,
    label: t('trust.support'),
    sublabel: t('trust.alwaysHere'),
    tooltip: t('trust.supportTooltip')
  }
];

export default function TrustBadges() {
  const { t } = useLanguage();
  const badges = getBadges(t);
  
  return (
    <TooltipProvider>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {badges.map((badge, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <badge.icon className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-slate-900 text-sm">{badge.label}</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {badge.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-slate-500">{badge.sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}