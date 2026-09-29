/**
 * Game Service
 * Integrates with Veronova:
 * - Last Five Result: GET /api/aviator_last_five_result
 * - Current Round Manager: GET /Aviator/result_half_new.php
 * - Result Insert: POST /Aviator/result_insert_new.php
 */

import { httpClient } from './client'
import { API_CONFIG } from './config'

export const gameService = {
  /**
   * Fetch recent crash round multipliers for the top history bar
   * GET /api/aviator_last_five_result
   */
  async getRoundHistory() {
    try {
      const response = await httpClient.get(API_CONFIG.ENDPOINTS.LAST_FIVE_RESULT)
      const list = response?.data || (Array.isArray(response) ? response : [])

      if (Array.isArray(list) && list.length > 0) {
        return list.map((item, index) => {
          const val = typeof item === 'object' && item.price !== undefined ? item.price : item
          const mult = parseFloat(val) || 1.0
          return {
            multiplier: Number(mult.toFixed(2)),
            roundId: 1000 - index,
          }
        })
      }
      return []
    } catch (error) {
      if (API_CONFIG.USE_MOCK_FALLBACK) {
        console.warn('[gameService.getRoundHistory] Fallback:', error.message)
        return [
          { multiplier: 1.82, roundId: 994 },
          { multiplier: 3.40, roundId: 995 },
          { multiplier: 1.05, roundId: 996 },
          { multiplier: 12.31, roundId: 997 },
          { multiplier: 2.10, roundId: 998 },
          { multiplier: 1.01, roundId: 999 },
          { multiplier: 4.58, roundId: 1000 },
        ]
      }
      throw error
    }
  },

  /**
   * Fetch live round state, serial number, and admin-defined multipliers
   * GET /Aviator/result_half_new.php
   */
  async getResultHalf() {
    try {
      const response = await httpClient.get(API_CONFIG.ENDPOINTS.RESULT_HALF)
      if (response && response.status === 200) {
        return {
          gameSr: response.game_sr,
          adminMultiply: Number(response.adminmultiply) || 0,
          totalAmount: Number(response.totalamount) || 0,
          totalUsers: Number(response.totalusers) || 0,
          raw: response,
        }
      }
      return null
    } catch (error) {
      console.warn('[gameService.getResultHalf] Notice:', error.message)
      return null
    }
  },

  /**
   * Insert round result at crash time
   * POST /Aviator/result_insert_new.php
   */
  async insertResult({ gameSr, multiplier }) {
    try {
      const response = await httpClient.post(API_CONFIG.ENDPOINTS.RESULT_INSERT, {
        game_sr: gameSr,
        multiplier: Number(multiplier).toFixed(2),
      })
      return response
    } catch (error) {
      // Non-blocking
      return null
    }
  },
}
