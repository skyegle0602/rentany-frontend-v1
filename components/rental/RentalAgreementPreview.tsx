import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  User as UserIcon, 
  Package, 
  Shield,
  MapPin,
  Clock,
  CheckCircle
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import Link from 'next/link';
import ConditionReportDisplay from '@/components/disputes/ConditionReportDisplay';

interface RentalRequest {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  start_date?: string;
  end_date?: string;
  total_amount: number;
  status: 'inquiry' | 'pending' | 'approved' | 'paid' | 'completed' | 'cancelled' | 'rejected';
  created_date: string;
  message?: string;
}

interface Item {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  location?: string;
  daily_rate: number;
  deposit?: number;
  images?: string[];
  videos?: string[];
  [key: string]: any;
}

interface User {
  full_name?: string;
  username?: string;
  profile_picture?: string;
  [key: string]: any;
}

interface ConditionReport {
  id?: string;
  report_type: 'pickup' | 'return';
  reported_by_email: string;
  created_date: string;
  notes?: string;
  damages_reported?: Array<{
    severity: string;
    description: string;
  }>;
  condition_photos?: string[];
}

interface RentalAgreementPreviewProps {
  rentalRequest: RentalRequest;
  item: Item;
  renter?: User;
  owner?: User;
  conditionReports?: ConditionReport[];
}

export default function RentalAgreementPreview({ 
  rentalRequest, 
  item, 
  renter, 
  owner,
  conditionReports = []
}: RentalAgreementPreviewProps) {
  if (!rentalRequest || !item) {
    return (
      <div className="text-center py-8 text-slate-500">
        Unable to load rental agreement details
      </div>
    );
  }

  const startDate = rentalRequest.start_date ? parseISO(rentalRequest.start_date) : null;
  const endDate = rentalRequest.end_date ? parseISO(rentalRequest.end_date) : null;
  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;
  const platformFee = rentalRequest.total_amount * 0.15;
  const itemImage = item.images?.[0] || item.videos?.[0];

  const pickupReports = conditionReports.filter(r => r.report_type === 'pickup');
  const returnReports = conditionReports.filter(r => r.report_type === 'return');

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Rental Agreement</h2>
        </div>
        <p className="text-slate-300 text-sm">
          Agreement ID: {rentalRequest.id}
        </p>
        <p className="text-slate-300 text-xs mt-1">
          Created: {format(new Date(rentalRequest.created_date), 'MMM d, yyyy at h:mm a')}
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Status:</span>
        <Badge className={
          rentalRequest.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
          rentalRequest.status === 'paid' ? 'bg-purple-100 text-purple-800 border-purple-200' :
          rentalRequest.status === 'approved' ? 'bg-blue-100 text-blue-800 border-blue-200' :
          'bg-yellow-100 text-yellow-800 border-yellow-200'
        }>
          {rentalRequest.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Item Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Rental Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {itemImage && (
              <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100">
                <img 
                  src={itemImage} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
              <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                {item.description}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{item.category}</Badge>
                <Badge variant="outline">{item.condition} condition</Badge>
                {item.location && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parties Involved */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="w-5 h-5" />
            Parties Involved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Owner */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Item Owner</p>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                  {owner?.profile_picture ? (
                    <img src={owner.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{owner?.full_name || 'Owner'}</p>
                  {owner?.username ? (
                    <Link href={`/public-profile?username=${owner.username}`} className="text-xs text-slate-600 hover:underline">
                      @{owner.username}
                    </Link>
                  ) : (
                    <p className="text-xs text-slate-500">{rentalRequest.owner_email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Renter */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Renter</p>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                  {renter?.profile_picture ? (
                    <img src={renter.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{renter?.full_name || 'Renter'}</p>
                  {renter?.username ? (
                    <Link href={`/public-profile?username=${renter.username}`} className="text-xs text-slate-600 hover:underline">
                      @{renter.username}
                    </Link>
                  ) : (
                    <p className="text-xs text-slate-500">{rentalRequest.renter_email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Period */}
      {rentalRequest.status !== 'inquiry' && startDate && endDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Rental Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Start Date:</span>
                <span className="font-medium">{format(startDate, 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">End Date:</span>
                <span className="font-medium">{format(endDate, 'MMMM d, yyyy')}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Total Duration:
                </span>
                <span className="font-bold text-lg">{rentalDays} {rentalDays === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Breakdown */}
      {rentalRequest.status !== 'inquiry' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5" />
              Pricing Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Daily Rate:</span>
                <span className="font-medium">${item.daily_rate.toFixed(2)}/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Number of Days:</span>
                <span className="font-medium">{rentalDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Base Rental Cost:</span>
                <span className="font-medium">${rentalRequest.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Platform Fee (15%):</span>
                <span className="font-medium">${platformFee.toFixed(2)}</span>
              </div>
              {item.deposit && item.deposit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Security Deposit:</span>
                  <span className="font-medium">${item.deposit.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Total Paid by Renter:</span>
                <span className="font-bold text-xl text-green-600">
                  ${(rentalRequest.total_amount + platformFee + (item.deposit || 0)).toFixed(2)}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-blue-800">
                  <strong>Owner Payout:</strong> ${(rentalRequest.total_amount * 0.85).toFixed(2)} 
                  <span className="text-blue-600"> (after 15% platform fee)</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial Message */}
      {rentalRequest.message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Initial Request Message</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700 italic">"{rentalRequest.message}"</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condition Reports */}
      {conditionReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5" />
              Condition Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pickupReports.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Pre-Rental Condition ({pickupReports.length} of 2)
                </h4>
                <div className="space-y-3">
                  {pickupReports.map(report => (
                    <ConditionReportDisplay key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}

            {returnReports.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Return Condition ({returnReports.length} of 2)
                </h4>
                <div className="space-y-3">
                  {returnReports.map(report => (
                    <ConditionReportDisplay key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5" />
            Terms & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p>The renter agrees to return the item in the same condition as received, accounting for normal wear and tear.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Any damages beyond normal wear will be the responsibility of the renter and may result in charges.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p>The security deposit will be refunded within 7 days after successful return of the item.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Late returns may incur additional fees as per the platform's late return policy.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Both parties agree to resolve any disputes through Rentany's mediation process.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p>Payment is held securely until the rental is completed and both parties confirm satisfaction.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-xs text-slate-600">
          This agreement is governed by Rentany's{' '}
          <Link href="/terms-and-conditions" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy-policy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}