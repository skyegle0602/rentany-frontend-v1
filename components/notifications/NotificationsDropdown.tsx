'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { api, getCurrentUser } from '@/lib/api-client'
import { format } from 'date-fns'
import Link from 'next/link'
// ScrollArea not found, using div with overflow instead

interface Notification {
  id: string
  user_email: string
  type: string
  title: string
  message: string
  link?: string
  related_id?: string
  is_read: boolean
  read_at?: string
  created_at: string
}

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const response = await api.getNotifications()
      if (response.success && response.data) {
        const allNotifications = Array.isArray(response.data) ? response.data : []
        setNotifications(allNotifications)
        setUnreadCount(allNotifications.filter((n: Notification) => !n.is_read).length)
      } else {
        // If API call fails, just set empty array
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      // Silently handle errors - don't show errors for notifications
      // User might not be logged in or API might be unavailable
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await api.updateNotification(notificationId, { is_read: true })
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read)
      await Promise.all(
        unreadNotifications.map(n => api.updateNotification(n.id, { is_read: true }))
      )
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'listing_report_action':
        return '⚠️'
      case 'rental_request':
        return '📦'
      case 'message':
        return '💬'
      case 'payment':
        return '💰'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'listing_report_action':
        return 'bg-red-50 border-red-200'
      case 'rental_request':
        return 'bg-blue-50 border-blue-200'
      case 'message':
        return 'bg-green-50 border-green-200'
      case 'payment':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-slate-900">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                        </span>
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={() => {
                              markAsRead(notification.id)
                              setIsOpen(false)
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
