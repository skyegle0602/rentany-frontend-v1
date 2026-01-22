"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface DamageReport {
  severity: string;
  description: string;
}

interface ConditionReport {
  id?: string;
  report_type: 'pickup' | 'return';
  reported_by_email: string;
  created_date: string;
  notes?: string;
  damages_reported?: DamageReport[];
  condition_photos?: string[];
}

interface ConditionReportDisplayProps {
  report: ConditionReport;
}

export default function ConditionReportDisplay({ report }: ConditionReportDisplayProps) {
  const isPickup = report.report_type === 'pickup';
  
  return (
    <Card className={`${isPickup ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera className={`w-5 h-5 ${isPickup ? 'text-blue-600' : 'text-purple-600'}`} />
            <div>
              <h4 className="font-semibold text-sm">
                {isPickup ? 'Pickup Inspection' : 'Return Inspection'}
              </h4>
              <p className="text-xs text-slate-600">
                by {report.reported_by_email}
              </p>
            </div>
          </div>
          <Badge className={`${isPickup ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'} border-0`}>
            {format(new Date(report.created_date), 'MMM d, h:mm a')}
          </Badge>
        </div>

        {report.notes && (
          <p className="text-sm text-slate-700 mb-3">{report.notes}</p>
        )}

        {report.damages_reported && report.damages_reported.length > 0 && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm font-semibold text-red-900">
                {report.damages_reported.length} Damage(s) Reported
              </p>
            </div>
            <div className="space-y-2">
              {report.damages_reported.map((damage, index) => (
                <div key={index} className="text-sm text-red-800">
                  <span className="font-medium">{damage.severity}:</span> {damage.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {report.condition_photos && report.condition_photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {report.condition_photos.map((photo, index) => (
              <a 
                key={index} 
                href={photo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={photo}
                  alt={`Condition ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}