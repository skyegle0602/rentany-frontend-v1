'use client'

import React, { useState, useEffect } from 'react'
import { api, getCurrentUser, type UserData } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Shield, Loader2, Search, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const CATEGORIES = [
  { name: 'Electronics', value: 'electronics' },
  { name: 'Tools', value: 'tools' },
  { name: 'Fashion', value: 'fashion' },
  { name: 'Sports', value: 'sports' },
  { name: 'Vehicles', value: 'vehicles' },
  { name: 'Home', value: 'home' },
  { name: 'Books', value: 'books' },
  { name: 'Music', value: 'music' },
  { name: 'Photography', value: 'photography' },
  { name: 'Other', value: 'other' },
]

interface SecuritySettings {
  kyc_amount_threshold: number
  kyc_high_risk_categories: string[]
}

interface ListItem {
  id: string
  title: string
  category: string
  daily_rate?: number
  high_risk_override?: boolean
}

export default function AdminSecurityPage() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [items, setItems] = useState<ListItem[]>([])
  const [searchingItems, setSearchingItems] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadInitial()
  }, [])

  const loadInitial = async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/'
        return
      }
      setCurrentUser(user)
      if ((user as any).role !== 'admin') {
        window.location.href = '/'
        return
      }
      const res = await api.getSecuritySettings()
      if (res.success && res.data) {
        setSettings(res.data)
        setThresholdInput(String(res.data.kyc_amount_threshold))
        setSelectedCategories(res.data.kyc_high_risk_categories ?? [])
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load security settings.' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    const threshold = parseInt(thresholdInput, 10)
    if (isNaN(threshold) || threshold < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid threshold (number ≥ 0).' })
      return
    }
    setSavingSettings(true)
    setMessage(null)
    try {
      const res = await api.updateSecuritySettings({
        kyc_amount_threshold: threshold,
        kyc_high_risk_categories: selectedCategories,
      })
      if (res.success && res.data) {
        setSettings(res.data)
        setMessage({ type: 'success', text: 'Security settings saved.' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save security settings.' })
    } finally {
      setSavingSettings(false)
    }
  }

  const searchItems = async () => {
    setSearchingItems(true)
    setMessage(null)
    try {
      const res = await api.getSecurityItems({
        search: itemSearch.trim() || undefined,
        limit: 50,
        offset: 0,
      })
      const list = res.success && res.data ? res.data : []
      setItems(list as ListItem[])
      if (list.length === 0) {
        setMessage({ type: 'success', text: 'No items found. Try a different search.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load items.' })
      setItems([])
    } finally {
      setSearchingItems(false)
    }
  }

  const toggleHighRisk = async (item: ListItem) => {
    const next = !item.high_risk_override
    setTogglingId(item.id)
    try {
      const res = await api.updateSecurityItemOverride(item.id, next)
      if (res.success && res.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, high_risk_override: next } : i))
        )
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update item.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to update item.' })
    } finally {
      setTogglingId(null)
    }
  }

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    )
  }

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600" />
              Security &amp; risk settings
            </h1>
            <Badge variant="outline" className="w-fit text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2">
              Admin
            </Badge>
          </div>
          <p className="text-slate-600">Configure KYC and high-risk rules for the platform</p>
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mb-4 flex items-center gap-2 rounded-lg border p-3 ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {message.type === 'error' && <AlertTriangle className="h-5 w-5 shrink-0" />}
            {message.text}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <Tabs defaultValue="kyc" className="w-full">
              <div className="px-3 pt-3 sm:px-6 sm:pt-6">
                <TabsList className="w-full no-scrollbar justify-between sm:gap-2 overflow-x-auto whitespace-nowrap rounded-xl p-1">
                  <TabsTrigger
                    value="kyc"
                    className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-[11px] sm:text-sm px-3 py-2"
                  >
                    <Shield className="hidden sm:w-4 sm:h-4" />
                    KYC &amp; rules
                  </TabsTrigger>
                  <TabsTrigger
                    value="overrides"
                    className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-[11px] sm:text-sm px-3 py-2"
                  >
                    <Package className="hidden sm:w-4 sm:h-4" />
                    Item overrides ({items.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="kyc" className="p-4 sm:p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">KYC &amp; high-risk rules</h2>
                    <p className="text-sm text-slate-600">
                      Configure when identity verification (KYC) is required and which categories are treated as high-risk.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold" className="text-slate-700">KYC amount threshold (currency units)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min={0}
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(e.target.value)}
                      placeholder="e.g. 500"
                      className="max-w-xs"
                    />
                    <p className="text-xs text-slate-500">
                      Rentals above this value may require identity verification.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">High-risk categories (require KYC)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {CATEGORIES.map((cat) => (
                        <label
                          key={cat.value}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedCategories.includes(cat.value)}
                            onCheckedChange={() => toggleCategory(cat.value)}
                          />
                          <span className="text-sm text-slate-700">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={saveSettings} disabled={savingSettings} className="mt-2">
                    {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {savingSettings ? 'Saving...' : 'Save settings'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="overrides" className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">High-risk item overrides</h2>
                    <p className="text-sm text-slate-600">
                      Search for items and mark or unmark them as high-risk. This overrides the category-based rule.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Search by item title..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchItems()}
                      className="flex-1 min-w-0"
                    />
                    <Button
                      onClick={searchItems}
                      disabled={searchingItems}
                      className="sm:shrink-0 w-full sm:w-auto"
                    >
                      {searchingItems ? (
                        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                      ) : (
                        <Search className="h-4 w-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Search</span>
                    </Button>
                  </div>
                  {items.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[400px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="p-3 text-left font-medium text-slate-700">Item</th>
                              <th className="p-3 text-left font-medium text-slate-700">Category</th>
                              <th className="p-3 text-left font-medium text-slate-700">Rate</th>
                              <th className="p-3 text-left font-medium text-slate-700">High risk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="p-3">
                                  <Link
                                    href={`/itemdetails?id=${item.id}`}
                                    className="text-slate-900 font-medium hover:text-blue-600 hover:underline"
                                  >
                                    {item.title}
                                  </Link>
                                </td>
                                <td className="p-3 capitalize text-slate-600">{item.category}</td>
                                <td className="p-3 text-slate-600">{item.daily_rate != null ? `$${item.daily_rate}` : '—'}</td>
                                <td className="p-3">
                                  <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                      checked={!!item.high_risk_override}
                                      disabled={togglingId === item.id}
                                      onCheckedChange={() => toggleHighRisk(item)}
                                    />
                                    {togglingId === item.id && (
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    )}
                                  </label>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 sm:py-12">
                      <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-slate-700 font-medium">No items to show</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Search by item title to find and manage high-risk overrides.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
