/**
 * User & Wallet Authentication Service
 * Integrates with Veronova Profile API: GET /api/profile?id=1
 */

import { httpClient } from './client'
import { API_CONFIG, getActiveUserId, tokenStorage } from './config'

export const authService = {
  setToken(token) {
    tokenStorage.set(token)
  },

  getToken() {
    return tokenStorage.get()
  },

  clearToken() {
    tokenStorage.remove()
  },

  getCachedBalance() {
    try {
      const v = localStorage.getItem('skyrush_live_wallet')
      if (v) return parseFloat(v)
    } catch {}
    return 145299.12
  },

  /**
   * Fetch current user profile
   * GET /api/profile?id=1
   */
  async getUserProfile(id = getActiveUserId()) {
    try {
      const response = await httpClient.get(API_CONFIG.ENDPOINTS.PROFILE, {
        params: { id },
      })
      if (response && response.data) {
        return response.data
      }
      return response
    } catch (error) {
      console.warn('[authService.getUserProfile] Notice:', error.message)
      return {
        id: id || 1,
        username: 'Admin',
        wallet: this.getCachedBalance(),
        total_wallet: this.getCachedBalance(),
      }
    }
  },

  /**
   * Fetch live wallet balance
   */
  async getBalance(id = getActiveUserId()) {
    try {
      const profile = await this.getUserProfile(id)
      if (profile) {
        const bal = profile.total_wallet !== undefined ? profile.total_wallet : profile.wallet
        const val = typeof bal === 'number' ? bal : (parseFloat(bal) || 0)
        try {
          localStorage.setItem('skyrush_live_wallet', String(val))
        } catch {}
        return val
      }
      return this.getCachedBalance()
    } catch (error) {
      console.warn('[authService.getBalance] Notice:', error.message)
      return this.getCachedBalance()
    }
  },
}
