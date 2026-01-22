'use client'

import React, { useState } from 'react';
import { api, getCurrentUser } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Ban, Flag } from 'lucide-react';
import ReportDialog from '@/components/reports/ReportsDialog';

interface BlockReportMenuProps {
  targetEmail: string;
  targetName: string;
}

interface UserBlock {
  id: string;
  blocker_email: string;
  blocked_email: string;
  reason?: string;
}

export default function BlockReportMenu({ targetEmail, targetName }: BlockReportMenuProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (!confirm(`Are you sure you want to block ${targetName}? You won't see their listings and they won't be able to contact you.`)) {
      return;
    }

    setIsBlocking(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !currentUser.email) {
        alert('You must be logged in to block users.');
        return;
      }
      
      // Check if already blocked
      const existingBlocksResponse = await api.request<UserBlock[]>(`/user-blocks?blocker_email=${encodeURIComponent(currentUser.email)}&blocked_email=${encodeURIComponent(targetEmail)}`);
      const existingBlocks = existingBlocksResponse.success && existingBlocksResponse.data ? existingBlocksResponse.data : [];

      if (existingBlocks.length > 0) {
        alert('You have already blocked this user.');
        return;
      }

      await api.request('/user-blocks', {
        method: 'POST',
        body: JSON.stringify({
          blocker_email: currentUser.email,
          blocked_email: targetEmail,
          reason: 'Blocked by user'
        }),
      });

      alert(`${targetName} has been blocked.`);
      window.location.reload(); // Refresh to update UI
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-red-600">
            <Flag className="w-4 h-4 mr-2" />
            Report User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBlock} disabled={isBlocking} className="text-slate-700">
            <Ban className="w-4 h-4 mr-2" />
            {isBlocking ? 'Blocking...' : 'Block User'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        reportType="user"
        targetEmail={targetEmail}
        targetName={targetName}
      />
    </>
  );
}