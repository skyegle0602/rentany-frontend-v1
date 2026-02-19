'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as DayPicker, CalendarDayButton } from '@/components/ui/calendar';
import { format, differenceInDays, startOfMonth, addMonths, addDays, endOfDay, eachDayOfInterval, addHours, startOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, X, Info } from 'lucide-react';
import type { Matcher, DateRange, DayButtonProps } from 'react-day-picker';
import { getItemAvailability, createItemAvailability, deleteItemAvailability, api } from '@/lib/api-client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BlockedRange {
  from: Date;
  to: Date;
  reason: string;
  id: string;
}

interface AvailabilityItem {
  blocked_start_date: string;
  blocked_end_date: string;
  notice_period_hours: number;
  same_day_pickup: boolean;
  reason: string;
  id: string;
}

interface AvailabilityCalendarProps {
  itemId: string;
  isOwner?: boolean;
  selectionMode?: 'multiple' | 'range'; // Multiple date selection or range (duration) selection
  onDateChange?: (dates: { selected_dates: string[] }) => void;
  noticePeriodHours?: number; // Hours before pickup required (for renters)
  sameDayPickup?: boolean; // Whether same-day pickup is allowed
}

export default function AvailabilityCalendar({ itemId, isOwner = false, selectionMode = 'range', onDateChange, noticePeriodHours = 24, sameDayPickup = false }: AvailabilityCalendarProps) {
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]); // For multiple date selection (owner mode)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined); // For range selection (renter mode)
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
      console.log('Loaded blocked ranges:', ranges);
    } catch (error) {
      console.error("Error loading item availability:", error);
      setBlockedRanges([]);
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

  const handleRangeSelect = (range: DateRange | undefined) => {
    // In range mode, react-day-picker passes a DateRange object with from and to
    setSelectedRange(range);
    
    // Convert range to array of dates for backward compatibility with parent component
    if (onDateChange && range?.from) {
      if (range.to) {
        // Full range selected - generate all dates between from and to (inclusive)
        const allDates = eachDayOfInterval({ start: range.from, end: range.to });
        onDateChange({ selected_dates: allDates.map(d => format(d, 'yyyy-MM-dd')) });
      } else {
        // Only start date selected - just that date
        onDateChange({ selected_dates: [format(range.from, 'yyyy-MM-dd')] });
      }
    } else if (onDateChange) {
      // Range cleared
      onDateChange({ selected_dates: [] });
    }
  };

  const handleBlockDates = async () => {
    // Block each selected date individually
    if (selectedDates.length === 0) return;
    setIsBlocking(true);
    try {
      const results = await Promise.allSettled(selectedDates.map(date => {
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
      
      // Check for any failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error("Some dates failed to block:", failures);
        const errorMessages = failures.map((f: any) => f.reason?.message || 'Unknown error').join(', ');
        alert(`Failed to block some dates: ${errorMessages}`);
      } else {
        // Success - reload availability and clear selection
      await loadAvailability();
        setSelectedDates([]);
        // Show success message
        alert(`Successfully blocked ${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error("Error blocking dates:", error);
      alert(`Failed to block dates: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsBlocking(false);
    }
  };
  
  const handleUnblockDate = async (id: string) => {
    try {
      await deleteItemAvailability(id);
      await loadAvailability();
    } catch (error) {
      console.error("Error unblocking date:", error);
    }
  };

  // Calculate earliest available pickup date based on notice period
  // Logic: If notice period is 24h and current time is 11th 10:00 AM,
  // earliest pickup time is 12th 10:00 AM, so 12th should be disabled (can't guarantee pickup at 10 AM)
  // First available day is 13th
  const earliestAvailableDate = useMemo(() => {
    if (isOwner) return null; // Owners don't need notice period restrictions
    
    const hours = Number(noticePeriodHours) || 24;
    if (hours <= 0) {
      // If no notice period, earliest is tomorrow (unless same-day is allowed)
      const today = startOfDay(new Date());
      return sameDayPickup ? today : addDays(today, 1);
    }
    
    const now = new Date();
    const earliestPickupTime = addHours(now, hours);
    const earliestPickupDay = startOfDay(earliestPickupTime);
    
    // If the notice period ends on the same day (e.g., 11th 10 AM + 12h = 11th 10 PM),
    // we still need to disable that day because we can't guarantee pickup
    // So we always use the NEXT day after the notice period expires
    const firstAvailableDay = addDays(earliestPickupDay, 1);
    
    return firstAvailableDay;
  }, [isOwner, noticePeriodHours, sameDayPickup]);

  // Helper function to determine why a date is disabled (for tooltips and styling)
  const getDateDisableReason = useCallback((date: Date): 'past' | 'notice-period' | 'same-day' | 'blocked' | null => {
    const dateStart = startOfDay(date);
    const today = startOfDay(new Date());
    
    // Check if it's in a blocked range (applies to both owners and renters)
    const isBlocked = blockedRanges.some(range => {
      const rangeStart = startOfDay(range.from);
      const rangeEnd = startOfDay(range.to);
      return dateStart >= rangeStart && dateStart <= rangeEnd;
    });
    
    if (isBlocked) {
      return 'blocked';
    }
    
    // For owners, only check past dates and blocked ranges
    if (isOwner) {
      if (dateStart < today) {
        return 'past';
      }
      return null;
    }
    
    // For renters, check all restrictions
    // Check if it's a past date
    if (dateStart < today) {
      return 'past';
    }
    
    // Check if it's within notice period
    if (earliestAvailableDate && dateStart < earliestAvailableDate) {
      return 'notice-period';
    }
    
    // Check if same-day pickup is not allowed
    if (!sameDayPickup && isSameDay(date, today)) {
      return 'same-day';
    }
    
    return null;
  }, [isOwner, earliestAvailableDate, sameDayPickup, blockedRanges]);

  // Create disabled days matcher
  const disabledDays: Matcher[] = useMemo(() => {
    const matchers: Matcher[] = [];
    const today = startOfDay(new Date());

    if (isOwner) {
      // For owners, just disable past dates
      // Blocked ranges are added separately below
      matchers.push({ before: today });
    } else {
      // For renters, apply notice period restrictions
      matchers.push((date) => {
        return getDateDisableReason(date) !== null;
      });
    }

    // Add blocked ranges
    blockedRanges.forEach(range => {
      if (range.from && range.to) {
        matchers.push({ from: range.from, to: range.to });
      }
    });
    
    return matchers;
  }, [isOwner, getDateDisableReason, blockedRanges]);

  // Get tooltip message for a disabled date
  const getDateTooltip = useCallback((date: Date): string | null => {
    const reason = getDateDisableReason(date);
    if (!reason) return null;
    
    switch (reason) {
      case 'past':
        return 'This date has passed';
      case 'notice-period':
        return earliestAvailableDate 
          ? `Earliest pickup: ${format(earliestAvailableDate, 'MMM d, yyyy')}`
          : 'This date is within the notice period';
      case 'same-day':
        return 'Same-day pickup is not available. Please select a future date.';
      case 'blocked':
        return isOwner ? 'This date is blocked' : 'This date is blocked by the owner';
      default:
        return null;
    }
  }, [isOwner, getDateDisableReason, earliestAvailableDate]);

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
        
        /* Disabled dates - Past dates (darker red) - using CSS class */
        .rdp-day_disabled button.disable-reason-past,
        .rdp-day_disabled .disable-reason-past,
        .rdp-day_disabled .disable-reason-past button,
        button.disable-reason-past[disabled],
        .disable-reason-past[disabled] {
          background-color: #dc2626 !important; /* red-600 */
          color: #ffffff !important;
          opacity: 0.6 !important;
        }
        
        /* Disabled dates - Notice period (orange/amber) - using CSS class */
        .rdp-day_disabled button.disable-reason-notice-period,
        .rdp-day_disabled .disable-reason-notice-period,
        .rdp-day_disabled .disable-reason-notice-period button,
        button.disable-reason-notice-period[disabled],
        .disable-reason-notice-period[disabled] {
          background-color: #f59e0b !important; /* amber-500 */
          color: #ffffff !important;
          opacity: 0.7 !important;
        }
        
        /* Disabled dates - Same-day not allowed (light orange) - using CSS class */
        .rdp-day_disabled button.disable-reason-same-day,
        .rdp-day_disabled .disable-reason-same-day,
        .rdp-day_disabled .disable-reason-same-day button,
        button.disable-reason-same-day[disabled],
        .disable-reason-same-day[disabled] {
          background-color: #fb923c !important; /* orange-400 */
          color: #ffffff !important;
          opacity: 0.7 !important;
        }
        
        /* Disabled dates - Blocked by owner (red) - using CSS class */
        .rdp-day_disabled button.disable-reason-blocked,
        .rdp-day_disabled .disable-reason-blocked,
        .rdp-day_disabled .disable-reason-blocked button,
        button.disable-reason-blocked[disabled],
        .disable-reason-blocked[disabled] {
          background-color: #ef4444 !important; /* red-500 */
          color: #ffffff !important;
          opacity: 0.7 !important;
        }
        
        /* Fallback for other disabled dates - use original styling */
        .rdp-day_disabled button:not(.disable-reason-past):not(.disable-reason-notice-period):not(.disable-reason-same-day):not(.disable-reason-blocked),
        .rdp-day_disabled > button:not(.disable-reason-past):not(.disable-reason-notice-period):not(.disable-reason-same-day):not(.disable-reason-blocked) {
          background-color: hsl(0, 71.70%, 57.10%) !important;
          color: rgb(218, 28, 28) !important;
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
        
        /* Range selection styles */
        .rdp-day_range_start button,
        .rdp-day_range_end button {
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }
        
        .rdp-day_range_middle button {
          background-color: #1e293b !important; /* slate-800 */
          color: #f8fafc !important;
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
            {/* Helper message for renters */}
            {!isOwner && earliestAvailableDate && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Earliest pickup date:</strong> {format(earliestAvailableDate, 'EEEE, MMMM d, yyyy')}
                  {noticePeriodHours > 0 && (
                    <span className="block mt-1 text-xs text-blue-600">
                      The owner requires {noticePeriodHours} hour{noticePeriodHours !== 1 ? 's' : ''} notice before pickup.
                  </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Legend for renters */}
            {!isOwner && (
              <div className="mb-4 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-600 opacity-60"></div>
                  <span className="text-slate-600">Past dates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500 opacity-70"></div>
                  <span className="text-slate-600">Notice period</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-400 opacity-70"></div>
                  <span className="text-slate-600">Same-day unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500 opacity-70"></div>
                  <span className="text-slate-600">Blocked by owner</span>
                </div>
              </div>
            )}
            
              {/* Calendar Grid */}
              <TooltipProvider delayDuration={200}>
                {isOwner ? (
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
                    components={{
                      DayButton: (props: DayButtonProps) => {
                        const { day, modifiers, className, ...buttonProps } = props;
                        const date = day.date;
                        const tooltipText = getDateTooltip(date);
                        const disableReason = getDateDisableReason(date);
                        
                        // Add CSS class based on disable reason
                        const disableClass = disableReason ? `disable-reason-${disableReason}` : '';
                        const combinedClassName = className ? `${className} ${disableClass}` : disableClass;
                        
                        // Use a ref to ensure the class is applied to the button element
                        const buttonRef = React.useRef<HTMLButtonElement>(null);
                        
                        React.useEffect(() => {
                          if (buttonRef.current && disableReason) {
                            buttonRef.current.classList.add(`disable-reason-${disableReason}`);
                          }
                        }, [disableReason]);
                        
                        // Create the button with CalendarDayButton
                        const button = (
                          <CalendarDayButton
                            day={day}
                            modifiers={modifiers}
                            className={combinedClassName}
                            {...(buttonProps as any)}
                            ref={buttonRef}
                          />
                        );

                        if (tooltipText && disableReason) {
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {button}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{tooltipText}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return button;
                      },
                    }}
                  />
                ) : (
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                    onSelect={handleRangeSelect}
                  disabled={disabledDays}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    numberOfMonths={2}
                    className="w-full"
                  showOutsideDays={true}
                    components={{
                      DayButton: (props: DayButtonProps) => {
                        const { day, modifiers, className, ...buttonProps } = props;
                        const date = day.date;
                        const tooltipText = getDateTooltip(date);
                        const disableReason = getDateDisableReason(date);
                        
                        // Use a ref to ensure the class is applied to the button element
                        const buttonRef = React.useRef<HTMLButtonElement>(null);
                        
                        React.useEffect(() => {
                          if (buttonRef.current && disableReason) {
                            buttonRef.current.classList.add(`disable-reason-${disableReason}`);
                          }
                        }, [disableReason]);
                        
                        // Add CSS class based on disable reason
                        const disableClass = disableReason ? `disable-reason-${disableReason}` : '';
                        const combinedClassName = className ? `${className} ${disableClass}` : disableClass;
                        
                        // Create the button with CalendarDayButton
                        const button = (
                          <CalendarDayButton
                            day={day}
                            modifiers={modifiers}
                            className={combinedClassName}
                            {...(buttonProps as any)}
                            ref={buttonRef}
                          />
                        );

                        if (tooltipText && disableReason) {
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {button}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{tooltipText}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return button;
                      },
                    }}
                  />
                )}
              </TooltipProvider>
            
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
