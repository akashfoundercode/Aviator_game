/**
 * API Configuration & Environment Setup
 * Integrated with Veronova Aviator APIs + Real-time socket sync
 */

export function getActiveUserId() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('id') || params.get('uid') || '1'
  }
  return '1'
}

export const DEFAULT_GAME_ID = 5

export const API_CONFIG = {
  // Base API URL default to Veronova server or env override
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://root.veronova.co.in',
  WS_URL: import.meta.env.VITE_WS_URL || '',
  
  // Timeout in milliseconds
  TIMEOUT_MS: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,

  // Fallback to local simulation if network or API error occurs
  USE_MOCK_FALLBACK: import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false',

  // Official Veronova Aviator Endpoints
  ENDPOINTS: {
    // 1. Profile API (GET) - ?id=1
    PROFILE: '/api/profile',
    
    // 2. Last Five / Recent Results (GET)
    LAST_FIVE_RESULT: '/api/aviator_last_five_result',
    
    // 3. Bet API (POST) - { uid, number, amount, game_id, game_sr_num }
    BET: '/api/aviator_bet',
    
    // 4. Cashout API (POST) - { salt } (base64 encoded JSON)
    CASHOUT: '/api/aviator_cashout',
    
    // 5. Bet History API (POST) - { uid, game_id }
    BET_HISTORY: '/api/aviator_history',
    
    // 6. Round Manager / Socket Sync (GET) - returns current game_sr, adminmultiply, etc.
    RESULT_HALF: '/Aviator/result_half_new.php',
    
    // 7. Result Insert (POST)
    RESULT_INSERT: '/Aviator/result_insert_new.php',
  },

  // WebSocket Event Names
  WS_EVENTS: {
    ROUND_COUNTDOWN: 'round_countdown',
    ROUND_START: 'round_start',
    MULTIPLIER_TICK: 'multiplier_tick',
    ROUND_CRASHED: 'round_crashed',
    LIVE_BETS_UPDATE: 'live_bets_update',
    BALANCE_UPDATE: 'balance_update',
  },
}

// Token Management
const TOKEN_KEY = 'skyrush_auth_token'

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || ''
    } catch {
      return ''
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {}
  },
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {}
  },
}

export function isApiConfigured() {
  return Boolean(API_CONFIG.BASE_URL && API_CONFIG.BASE_URL.trim().length > 0)
}

export function isWebSocketConfigured() {
  return Boolean(API_CONFIG.WS_URL && API_CONFIG.WS_URL.trim().length > 0)
}
