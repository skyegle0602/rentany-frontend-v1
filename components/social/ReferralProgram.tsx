'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Check, Users, Share2 } from 'lucide-react';
import { getCurrentUser, api } from '@/lib/api-client';

interface Referral {
  id: string;
  referrer_email: string;
  referred_email: string;
  referral_code: string;
  is_completed: boolean;
  credit_amount?: number;
  created_date: string;
}

interface ReferralProgramProps {
  user: any;
  onUpdate?: () => void;
}

export default function ReferralProgram({ user, onUpdate }: ReferralProgramProps) {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      // Generate or get referral code
      let code = user.referral_code;
      if (!code) {
        code = generateReferralCode(user.email);
        await api.request('/users/me', {
          method: 'PUT',
          body: JSON.stringify({ referral_code: code }),
        });
        if (onUpdate) onUpdate();
      }
      setReferralCode(code);

      // Load completed referrals
      const response = await api.request<Referral[]>('/referrals', {
        method: 'GET',
      });
      if (response.success && response.data) {
        const userReferrals = Array.isArray(response.data)
          ? response.data.filter((r: Referral) => r.referrer_email === user.email)
          : [];
        setReferrals(userReferrals);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = (email: string) => {
    const prefix = email.split('@')[0].slice(0, 4).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    const shareData = {
      title: 'Join Rentany!',
      text: 'Rent anything from anyone. Use my referral link and we both get $10!',
      url: link
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      copyReferralLink();
    }
  };

  const completedReferrals = referrals.filter(r => r.is_completed);
  const pendingReferrals = referrals.filter(r => !r.is_completed);
  const totalEarnings = completedReferrals.reduce((sum, r) => sum + (r.credit_amount || 10), 0);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-12 bg-slate-200 rounded" />
            <div className="h-20 bg-slate-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Referral Program</h2>
            <p className="text-purple-100 text-sm">Invite friends & earn $10 each!</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{referrals.length}</div>
            <div className="text-xs text-purple-100">Invited</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{completedReferrals.length}</div>
            <div className="text-xs text-purple-100">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">${totalEarnings}</div>
            <div className="text-xs text-purple-100">Earned</div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Referral Code */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg text-center tracking-wider bg-slate-50"
            />
            <Button
              variant="outline"
              onClick={copyReferralLink}
              className="flex-shrink-0"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              onClick={shareReferralLink}
              className="flex-shrink-0 bg-purple-600 hover:bg-purple-700"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">How it Works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-purple-600">1</span>
              </div>
              <p className="text-sm text-slate-600">Share your referral link with friends</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-purple-600">2</span>
              </div>
              <p className="text-sm text-slate-600">They sign up and complete their first rental</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-purple-600">3</span>
              </div>
              <p className="text-sm text-slate-600">You both receive $10 credit!</p>
            </div>
          </div>
        </div>

        {/* Referral History */}
        {referrals.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Your Referrals</h3>
            <div className="space-y-2">
              {referrals.slice(0, 5).map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {referral.referred_email.split('@')[0]}***
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(referral.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={referral.is_completed 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }>
                    {referral.is_completed ? '+$10 Earned' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}