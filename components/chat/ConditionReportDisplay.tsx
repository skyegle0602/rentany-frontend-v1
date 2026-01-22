
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface DamageReport {
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photo_url?: string;
}

interface ConditionReport {
  report_type: 'pickup' | 'return';
  created_date: string;
  notes?: string;
  damages_reported?: DamageReport[];
  condition_photos?: string[];
  reported_by_username?: string;
  reported_by_email: string;
}

interface ConditionReportDisplayProps {
  report: ConditionReport;
}

export default function ConditionReportDisplay({ report }: ConditionReportDisplayProps) {
  const severityColors = {
    minor: "bg-yellow-100 text-yellow-800 border-yellow-200",
    moderate: "bg-orange-100 text-orange-800 border-orange-200",
    severe: "bg-red-100 text-red-800 border-red-200"
  };

  const reportTypeColors = {
    pickup: "bg-blue-50 border-blue-200",
    return: "bg-purple-50 border-purple-200"
  };

  return (
    <Card className={`${reportTypeColors[report.report_type]} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className={`w-4 h-4 ${report.report_type === 'pickup' ? 'text-blue-600' : 'text-purple-600'}`} />
            <span className="font-semibold text-sm capitalize">
              {report.report_type === 'pickup' ? 'Pre-Rental' : 'Return'} Report
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {format(new Date(report.created_date), 'MMM d, h:mm a')}
          </span>
        </div>

        {report.notes && (
          <p className="text-sm text-slate-700 mb-3">{report.notes}</p>
        )}

        {report.damages_reported && report.damages_reported.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Damages Reported:
            </div>
            {report.damages_reported.map((damage, index) => (
              <div key={index} className="bg-white rounded-lg p-2 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-800">{damage.description}</span>
                  <Badge className={`${severityColors[damage.severity]} text-xs`}>
                    {damage.severity}
                  </Badge>
                </div>
                {damage.photo_url && (
                  <img 
                    src={damage.photo_url} 
                    alt={`Damage ${index + 1}`}
                    className="w-full h-32 object-cover rounded mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {report.condition_photos && report.condition_photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {report.condition_photos.map((photo, index) => (
              <img 
                key={index}
                src={photo} 
                alt={`Condition ${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Submitted by{' '}
            {report.reported_by_username ? (
              <Link 
                href={`/public-profile?username=${report.reported_by_username}`}
                className="font-medium hover:underline text-slate-700"
              >
                @{report.reported_by_username}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{report.reported_by_email}</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
