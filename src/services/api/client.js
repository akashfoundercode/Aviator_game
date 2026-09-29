/**
 * HTTP Client Wrapper using modern Fetch API
 * Provides unified request handling, timeouts, authorization header injection,
 * and structured response parsing.
 */

import { API_CONFIG, tokenStorage } from './config'

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * Generic API request executor
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    params = null,
    timeout = API_CONFIG.TIMEOUT_MS,
    requiresAuth = true,
  } = options

  // Build full URL
  let url = API_CONFIG.BASE_URL
    ? `${API_CONFIG.BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
    : endpoint

  // Append query parameters if any
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  // Construct request headers
  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  }

  // Attach Authorization header if authenticated
  if (requiresAuth) {
    const token = tokenStorage.get()
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`
    }
  }

  // AbortController for request timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Parse JSON or text response
    let responseData
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && typeof responseData === 'object' && responseData.message) ||
        `Request failed with status ${response.status}`
      throw new ApiError(errorMessage, response.status, responseData)
    }

    return responseData
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408)
    }
    if (err instanceof ApiError) {
      throw err
    }
    throw new ApiError(err.message || 'Network error', 0, err)
  }
}

export const httpClient = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
}
