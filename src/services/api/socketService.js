/**
 * Real-time Socket.IO Client for Aviator Engine
 * Connected directly to: https://fctechteamnode.shop/
 * Listening on channel: demobdg_aviator
 * 
 * Packet structure:
 * {
 *   betTime: number,    // Countdown seconds (e.g. 10 to 1 in status 0, 1 in status 1 & 2)
 *   status: 0 | 1 | 2,  // 0: Countdown/Betting, 1: Flying/Multiplier, 2: Crashed/Flew Away
 *   period: number,     // Current Round ID / Serial number (e.g. 1085286)
 *   timer: string       // Live Multiplier in status 1 (e.g. "1.25"), Crash Point in status 2 (e.g. "3.46")
 * }
 */

import { io } from 'socket.io-client'
import { API_CONFIG, isWebSocketConfigured } from './config'

class WebSocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
    this.isConnected = false
    this.lastPacket = null
    this.channel = API_CONFIG.SOCKET_CHANNEL || 'demobdg_aviator'
  }

  /**
   * Connect to Socket.IO server
   */
  connect(url = API_CONFIG.WS_URL, channel = API_CONFIG.SOCKET_CHANNEL) {
    if (!isWebSocketConfigured() && !url) {
      return
    }

    if (this.socket && this.socket.connected) {
      return
    }

    this.channel = channel || 'demobdg_aviator'
    const targetUrl = url || 'https://fctechteamnode.shop/'

    try {
      this.socket = io(targetUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        console.log(`[SocketService] Connected to ${targetUrl} (ID: ${this.socket.id})`)
        this.emitLocal('connection_status', { connected: true, socketId: this.socket.id })
      })

      this.socket.on('connect_error', (err) => {
        this.isConnected = false
        console.warn('[SocketService] Connection error:', err.message)
        this.emitLocal('connection_status', { connected: false, error: err.message })
      })

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false
        console.log('[SocketService] Disconnected:', reason)
        this.emitLocal('connection_status', { connected: false, reason })
      })

      // Main listener for the live game channel (demobdg_aviator)
      this.socket.on(this.channel, (raw) => {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          this.lastPacket = data

          // Emit raw event
          this.emitLocal(this.channel, data)

          // Emit normalized events based on server status:
          // status 0: Countdown / Betting phase
          // status 1: Flight / Live multiplier phase
          // status 2: Crash / Flew away phase
          if (data.status === 0) {
            this.emitLocal(API_CONFIG.WS_EVENTS.ROUND_COUNTDOWN, {
              countdown: data.betTime,
              roundId: data.period,
              status: 0,
              raw: data,
            })
          } else if (data.status === 1) {
            this.emitLocal(API_CONFIG.WS_EVENTS.MULTIPLIER_TICK, {
              multiplier: parseFloat(data.timer) || 1.0,
              roundId: data.period,
              status: 1,
              raw: data,
            })
          } else if (data.status === 2) {
            this.emitLocal(API_CONFIG.WS_EVENTS.ROUND_CRASHED, {
              crashPoint: parseFloat(data.timer) || 1.0,
              roundId: data.period,
              status: 2,
              raw: data,
            })
          }
        } catch (err) {
          console.warn('[SocketService] Failed to parse packet:', raw, err)
        }
      })
    } catch (err) {
      console.warn('[SocketService] Initialization error:', err)
    }
  }

  /**
   * Disconnect cleanly
   */
  disconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect()
      } catch {}
      this.socket = null
    }
    this.isConnected = false
    this.emitLocal('connection_status', { connected: false })
  }

  /**
   * Emit event to server
   */
  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data)
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
          console.error(`[SocketService] Error in subscriber for "${event}":`, err)
        }
      })
    }
  }

  getLastPacket() {
    return this.lastPacket
  }
}

export const socketService = new WebSocketService()
