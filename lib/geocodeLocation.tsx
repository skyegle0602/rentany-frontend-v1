/**
 * Geocode a location using OpenStreetMap Nominatim API
 * Replaces the Base44 geocodeLocation function
 */

interface GeocodeResult {
    success: boolean
    data?: {
      lat: number
      lng: number
      display_name?: string
    }
    error?: string
  }
  
  export async function geocodeLocation({ location }: { location: string }): Promise<GeocodeResult> {
    if (!location) {
      return {
        success: false,
        error: 'Location is required',
      }
    }
  
    try {
      const encodedLocation = encodeURIComponent(location)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`,
        {
          headers: {
            'User-Agent': 'Rentany/1.0 (contact@rentany.com)', // Required by Nominatim
          },
        }
      )
  
      if (!response.ok) {
        return {
          success: false,
          error: `Geocoding failed: ${response.statusText}`,
        }
      }
  
      const data = await response.json()
  
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Location not found',
          data: {
            lat: null as any,
            lng: null as any,
          },
        }
      }
  
      const result = data[0]
      const coordinates = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name,
      }
  
      return {
        success: true,
        data: coordinates,
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown geocoding error',
      }
    }
  }
  