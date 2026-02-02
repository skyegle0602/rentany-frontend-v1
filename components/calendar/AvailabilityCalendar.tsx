'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as DayPicker } from '@/components/ui/calendar';
import { format, differenceInDays, startOfMonth, addMonths, addDays, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, X } from 'lucide-react';
import type { Matcher } from 'react-day-picker';
import { getItemAvailability, createItemAvailability, deleteItemAvailability } from '@/lib/api-client';

interface BlockedRange {
  from: Date;
  to: Date;
  reason: string;
  id: string;
}

interface AvailabilityItem {
  blocked_start_date: string;
  blocked_end_date: string;
  reason: string;
  id: string;
}

interface AvailabilityCalendarProps {
  itemId: string;
  isOwner?: boolean;
  selectionMode?: 'multiple'; // Multiple date selection
  onDateChange?: (dates: { selected_dates: string[] }) => void;
}

export default function AvailabilityCalendar({ itemId, isOwner = false, selectionMode = 'multiple', onDateChange }: AvailabilityCalendarProps) {
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]); // For multiple date selection
  const [blockReason, setBlockReason] = useState<string>('personal_use');
  const [isBlocking, setIsBlocking] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const loadAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      const availabilities = await getItemAvailability(itemId);
      const ranges = availabilities.map((av) => ({
        from: new Date(av.blocked_start_date),
        to: new Date(av.blocked_end_date),
        reason: av.reason,
        id: av.id || '',
      }));
      setBlockedRanges(ranges);
    } catch (error) {
      console.error("Error loading item availability:", error);
    }
    setIsLoading(false);
  }, [itemId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleMultipleSelect = (dates: Date[] | undefined) => {
    // In multiple mode, react-day-picker passes an array of selected dates
    const newDates = dates || [];
    setSelectedDates(newDates);
    
    // Notify parent component
    if (onDateChange) {
      onDateChange({ selected_dates: newDates.map(d => format(d, 'yyyy-MM-dd')) });
    }
  };

  const handleBlockDates = async () => {
    // Block each selected date individually
    if (selectedDates.length === 0) return;
    setIsBlocking(true);
    try {
      await Promise.all(selectedDates.map(date => {
        // Set start to beginning of day and end to end of same day to block only that single day
        // This ensures start < end (required by backend) while blocking only the selected day
        const startOfDayDate = new Date(date);
        startOfDayDate.setHours(0, 0, 0, 0);
        const endOfDayDate = endOfDay(date);
        
        return createItemAvailability({
          item_id: itemId,
          blocked_start_date: startOfDayDate.toISOString(),
          blocked_end_date: endOfDayDate.toISOString(),
          reason: blockReason,
        });
      }));
      await loadAvailability();
      setSelectedDates([]);
    } catch (error) {
      console.error("Error blocking dates:", error);
    }
    setIsBlocking(false);
  };
  
  const handleUnblockDate = async (id: string) => {
    try {
      await deleteItemAvailability(id);
      await loadAvailability();
    } catch (error) {
      console.error("Error unblocking date:", error);
    }
  };

  const disabledDays: Matcher[] = [{ before: new Date() }, ...blockedRanges];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Navigation buttons positioning for 2 months */
        /* Hide next button on first month, hide previous button on second month */
        .rdp-months > .rdp-month:first-child .rdp-nav_button_next {
          display: none !important;
        }
        .rdp-months > .rdp-month:last-child .rdp-nav_button_previous {
          display: none !important;
        }
        
        /* Position previous button on first month (left side) */
        .rdp-months > .rdp-month:first-child .rdp-nav_button_previous {
          position: absolute !important;
          left: 0.25rem !important;
        }
        
        /* Position next button on second month (right side) */
        .rdp-months > .rdp-month:last-child .rdp-nav_button_next {
          position: absolute !important;
          right: 0.25rem !important;
        }
        
        /* Disabled dates - Light red background */
        .rdp-day_disabled button,
        .rdp-day_disabled > button,
        button[disabled] {
          background-color:rgb(219, 108, 108) !important;
          color:rgb(218, 28, 28) !important;
        }
        
        /* Selected dates - Dark blue background */
        .rdp-day_selected button,
        .rdp-day_selected > button,
        button[aria-selected="true"],
        .rdp-day button[aria-selected="true"] {
          background-color: #0f172a !important; /* slate-900 */
          color: #f8fafc !important; /* slate-50 */
          opacity: 1 !important;
          border-color: #0f172a !important;
        }
        
        /* Ensure selected overrides disabled */
        .rdp-day_disabled.rdp-day_selected button,
        .rdp-day_disabled button[aria-selected="true"] {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          border-color: #0f172a !important;
        }
      `}} />
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          <div className="flex-grow">
            
              {/* Calendar Grid */}
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={handleMultipleSelect}
                disabled={disabledDays}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                numberOfMonths={2}
                className="w-full"
                showOutsideDays={true}
              />
            
          </div>
          {isOwner && (
            <div className="md:w-64 space-y-4 md:border-l md:pl-6">
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Block Dates</h4>
                <p className="text-xs text-slate-500 mb-2">Select a date range on the calendar to block it for personal use or maintenance.</p>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <select
                    id="reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="personal_use">Personal Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Button 
                  onClick={handleBlockDates} 
                  disabled={selectedDates.length === 0 || isBlocking} 
                  className="w-full mt-4"
                >
                  {isBlocking ? 'Blocking...' : `Block ${selectedDates.length} Date${selectedDates.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-800 mb-2">Blocked Periods</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {blockedRanges.filter(r => r.reason !== 'rented').length > 0 ? (
                    blockedRanges.filter(r => r.reason !== 'rented').map(range => (
                      <div key={range.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
                        <div className="text-xs">
                          <p>{format(range.from, 'MMM d')} - {format(range.to, 'MMM d, yyyy')}</p>
                          <p className="capitalize text-slate-500">{range.reason.replace('_', ' ')}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handleUnblockDate(range.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No manually blocked dates.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
