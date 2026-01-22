'use client'

import React, { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import Link from 'next/link'

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface Item {
  id: string
  title: string
  description?: string
  category: string
  location?: string
  daily_rate: number
  availability: boolean
  images?: string[]
  lat?: number
  lng?: number
  show_on_map?: boolean
}

interface MapViewProps {
  searchQuery?: string
  locationQuery?: string
  selectedCategory?: string
  priceRange?: { min: string; max: string }
  availabilityFilter?: string
}

// Component to handle map bounds updates - must be inside MapContainer
// Defined outside to ensure it's stable and hooks are always called in the same order
// This component is only rendered inside MapContainer (which has ssr: false), so it's always client-side
function MapBoundsUpdaterInner({ items }: { items: Item[] }) {
  // Always call useMap unconditionally - it's available inside MapContainer context
  // Since MapContainer is dynamically imported with ssr: false, react-leaflet is always available
  const reactLeaflet = require('react-leaflet')
  const map = reactLeaflet.useMap()
  
  useEffect(() => {
    if (map && items.length > 0) {
      const L = require('leaflet')
      const validItems = items.filter(item => item.lat && item.lng)
      if (validItems.length > 0) {
        const bounds = L.latLngBounds(
          validItems.map(item => [item.lat!, item.lng!] as [number, number])
        )
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [items, map])
  
  return null
}

// Wrapper that always renders the inner component
function MapBoundsUpdater({ items }: { items: Item[] }) {
  return <MapBoundsUpdaterInner items={items} />
}

export default function MapView({
  searchQuery = '',
  locationQuery = '',
  selectedCategory = 'all',
  priceRange = { min: '', max: '' },
  availabilityFilter = 'all',
}: MapViewProps) {
  // Always call all hooks unconditionally at the top level
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [center, setCenter] = useState<[number, number]>([48.8566, 2.3522]) // Default to Paris
  const [isClient, setIsClient] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Always call useEffect hooks unconditionally
  useEffect(() => {
    setIsClient(true)
    // Load Leaflet CSS and fix icons on client side
    if (typeof window !== 'undefined') {
      // Dynamically import CSS - TypeScript will handle this with our type declarations
      import('leaflet/dist/leaflet.css').catch(() => {
        // If import fails, try loading via link tag as fallback
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
          link.crossOrigin = ''
          document.head.appendChild(link)
        }
      }).then(() => {
        const L = require('leaflet')
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
        setLeafletLoaded(true)
      })
    }
  }, [])

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true)
      try {
        const response = await api.getItems({
          availability: availabilityFilter === 'available' ? true : availabilityFilter === 'unavailable' ? false : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          min_price: priceRange.min ? parseFloat(priceRange.min) : undefined,
          max_price: priceRange.max ? parseFloat(priceRange.max) : undefined,
          limit: 100, // Get more items for map view
        })

        if (response.success && response.data) {
          const itemsData = Array.isArray(response.data) ? response.data : []
          
          // Filter items that have coordinates and show_on_map is true
          const itemsWithCoords: Item[] = itemsData
            .map((item: any) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              category: item.category,
              location: item.location,
              daily_rate: item.daily_rate,
              availability: item.availability,
              images: item.images || [],
              lat: item.lat,
              lng: item.lng,
              show_on_map: item.show_on_map,
            }))
            .filter((item: Item) => 
              item.lat && 
              item.lng && 
              item.show_on_map !== false &&
              (!searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
              (!locationQuery || item.location?.toLowerCase().includes(locationQuery.toLowerCase()))
            )

          setItems(itemsWithCoords)

          // Update center if we have items
          if (itemsWithCoords.length > 0) {
            const avgLat = itemsWithCoords.reduce((sum, item) => sum + (item.lat || 0), 0) / itemsWithCoords.length
            const avgLng = itemsWithCoords.reduce((sum, item) => sum + (item.lng || 0), 0) / itemsWithCoords.length
            setCenter([avgLat, avgLng])
          }
        }
      } catch (error) {
        console.error('Error loading items for map:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isClient) {
      loadItems()
    }
  }, [isClient, searchQuery, locationQuery, selectedCategory, priceRange, availabilityFilter])

  // Always call useMemo unconditionally
  const validItems = useMemo(() => 
    items.filter(item => item.lat && item.lng),
    [items]
  )

  // Early returns after all hooks have been called
  if (!isClient || !leafletLoaded) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading map...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading map...</p>
        </div>
      </div>
    )
  }

  if (validItems.length === 0) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No items with location data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater items={validItems} />
        {validItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat!, item.lng!]}
          >
            <Popup>
              <Card className="w-64 border-0 shadow-lg">
                <CardContent className="p-0">
                  {item.images && item.images.length > 0 && (
                    <div className="w-full h-32 overflow-hidden rounded-t-lg">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <Link
                      href={`/itemdetails/${item.id}`}
                      className="block hover:underline"
                    >
                      <h3 className="font-semibold text-sm text-slate-900 mb-1 line-clamp-1">
                        {item.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600">
                        ${item.daily_rate}/day
                      </span>
                      <span className="text-xs text-slate-500 capitalize">
                        {item.category}
                      </span>
                    </div>
                    {item.location && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
