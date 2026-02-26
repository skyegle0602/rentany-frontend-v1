/**
 * API Client for Express Backend
 * Replaces Base44 SDK with REST API calls
 */

// Get API base URL from environment variable
// In Next.js, NEXT_PUBLIC_* variables are embedded at build time
let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Validate and clean the API_BASE URL
// Remove any accidental variable name prefixes (e.g., "NEXT_PUBLIC_API_URL=")
if (API_BASE.includes('NEXT_PUBLIC_API_URL=')) {
  console.error('❌ Invalid API_BASE detected - environment variable may be set incorrectly')
  console.error('   Current value:', API_BASE)
  console.error('   This usually means NEXT_PUBLIC_API_URL was set with the variable name included')
  // Try to extract the actual URL
  const match = API_BASE.match(/NEXT_PUBLIC_API_URL=(.+)/)
  if (match && match[1]) {
    API_BASE = match[1].trim()
    console.warn('   Extracted URL:', API_BASE)
  } else {
    // Fallback to default
    API_BASE = 'http://localhost:5000/api'
    console.warn('   Using fallback:', API_BASE)
  }
}

// Ensure API_BASE doesn't have trailing slash
API_BASE = API_BASE.replace(/\/+$/, '')

// Log API base URL to help debug (always log in browser console)
if (typeof window !== 'undefined') {
  console.log('🔧 API Base URL:', API_BASE)
  if (!process.env.NEXT_PUBLIC_API_URL || API_BASE === 'http://localhost:5000/api') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.error('⚠️  NEXT_PUBLIC_API_URL not set correctly in production!')
      console.error('   Current hostname:', window.location.hostname)
      console.error('   Using fallback URL:', API_BASE)
      console.error('   Please set NEXT_PUBLIC_API_URL in Vercel environment variables')
    }
  }
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ItemsStatsResponse {
  total_available: number
  by_category: Array<{
    category: string
    count: number
  }>
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
  intent?: 'renter' | 'owner' | 'both'; // DEPRECATED: Capability is now determined by payment setup, not intent. Kept for backward compatibility.
  
  // Stripe connection fields (source of truth for capabilities)
  stripe_customer_id?: string;
  stripe_payment_method_id?: string; // Required for renting
  stripe_account_id?: string; // Required for lending/receiving payouts
  payouts_enabled?: boolean; // Required for lending/receiving payouts
  
  // Computed capabilities (not stored in DB, computed dynamically)
  can_rent?: boolean; // Derived: !!stripe_payment_method_id
  can_list?: boolean; // Derived: always true (everyone can list)
  can_lend?: boolean; // Derived: !!(stripe_account_id && payouts_enabled)
  
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

export interface NotificationResponse {
  user_email: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  link?: string;
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

      // Get Clerk JWT token for cross-domain authentication
      // This is needed when frontend and backend are on different domains
      let authToken: string | null = null
      try {
        // Try to get token from Clerk instance (available in browser)
        // Clerk Next.js exposes the Clerk instance on window in development
        if (typeof window !== 'undefined') {
          // IMPORTANT:
          // `window.__clerk_frontend_api` is usually a string (frontend API key), not the Clerk instance.
          // Prefer the actual Clerk instance object on `window.Clerk`.
          const w = window as any
          const clerkInstance =
            (w.Clerk && typeof w.Clerk === 'object' ? w.Clerk : null) ||
            (w.__clerk && typeof w.__clerk === 'object' ? w.__clerk : null) ||
            null

          if (clerkInstance?.session?.getToken) {
            authToken = await clerkInstance.session.getToken()
          }
        }
      } catch (error) {
        // If getting token fails (user not signed in or Clerk not initialized), continue without token
        // The backend will return 401 if authentication is required
        // Cookies will still be sent via credentials: 'include' for same-domain requests
        if (process.env.NODE_ENV === 'development') {
          console.log('No Clerk token available (user may not be signed in)')
        }
      }

      // Only set Content-Type to JSON if not already specified and not requesting PDF
      const isPdfRequest = options.headers && 
        (options.headers as any)['Accept']?.includes('application/pdf')
      
      const headers: Record<string, string> = {
        ...(!isPdfRequest && !(options.headers as any)?.['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers as Record<string, string> || {}),
      }

      // Add Authorization header with Clerk JWT token if available
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const url = `${API_BASE}${endpoint}`
      
      // Log the request URL in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`)
      }
      
      const response = await fetch(url, {
        ...options,
        method: options.method || 'GET',
        headers,
        credentials: 'include', // Still include credentials for same-domain requests
      })

      // Check if response is ok before trying to parse
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

      // Handle PDF/binary responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/pdf')) {
        const blob = await response.blob()
        return {
          success: true,
          data: blob as T,
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
      const errorMessage = error instanceof Error ? error.message : String(error) || 'Unknown error'
      const isNetworkError = errorMessage.includes('Failed to fetch') || 
                            errorMessage.includes('NetworkError') ||
                            errorMessage.includes('Network request failed') ||
                            errorMessage.includes('ERR_NETWORK') ||
                            errorMessage.includes('ERR_INTERNET_DISCONNECTED')
      
      // Check if this is a suppressible endpoint (expected to fail if user not logged in)
      const shouldSuppressError = endpoint.includes('/notifications') || 
                                   endpoint.includes('/users/me') ||
                                   endpoint === '/users/me'
      
      // Provide more helpful error messages
      let userFriendlyError = 'Network error - Could not connect to server'
      if (isNetworkError) {
        userFriendlyError = `Cannot connect to backend server. Please check:
1. Backend server is running (${API_BASE})
2. CORS is configured correctly
3. Network connectivity is available`
        
        if (process.env.NODE_ENV === 'development' && !shouldSuppressError) {
          console.error('❌ Network error details:', {
            error: errorMessage,
            errorType: error?.constructor?.name || typeof error,
            url: `${API_BASE}${endpoint}`,
            apiBase: API_BASE,
            endpoint: endpoint,
            stack: error instanceof Error ? error.stack : undefined,
          })
        }
      } else {
        // Log non-network errors (unless suppressed)
        if (process.env.NODE_ENV === 'development' && !shouldSuppressError) {
          console.error('❌ API request error:', {
            error: errorMessage,
            errorType: error?.constructor?.name || typeof error,
            url: `${API_BASE}${endpoint}`,
            endpoint: endpoint,
            stack: error instanceof Error ? error.stack : undefined,
          })
        }
      }
      
      // For suppressible endpoints, return a more graceful error response
      if (shouldSuppressError) {
        return {
          success: false,
          error: 'Not authenticated', // Generic error for suppressed endpoints
        }
      }
      
      return {
        success: false,
        error: userFriendlyError,
      }
    }
  }

  // File upload helper (for FormData)
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    // Get Clerk JWT token for cross-domain authentication
    // This is needed when frontend and backend are on different domains
    let authToken: string | null = null
    try {
      // Try to get token from Clerk instance (available in browser)
      if (typeof window !== 'undefined') {
        const w = window as any
        const clerkInstance =
          (w.Clerk && typeof w.Clerk === 'object' ? w.Clerk : null) ||
          (w.__clerk && typeof w.__clerk === 'object' ? w.__clerk : null) ||
          null

        if (clerkInstance?.session?.getToken) {
          authToken = await clerkInstance.session.getToken()
        }
      }
    } catch (error) {
      // If getting token fails, continue without token
      // The backend will return 401 if authentication is required
      if (process.env.NODE_ENV === 'development') {
        console.log('No Clerk token available for file upload (user may not be signed in)')
      }
    }

    const headers: Record<string, string> = {}
    
    // Add Authorization header with Clerk JWT token if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    try {
      const response = await fetch(`${API_BASE}/file/upload`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'File upload failed' }))
        // Backend returns { success: false, error: "..." }
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
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
    offset?: number
    skip?: number
    sort_by?: string
    exclude_id?: string
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

  async getItemsStats(): Promise<ApiResponse<ItemsStatsResponse>> {
    return this.request<ItemsStatsResponse>('/items/stats')
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

  async createListingReport(
    data: {
      item_id: string;
      reporter_email: string;
      reason: string;
      description: string;
      evidence_urls?: string[];
      status?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/listing', {
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

  // User Reports
  async createUserReport(data: {
    reporter_email: string
    reported_email: string
    reason: 'harassment' | 'spam' | 'fraud' | 'inappropriate_content' | 'other'
    description: string
    evidence_urls?: string[]
    status?: 'pending' | 'under_review' | 'resolved' | 'dismissed'
  }) {
    return this.request('/reports/user', {
      method: 'POST',
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

  // Email Service (optional - endpoint may not exist)
  async sendEmail(data: {
    to: string;
    subject: string;
    body: string;
    from_name?: string;
    from_email?: string;
    reply_to?: string;
  }) {
    try {
      return await this.request<{ message_id?: string; sent: boolean }>('/email/send', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (error: any) {
      // If endpoint doesn't exist (404), return a success response to not break the flow
      if (error?.status === 404 || error?.message?.includes('404')) {
        console.warn('Email endpoint not available, skipping email send')
        return {
          success: false,
          error: 'Email endpoint not available',
          data: null,
        }
      }
      throw error
    }
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

  // Receipts
  /**
   * Download a PDF receipt for a rental request
   * @param rentalRequestId - The ID of the rental request
   * @returns Promise with Blob data for the PDF receipt
   */
  async downloadReceipt(rentalRequestId: string): Promise<ApiResponse<Blob>> {
    return this.request<Blob>(`/receipts?rental_request_id=${encodeURIComponent(rentalRequestId)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    })
  }

  async sendNotification(data: NotificationResponse): Promise<ApiResponse<any>>{
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });

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
      // Handle "Not authenticated" - expected when user is not logged in, don't log as error
      if (response.error?.includes('Not authenticated') || response.error?.includes('Unauthorized')) {
        return null // Silently return null for unauthenticated users
      }

      // Handle "User not found" - might be a transient sync issue, try to sync manually
      // Note: Only try sync if we got a 404, not for other errors
      if (response.error?.includes('User not found') && !response.error?.includes('401')) {
        // Try to force sync the user from Clerk (only once to avoid loops)
        try {
          const syncResponse = await api.request<UserData>('/users/sync', { method: 'POST' })
          if (syncResponse.success && syncResponse.data) {
            return syncResponse.data as UserData
          }
        } catch (syncError: any) {
          // If sync fails, log but don't throw - user might not exist in Clerk yet
          console.warn('User not found and sync failed:', syncError?.error || syncError?.message || 'Unknown error')
          // Don't return null here - let it fall through to return null below
        }
        return null
      }
      // Log other unexpected errors (but not authentication errors)
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

// uploadFile - use api.uploadFile() directly (no wrapper needed)

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
  try {
    const response = await api.sendEmail(params)
    if (!response.success) {
      // Don't throw error - email sending is optional
      console.warn('Email sending failed:', response.error)
    }
  } catch (error) {
    // Don't throw error - email sending is optional
    console.warn('Email sending failed (endpoint may not be available):', error)
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
      // Silently return empty array if no data (not an error condition)
      return []
    }
    return response.data
  } catch (error) {
    // Only log if it's not a network error (network errors are expected if backend is down)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isNetworkError = errorMessage.includes('Failed to fetch') || 
                          errorMessage.includes('NetworkError') ||
                          errorMessage.includes('Network request failed') ||
                          errorMessage.includes('Cannot connect to backend server')
    
    if (!isNetworkError) {
      console.error('Error fetching viewed items:', error)
    }
    // Return empty array for all errors (network or otherwise) to prevent UI breakage
    return []
  }
}

// createViewedItem - use api.createViewedItem() directly (no wrapper needed)

// Listing Reports
export interface ListingReportData {
  id: string;
  item_id: string;
  reporter_email: string;
  reason: string;
  description: string;
  evidence_urls?: string[];
  status: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  created_date: string;
  created_at: string;
  updated_at?: string;
}

export async function createListingReport(
  data: {
    item_id: string;
    reporter_email: string;
    reason: string;
    description: string;
    evidence_urls?: string[];
    status?: string;
  }
): Promise<ListingReportData> {
  const response = await api.createListingReport(data)
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create listing report')
  }
  return response.data
}

export async function sendNotification(data: NotificationResponse): Promise<any> {
  const response = await api.sendNotification(data)
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to send notification')
  }
  return response.data
}