/**
 * Real-time WebSocket Client for Aviator Engine
 * Handles live synchronization for countdowns, multiplier ticks, crash points,
 * live player bets, and wallet updates.
 */

import { API_CONFIG, isWebSocketConfigured, tokenStorage } from './config'

class WebSocketService {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectTimer = null
    this.pingInterval = null
    this.isConnected = false
    this.isExplicitlyClosed = false
  }

  /**
   * Connect to WebSocket server
   */
  connect(url = API_CONFIG.WS_URL) {
    if (!isWebSocketConfigured() && !url) {
      // WebSocket server not configured - silence & allow local simulation
      return
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.isExplicitlyClosed = false
    const token = tokenStorage.get()
    const targetUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url

    try {
      this.ws = new WebSocket(targetUrl)

      this.ws.onopen = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        console.log('[WebSocket] Connected successfully to', targetUrl)
        this.emitLocal('connection_status', { connected: true })
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          const { type, data } = message
          if (type) {
            this.emitLocal(type, data)
          }
        } catch (err) {
          console.warn('[WebSocket] Received non-JSON packet:', event.data)
        }
      }

      this.ws.onclose = (event) => {
        this.isConnected = false
        this.stopHeartbeat()
        this.emitLocal('connection_status', { connected: false })

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect(url)
        }
      }

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Error encountered:', err)
        this.emitLocal('error', err)
      }
    } catch (err) {
      console.warn('[WebSocket] Connection initialization failed:', err)
      this.scheduleReconnect(url)
    }
  }

  /**
   * Disconnect cleanly
   */
  disconnect() {
    this.isExplicitlyClosed = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch {}
      this.ws = null
    }
    this.isConnected = false
    this.emitLocal('connection_status', { connected: false })
  }

  /**
   * Send JSON message to server
   */
  send(type, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
      return true
    }
    return false
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    return () => this.off(event, callback)
  }

  /**
   * Unregister event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  /**
   * Dispatch local events to subscribers
   */
  emitLocal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data)
        } catch (err) {
          console.error(`[WebSocket] Error in subscriber for event "${event}":`, err)
        }
      })
    }
  }

  /**
   * Keep connection alive via ping
   */
  startHeartbeat() {
    this.stopHeartbeat()
    this.pingInterval = setInterval(() => {
      this.send('ping', { timestamp: Date.now() })
    }, 25000)
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Exponential backoff reconnection
   */
  scheduleReconnect(url) {
    if (this.isExplicitlyClosed) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Maximum reconnect attempts reached.')
      return
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000)
    this.reconnectAttempts++
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)

    this.reconnectTimer = setTimeout(() => {
      this.connect(url)
    }, delay)
  }
}

export const socketService = new WebSocketService()
