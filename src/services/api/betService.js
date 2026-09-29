/**
 * Betting Service
 * Integrated with Veronova Aviator APIs:
 * - Place Bet: POST /api/aviator_bet
 * - Cashout: POST /api/aviator_cashout
 * - Bet History: POST /api/aviator_history
 */

import { httpClient } from './client'
import { API_CONFIG, DEFAULT_GAME_ID, getActiveUserId } from './config'

export const betService = {
  /**
   * Place a new bet
   * POST /api/aviator_bet
   * Payload: { uid, number, amount, game_id, game_sr_num }
   */
  async placeBet({
    panelIndex,
    amount,
    autoCashout = '',
    roundId,
    uid = getActiveUserId(),
    gameId = DEFAULT_GAME_ID,
  }) {
    const payload = {
      uid: String(uid),
      number: panelIndex === 0 ? 1 : 2,
      amount: Number(amount),
      game_id: Number(gameId),
      game_sr_num: String(roundId),
    }

    try {
      const response = await httpClient.post(API_CONFIG.ENDPOINTS.BET, payload)
      return {
        success: response.status === 200 || response.success === true,
        message: response.message || 'Bet placed successfully',
        betId: `bet_${roundId}_${panelIndex}_${Date.now()}`,
        amount,
        autoCashout,
        roundId,
        number: payload.number,
      }
    } catch (error) {
      if (API_CONFIG.USE_MOCK_FALLBACK) {
        console.warn('[betService.placeBet] Fallback:', error.message)
        return {
          success: true,
          message: error.message,
          betId: `local_${roundId}_${panelIndex}`,
          amount,
          autoCashout,
          roundId,
        }
      }
      throw error
    }
  },

  /**
   * Cash out an active flying bet
   * POST /api/aviator_cashout
   * Payload: { salt: base64(JSON.stringify({ uid, multiplier, game_sr_num, number })) }
   */
  async cashOut({
    panelIndex,
    amount,
    multiplier,
    roundId,
    uid = getActiveUserId(),
  }) {
    const formattedMult = String(Number(multiplier).toFixed(2))
    const calculatedPayout = +(Number(amount) * Number(multiplier)).toFixed(2)

    // Construct base64 salt payload as required by server
    const saltObj = {
      uid: String(uid),
      multiplier: formattedMult,
      game_sr_num: String(roundId),
      number: panelIndex === 0 ? 1 : 2,
    }

    let salt = ''
    try {
      salt = btoa(JSON.stringify(saltObj))
    } catch {
      salt = ''
    }

    try {
      const response = await httpClient.post(API_CONFIG.ENDPOINTS.CASHOUT, { salt })
      return {
        success: response?.status === 200 || response?.status === '200' || response?.success === true,
        message: response?.message || 'Cashout success',
        payout: response?.win_amount || calculatedPayout,
        cashedAt: Number(multiplier),
        roundId,
      }
    } catch (error) {
      if (API_CONFIG.USE_MOCK_FALLBACK) {
        console.warn('[betService.cashOut] Notice:', error.message)
        return {
          success: true,
          message: error.message,
          payout: calculatedPayout,
          cashedAt: Number(multiplier),
          roundId,
        }
      }
      throw error
    }
  },

  /**
   * Cancel bet (client-side before takeoff)
   */
  async cancelBet({ panelIndex, roundId }) {
    return {
      success: true,
      cancelled: true,
      panelIndex,
      roundId,
    }
  },

  /**
   * Fetch personal bet history from API
   * POST /api/aviator_history
   * Payload: { uid, game_id }
   */
  async getMyBetsHistory({
    uid = getActiveUserId(),
    gameId = DEFAULT_GAME_ID,
  } = {}) {
    try {
      const response = await httpClient.post(API_CONFIG.ENDPOINTS.BET_HISTORY, {
        uid: String(uid),
        game_id: Number(gameId),
      })

      // If array directly returned
      const historyList = Array.isArray(response)
        ? response
        : response?.data || response?.bets || []

      if (Array.isArray(historyList)) {
        return historyList.map((item) => ({
          id: item.id,
          roundId: item.game_sr_num || item.id,
          amount: Number(item.amount || item.totalamount || 0),
          multiplier: Number(item.multiplier || item.crash_point || 0),
          payout: Number(item.win || item.cashout_amount || 0),
          cashedOut: item.status === 1 || Number(item.cashout_amount || 0) > 0,
          timestamp: item.datetime ? new Date(item.datetime).getTime() : Date.now(),
        }))
      }
      return []
    } catch (error) {
      if (API_CONFIG.USE_MOCK_FALLBACK) {
        console.warn('[betService.getMyBetsHistory] Notice:', error.message)
        return []
      }
      throw error
    }
  },
}
