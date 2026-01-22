'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as DayPicker } from '@/components/ui/calendar';
import { format, differenceInDays, startOfMonth, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
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
  onDateChange?: (dates: { start_date: string; end_date: string }) => void;
}

export default function AvailabilityCalendar({ itemId, isOwner = false, onDateChange }: AvailabilityCalendarProps) {
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
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

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (onDateChange && range?.from && range?.to) {
      onDateChange({ start_date: format(range.from, 'yyyy-MM-dd'), end_date: format(range.to, 'yyyy-MM-dd') });
    } else if (onDateChange) {
      onDateChange({ start_date: '', end_date: '' });
    }
  };

  const handleBlockDates = async () => {
    if (!selectedRange || !selectedRange.from || !selectedRange.to) return;
    setIsBlocking(true);
    try {
      await createItemAvailability({
        item_id: itemId,
        blocked_start_date: format(selectedRange.from, 'yyyy-MM-dd'),
        blocked_end_date: format(selectedRange.to, 'yyyy-MM-dd'),
        reason: blockReason,
      });
      await loadAvailability();
      setSelectedRange(undefined);
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

  const disabledDays = [{ before: new Date() }, ...blockedRanges];

  // Footer text for each month
  const getFooterText = () => {
    if (selectedRange?.from) {
      if (!selectedRange.to) {
        return format(selectedRange.from, 'PPP');
      } else if (selectedRange.to) {
        const days = differenceInDays(selectedRange.to, selectedRange.from) + 1;
        return `${format(selectedRange.from, 'PPP')}–${format(selectedRange.to, 'PPP')} (${days} days)`;
      }
    }
    return "Please pick the first day.";
  };

  const firstMonth = currentMonth;
  const secondMonth = addMonths(currentMonth, 1);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Calendar grid styling */
        .availability-calendar .rdp-month {
          width: 100% !important;
        }

        /* Hide default navigation */
        .availability-calendar .rdp-nav {
          display: none !important;
        }

        /* Calendar table styling - ensure proper alignment */
        .availability-calendar .rdp-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        /* Days of week headers - ensure equal width and alignment */
        .availability-calendar .rdp-head_row {
          display: flex !important;
          width: 100% !important;
          margin: 0 !important;
        }

        .availability-calendar .rdp-head_cell {
          flex: 1 1 0% !important;
          min-width: 0 !important;
          text-align: center !important;
          padding: 0.25rem 0 !important;
          font-size: 0.8rem !important;
          font-weight: normal !important;
          color: #6b7280 !important;
        }

        /* Calendar rows - ensure equal width cells */
        .availability-calendar .rdp-row {
          display: flex !important;
          width: 100% !important;
          margin-top: 0.5rem !important;
        }

        .availability-calendar .rdp-cell {
          flex: 1 1 0% !important;
          min-width: 0 !important;
          text-align: center !important;
          padding: 0 !important;
          position: relative !important;
        }

        /* Day buttons - ensure proper sizing and alignment */
        .availability-calendar .rdp-day {
          width: 100% !important;
          height: 2rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 auto !important;
        }

        .availability-calendar .rdp-day button {
          width: 100% !important;
          height: 2rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 0.375rem !important;
        }

        /* Unavailable/Blocked dates - Light Red Background with Strikethrough */
        .availability-calendar .rdp-day_disabled button,
        .availability-calendar .rdp-day_disabled > button,
        .availability-calendar button[disabled],
        .availability-calendar .rdp button[disabled],
        .availability-calendar .rdp-day button[disabled] {
          background-color: #fee2e2 !important;
          color: #991b1b !important;
          text-decoration: line-through !important;
          opacity: 1 !important;
          cursor: not-allowed !important;
        }

        /* Available dates - White Background with Black Text */
        .availability-calendar .rdp-day:not(.rdp-day_disabled):not(.rdp-day_selected):not(.rdp-day_range_start):not(.rdp-day_range_end):not(.rdp-day_range_middle) > button:not([disabled]):not([aria-selected="true"]) {
          background-color: white !important;
          color: #1f2937 !important;
        }

        /* Selected date - Yellow Background */
        .availability-calendar .rdp-day_selected > button,
        .availability-calendar .rdp-day_selected button,
        .availability-calendar button[aria-selected="true"]:not([disabled]) {
          background-color: #fef08a !important;
          color: #1f2937 !important;
          opacity: 1 !important;
          font-weight: 600 !important;
        }

        /* Range start and end - Yellow Background */
        .availability-calendar .rdp-day_range_start > button,
        .availability-calendar .rdp-day_range_end > button {
          background-color: #fef08a !important;
          color: #1f2937 !important;
          opacity: 1 !important;
          font-weight: 600 !important;
        }

        /* Range middle - Yellow Background */
        .availability-calendar .rdp-day_range_middle > button {
          background-color: #fef08a !important;
          color: #1f2937 !important;
          opacity: 0.9 !important;
        }

        /* Hover for available dates */
        .availability-calendar .rdp-day:not(.rdp-day_disabled):not(.rdp-day_selected) > button:not([disabled]):hover {
          background-color: #f3f4f6 !important;
        }

        /* Override default disabled styles */
        .availability-calendar .rdp-day_disabled {
          opacity: 1 !important;
        }
      `}} />
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm availability-calendar">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          <div className="flex-grow">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - First Month */}
              <div className="flex flex-col space-y-0">
                {/* Row 1: Previous Button + Month Name */}
                <div className="flex items-center justify-between px-2 pb-2">
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900 flex-grow text-center">
                    {format(firstMonth, 'MMMM yyyy')}
                  </span>
                  <div className="w-8" /> {/* Spacer for alignment */}
                </div>
                {/* Row 2: Calendar Grid */}
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleSelect}
                  disabled={disabledDays}
                  month={firstMonth}
                  numberOfMonths={1}
                  className="w-full p-0"
                  showOutsideDays={true}
                  classNames={{
                    month: "space-y-2",
                    caption: "hidden", // Hide default caption
                    table: "w-full",
                    head_row: "flex w-full",
                    head_cell: "flex-1 text-center text-xs text-gray-500 font-normal",
                    row: "flex w-full mt-2",
                    cell: "flex-1 text-center",
                    day: "h-8 w-8 p-0",
                    day_disabled: "availability-disabled",
                    day_selected: "availability-selected",
                    day_range_start: "availability-range-start",
                    day_range_end: "availability-range-end",
                    day_range_middle: "availability-range-middle",
                  }}
                />
                {/* Row 3: Footer */}
                <div className="pt-2">
                  <p className="text-sm text-slate-500 p-2 text-center">{getFooterText()}</p>
                </div>
              </div>

              {/* Right Column - Second Month */}
              <div className="flex flex-col space-y-0">
                {/* Row 1: Month Name + Next Button */}
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="w-8" /> {/* Spacer for alignment */}
                  <span className="text-sm font-semibold text-gray-900 flex-grow text-center">
                    {format(secondMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {/* Row 2: Calendar Grid */}
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleSelect}
                  disabled={disabledDays}
                  month={secondMonth}
                  numberOfMonths={1}
                  className="w-full p-0"
                  showOutsideDays={true}
                  classNames={{
                    month: "space-y-2",
                    caption: "hidden", // Hide default caption
                    table: "w-full",
                    head_row: "flex w-full",
                    head_cell: "flex-1 text-center text-xs text-gray-500 font-normal",
                    row: "flex w-full mt-2",
                    cell: "flex-1 text-center",
                    day: "h-8 w-8 p-0",
                    day_disabled: "availability-disabled",
                    day_selected: "availability-selected",
                    day_range_start: "availability-range-start",
                    day_range_end: "availability-range-end",
                    day_range_middle: "availability-range-middle",
                  }}
                />
                {/* Row 3: Footer */}
                <div className="pt-2">
                  <p className="text-sm text-slate-500 p-2 text-center">{getFooterText()}</p>
                </div>
              </div>
            </div>
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
                <Button onClick={handleBlockDates} disabled={!selectedRange || isBlocking} className="w-full mt-4">
                  {isBlocking ? 'Blocking...' : 'Block Selected Dates'}
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
