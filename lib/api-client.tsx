/**
 * API Client for Express Backend
 * Replaces Base44 SDK with REST API calls
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Type definitions
export interface ItemAvailabilityData {
  id?: string;
  item_id: string;
  blocked_start_date: string;
  blocked_end_date: string;
  reason: string;
  created_at?: string;
}

export interface FavoriteData {
  id?: string;
  user_email: string;
  item_id: string;
  created_at?: string;
}

export interface UserData {
  id?: string;
  clerk_id?: string; // Clerk user ID (used as owner_id in items)
  email: string;
  username?: string;
  verification_status?: 'verified' | 'pending' | 'failed' | 'unverified';
  [key: string]: any;
}

export interface VerificationSessionResponse {
    url: string;
    session_id?: string;
}

export interface FileUploadResponse {
  file_url: string;
  file_id?: string;
  file_name?: string;
}

class ApiClient {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Only make requests on client side
      if (typeof window === 'undefined') {
        return {
          success: false,
          error: 'API requests can only be made from the client side',
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        method: options.method || 'GET',
        headers,
        credentials: 'include', // For HTTP-only cookies (required for Clerk)
      })

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        return {
          success: false,
          error: errorMessage,
        }
      }

      const data = await response.json()

      // Handle both response formats: { success: true, data: [...] } or just [...]
      if (data.success !== undefined) {
        return {
          success: data.success,
          data: data.data,
          error: data.error,
        }
      }

      return {
        success: true,
        data: data.data || data,
      }
    } catch (error) {
      console.error('API request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error - Could not connect to server',
      }
    }
  }

  // File upload helper (for FormData)
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE}/file/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'File upload failed' }))
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data || result
    } catch (error) {
      throw error instanceof Error ? error : new Error('File upload failed')
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(data: { email: string; password: string; full_name: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  // Items endpoints
  async getItems(params?: {
    search?: string
    category?: string
    min_price?: number
    max_price?: number
    location?: string
    owner_id?: string
    availability?: boolean
    page?: number
    limit?: number
    sort_by?: string
  }) {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value))
        }
      })
    }
    return this.request(`/items?${query.toString()}`)
  }

  async getItem(id: string) {
    // Check if we should use mock data (frontend-only mode)
    if (typeof window !== 'undefined') {
      try {
        const { getMockItem, shouldUseMockData } = await import('./mock-data');
        if (shouldUseMockData()) {
          const mockData = getMockItem(id);
          if (mockData) {
            // Simulate API delay for realistic behavior
            await new Promise(resolve => setTimeout(resolve, 300));
            return {
              success: true,
              data: {
                item: mockData.item,
                owner: mockData.owner,
              },
            };
          }
        }
      } catch (error) {
        // If mock-data import fails, fall through to API call
        console.log('Mock data not available, trying API...', error);
      }
    }
    
    return this.request(`/items/${id}`)
  }

  async createItem(data: any) {
    return this.request('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateItem(id: string, data: any) {
    return this.request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteItem(id: string) {
    return this.request(`/items/${id}`, {
      method: 'DELETE',
    })
  }

  // Item Availability
  async getItemAvailability(itemId: string): Promise<ApiResponse<ItemAvailabilityData[]>> {
    return this.request<ItemAvailabilityData[]>(`/item-availability?item_id=${itemId}`)
  }

  async createItemAvailability(
    data: Omit<ItemAvailabilityData, 'id' | 'created_at'>
  ): Promise<ApiResponse<ItemAvailabilityData>> {
    return this.request<ItemAvailabilityData>('/item-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteItemAvailability(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/item-availability/${id}`, {
      method: 'DELETE',
    })
  }

  // Favorites
  async createFavorite(data: FavoriteData): Promise<ApiResponse<FavoriteData>> {
    return this.request<FavoriteData>('/favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteFavorite(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/favorites/${id}`, {
      method: 'DELETE',
    })
  }

  async deleteFavoriteByItem(data: { item_id: string; user_email: string }): Promise<ApiResponse<void>> {
    return this.request<void>('/favorites', {
      method: 'DELETE',
      body: JSON.stringify(data),
    })
  }

  async getFavorites(userEmail: string): Promise<ApiResponse<FavoriteData[]>> {
    return this.request<FavoriteData[]>(`/favorites?user_email=${userEmail}`)
  }

  // Viewed Items
  async getViewedItems(userEmail: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/viewed-items?user_email=${userEmail}`)
  }

  async createViewedItem(data: { user_email: string; item_id: string; viewed_date?: string; view_count?: number }): Promise<ApiResponse<any>> {
    return this.request<any>('/viewed-items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Rental requests
  async getRentalRequests() {
    return this.request('/rental-requests')
  }

  async createRentalRequest(data: any) {
    return this.request('/rental-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRentalRequest(id: string, data: any) {
    return this.request(`/rental-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Messages
  async getMessages(rentalRequestId?: string) {
    const query = rentalRequestId ? `?rental_request_id=${rentalRequestId}` : ''
    return this.request(`/messages${query}`)
  }

  async sendMessage(data: {
    rental_request_id: string
    content: string
    attachments?: string[]
  }) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // User
  async getCurrentUser(): Promise<ApiResponse<UserData>> {
    return this.request<UserData>('/users/me')
  }

  async updateUser(data: any) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Verification
  async createVerificationSession(): Promise<ApiResponse<VerificationSessionResponse>> {
    return this.request<VerificationSessionResponse>('/verification/session', {
      method: 'POST',
    })
  }

  // Reviews
  async getReviews(itemId?: string, userId?: string) {
    const query = new URLSearchParams()
    if (itemId) query.append('item_id', itemId)
    if (userId) query.append('user_id', userId)
    return this.request(`/reviews?${query.toString()}`)
  }

  async createReview(data: any) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // AI Chat
  async askItemQuestion(data: { item_id: string; question: string }) {
    return this.request<{
      answer: string;
      confidence: 'high' | 'medium' | 'low';
      suggest_contact_owner: boolean;
    }>('/ai/ask-item-question', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Email Service
  async sendEmail(data: {
    to: string;
    subject: string;
    body: string;
    from_name?: string;
    from_email?: string;
    reply_to?: string;
  }) {
    return this.request<{ message_id?: string; sent: boolean }>('/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications')
  }

  async updateNotification(id: string, data: any) {
    return this.request(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Saved Searches
  async getSavedSearches() {
    return this.request('/saved-searches')
  }

  async createSavedSearch(data: {
    name: string
    filters: {
      category?: string
      location?: string
      min_price?: number
      max_price?: number
      search_query?: string
    }
    notify_new_items?: boolean
  }) {
    return this.request('/saved-searches', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSavedSearch(id: string, data: any) {
    return this.request(`/saved-searches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteSavedSearch(id: string) {
    return this.request(`/saved-searches/${id}`, {
      method: 'DELETE',
    })
  }
}

export const api = new ApiClient()

// Helper functions for backward compatibility
export async function getItemAvailability(itemId: string): Promise<ItemAvailabilityData[]> {
  try {
  const response = await api.getItemAvailability(itemId)
  if (!response.success || !response.data) {
      // Return empty array instead of throwing error for graceful handling
      console.warn('Failed to fetch item availability:', response.error)
      return []
  }
  return response.data
  } catch (error) {
    console.error('Error fetching item availability:', error)
    // Return empty array instead of throwing error
    return []
  }
}

export async function createItemAvailability(
  data: Omit<ItemAvailabilityData, 'id' | 'created_at'>
): Promise<ItemAvailabilityData> {
  const response = await api.createItemAvailability(data)
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create item availability')
  }
  return response.data
}

export async function deleteItemAvailability(id: string): Promise<void> {
  const response = await api.deleteItemAvailability(id)
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete item availability')
  }
}

export async function createFavorite(data: FavoriteData): Promise<FavoriteData> {
  const response = await api.createFavorite(data)
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create favorite')
  }
  return response.data
}

export async function deleteFavorite(id: string): Promise<void> {
  const response = await api.deleteFavorite(id)
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete favorite')
  }
}

export async function deleteFavoriteByItem(data: { item_id: string; user_email: string }): Promise<void> {
  const response = await api.deleteFavoriteByItem(data)
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete favorite')
  }
}

export async function getFavorites(userEmail: string): Promise<FavoriteData[]> {
  try {
  const response = await api.getFavorites(userEmail)
  if (!response.success || !response.data) {
      // Return empty array instead of throwing error for graceful handling
      console.warn('Failed to fetch favorites:', response.error)
      return []
  }
  return response.data
  } catch (error) {
    console.error('Error fetching favorites:', error)
    // Return empty array instead of throwing error
    return []
  }
}

// Recommendations helper
export interface GetRecommendationsParams {
  user_email: string
}

export interface RecommendationResponse {
  data: {
    items: any[]
  }
}

export async function getRecommendations(
  params: GetRecommendationsParams
): Promise<RecommendationResponse> {
  try {
    // For now, return featured/available items as recommendations
    // This can be enhanced later with AI-based recommendations
    const response = await api.getItems({
      availability: true,
      limit: 12, // Get 12 recommended items
    })

    if (response.success && response.data) {
      const items = Array.isArray(response.data) ? response.data : []
      return {
        data: {
          items: items,
        },
      }
    }

    // Return empty array if API call fails
    return {
      data: {
        items: [],
      },
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return {
      data: {
        items: [],
      },
    }
  }
}

export async function getCurrentUser(): Promise<UserData | null> {
  try {
    const response = await api.getCurrentUser()
    if (!response.success) {
      // Handle 401 gracefully - user is not signed in (this is expected for unauthenticated users)
      if (response.error?.includes('401') || response.error?.includes('Authentication required')) {
        // Silently return null for unauthenticated users (this is expected behavior)
        return null
      }
      // Log other errors
      console.error('Failed to get current user:', response.error)
      return null
    }
    return response.data || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export function redirectToSignIn(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/signin'
  }
}

export async function createVerificationSession(): Promise<VerificationSessionResponse> {
  const response = await api.createVerificationSession()
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create verification session')
  }
  return response.data
}

export async function uploadFile(file: File): Promise<FileUploadResponse> {
  return api.uploadFile(file)
}

// AI Chat helper
export interface AskItemQuestionResponse {
  success: boolean;
  data?: {
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    suggest_contact_owner: boolean;
  };
  error?: string;
}

export async function askItemQuestion(params: { item_id: string; question: string }): Promise<AskItemQuestionResponse> {
  const response = await api.askItemQuestion(params)
  return {
    success: response.success,
    data: response.data,
    error: response.error,
  }
}

// Email helper
export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const response = await api.sendEmail(params)
  if (!response.success) {
    throw new Error(response.error || 'Failed to send email')
  }
}

// Viewed Items helper
export interface ViewedItemData {
  id?: string;
  user_email: string;
  item_id: string;
  viewed_date?: string;
  view_count?: number;
}

export async function getViewedItems(userEmail: string): Promise<ViewedItemData[]> {
  try {
    const response = await api.getViewedItems(userEmail)
    if (!response.success || !response.data) {
      return []
    }
    return response.data
  } catch (error) {
    console.error('Error fetching viewed items:', error)
    return []
  }
}
