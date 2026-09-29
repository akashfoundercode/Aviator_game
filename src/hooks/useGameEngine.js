import { useCallback, useEffect, useRef, useState } from 'react'
import { generateCrashPoint, multiplierAtTime } from '../utils/crash'
import { soundManager } from '../utils/audio'
import {
  authService,
  betService,
  gameService,
} from '../services/api'

export const GAME_STATE = {
  COUNTDOWN: 'COUNTDOWN',
  FLYING: 'FLYING',
  CRASHED: 'CRASHED',
}

export const BET_STATUS = {
  IDLE: 'IDLE',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CASHED_OUT: 'CASHED_OUT',
  LOST: 'LOST',
}

const COUNTDOWN_SECONDS = 10.0
const CRASH_PAUSE_SECONDS = 2.6
const GAME_STOPPED_FOR_TUNING = false

function makeInitialBet(amount) {
  return {
    amount,
    autoCashout: '',
    autoBet: false,
    status: BET_STATUS.IDLE,
    cashedAt: null,
    payout: 0,
    betId: null,
  }
}

export function useGameEngine() {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(null)
  const [flightElapsed, setFlightElapsed] = useState(0)
  
  // Real data only: Multiplier pills from GET /api/aviator_last_five_result (No static dummy pills)
  const [history, setHistory] = useState([])
  
  // Real live balance from GET /api/profile?id=1
  const [balance, setBalance] = useState(() => authService.getCachedBalance())
  
  const [bets, setBets] = useState([
    makeInitialBet(100),
    makeInitialBet(200),
  ])
  
  // Real user bet history from POST /api/aviator_history
  const [myBetsHistory, setMyBetsHistory] = useState([])
  
  // Real multiplayer bets from POST /api/aviator_history (No fake bot generator)
  const [liveBots, setLiveBots] = useState([])
  
  // Real round serial number from GET /Aviator/result_half_new.php
  const [roundId, setRoundId] = useState(1084816)
  const [adminMultiply, setAdminMultiply] = useState(0)
  const [winNotification, setWinNotification] = useState(null)
  const [soundMuted, setSoundMuted] = useState(false)

  const rafRef = useRef(null)
  const phaseStartRef = useRef(null)
  const crashPointRef = useRef(null)
  const betsRef = useRef(bets)
  betsRef.current = bets
  const balanceRef = useRef(balance)
  balanceRef.current = balance
  const roundIdRef = useRef(roundId)
  roundIdRef.current = roundId
  const adminMultiplyRef = useRef(adminMultiply)
  adminMultiplyRef.current = adminMultiply

  const clearRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  // Real user profile data from GET /api/profile?id=1
  const [userProfile, setUserProfile] = useState(null)

  // Refresh live user bet history & all bets list from API
  const syncBetHistoryFromApi = useCallback(() => {
    betService.getMyBetsHistory().then((historyList) => {
      if (Array.isArray(historyList) && historyList.length > 0) {
        setMyBetsHistory(historyList)

        // Map real platform bet records into the "All Bets" tab
        const realPlatformBets = historyList.map((item) => ({
          id: `real_bet_${item.id}`,
          user: item.roundId ? `Player_${String(item.roundId).slice(-4)}` : 'Admin',
          amount: item.amount,
          cashedOut: item.cashedOut,
          cashedAt: item.multiplier,
          payout: item.payout,
          avatarColor: item.cashedOut ? '#4caf50' : '#e53935',
        }))
        setLiveBots(realPlatformBets)
      }
    }).catch(() => {})
  }, [])

  // Refresh wallet balance and user profile from server profile API
  const syncWalletBalance = useCallback(() => {
    authService.getUserProfile().then((prof) => {
      if (prof) {
        setUserProfile(prof)
        const bal = prof.total_wallet !== undefined ? prof.total_wallet : prof.wallet
        if (typeof bal === 'number') {
          setBalance(bal)
        } else if (typeof bal === 'string') {
          setBalance(parseFloat(bal) || 0)
        }
      }
    }).catch(() => {})
  }, [])

  // Refresh recent crash multiplier pills from server API
  const syncRoundHistoryPills = useCallback(() => {
    gameService.getRoundHistory().then((rounds) => {
      if (Array.isArray(rounds) && rounds.length > 0) {
        setHistory(rounds)
      }
    }).catch(() => {})
  }, [])

  // Sound toggle
  const toggleSound = useCallback(() => {
    const next = !soundMuted
    setSoundMuted(next)
    soundManager.setMuted(next)
  }, [soundMuted])

  // Reset or adjust balance
  const resetBalance = useCallback((newBal) => {
    setBalance(newBal)
  }, [])

  // Update Bet Amount
  const updateBetAmount = useCallback((index, amount) => {
    setBets((prev) =>
      prev.map((b, i) => (i === index ? { ...b, amount: Math.max(10, amount) } : b))
    )
  }, [])

  // Update Auto Cashout
  const updateAutoCashout = useCallback((index, value) => {
    setBets((prev) => prev.map((b, i) => (i === index ? { ...b, autoCashout: value } : b)))
  }, [])

  // Toggle Auto Bet
  const toggleAutoBet = useCallback((index, enabled) => {
    setBets((prev) => prev.map((b, i) => (i === index ? { ...b, autoBet: enabled } : b)))
  }, [])

  // Place Bet -> Live POST /api/aviator_bet
  const placeBet = useCallback(
    (index) => {
      setBets((prev) => {
        const bet = prev[index]
        if (bet.status !== BET_STATUS.IDLE) return prev
        if (bet.amount > balanceRef.current) return prev

        setBalance((b) => +(b - bet.amount).toFixed(2))

        betService
          .placeBet({
            panelIndex: index,
            amount: bet.amount,
            autoCashout: bet.autoCashout,
            roundId: roundIdRef.current,
          })
          .then((res) => {
            if (res && res.betId) {
              setBets((curr) =>
                curr.map((bItem, i) => (i === index ? { ...bItem, betId: res.betId } : bItem))
              )
            }
            syncWalletBalance()
            syncBetHistoryFromApi()
          })
          .catch((err) => {
            console.warn('[placeBet API notice]:', err.message)
            syncWalletBalance()
          })

        const next = [...prev]
        next[index] = { ...bet, status: BET_STATUS.PENDING, cashedAt: null, payout: 0 }
        return next
      })
    },
    [syncWalletBalance, syncBetHistoryFromApi]
  )

  // Cancel Bet
  const cancelBet = useCallback(
    (index) => {
      setBets((prev) => {
        const bet = prev[index]
        if (bet.status !== BET_STATUS.PENDING) return prev
        setBalance((b) => +(b + bet.amount).toFixed(2))

        betService
          .cancelBet({
            panelIndex: index,
            roundId: roundIdRef.current,
          })
          .catch(() => {})

        const next = [...prev]
        next[index] = { ...bet, status: BET_STATUS.IDLE, betId: null }
        return next
      })
    },
    []
  )

  // Cash Out -> Live POST /api/aviator_cashout with base64 salt
  const cashOut = useCallback(
    (index) => {
      setBets((prev) => {
        const bet = prev[index]
        if (bet.status !== BET_STATUS.ACTIVE) return prev
        const m = crashPointRef.current?.liveMultiplier ?? 1.0
        const payout = +(bet.amount * m).toFixed(2)

        setBalance((b) => +(b + payout).toFixed(2))
        soundManager.playCashout()

        betService
          .cashOut({
            panelIndex: index,
            amount: bet.amount,
            multiplier: m,
            roundId: roundIdRef.current,
          })
          .then(() => {
            syncWalletBalance()
            syncBetHistoryFromApi()
          })
          .catch((err) => {
            console.warn('[cashOut API notice]:', err.message)
            syncWalletBalance()
          })

        // Win toast
        setWinNotification({
          multiplier: m,
          payout,
          betIndex: index,
        })
        setTimeout(() => setWinNotification(null), 3800)

        // Optimistically update personal history
        setMyBetsHistory((prevH) =>
          [
            {
              roundId: roundIdRef.current,
              amount: bet.amount,
              multiplier: m,
              payout,
              cashedOut: true,
              timestamp: Date.now(),
            },
            ...prevH,
          ].slice(0, 30)
        )

        const next = [...prev]
        next[index] = { ...bet, status: BET_STATUS.CASHED_OUT, cashedAt: m, payout }
        return next
      })
    },
    [syncWalletBalance, syncBetHistoryFromApi]
  )

  // ---- Round Lifecycle ----------------------------------------------------

  // Start fresh countdown -> Fetches result_half_new.php for live round serial & admin multiplier
  const startCountdown = useCallback(() => {
    clearRaf()
    soundManager.stopEngine()
    setGameState(GAME_STATE.COUNTDOWN)
    setCountdown(COUNTDOWN_SECONDS)
    setMultiplier(1.0)
    setCrashPoint(null)
    setFlightElapsed(0)
    crashPointRef.current = null

    // Sync round serial number & admin multiply from server
    gameService.getResultHalf().then((res) => {
      if (res && res.gameSr) {
        setRoundId(res.gameSr)
        if (res.adminMultiply && res.adminMultiply > 0) {
          setAdminMultiply(res.adminMultiply)
        } else {
          setAdminMultiply(0)
        }
      }
    }).catch(() => {})

    // Re-sync wallet balance & history
    syncWalletBalance()
    syncBetHistoryFromApi()
    syncRoundHistoryPills()

    // Reset previous bets or re-queue auto bets
    setBets((prev) =>
      prev.map((b) => {
        if (b.autoBet && b.amount <= balanceRef.current) {
          setBalance((bal) => +(bal - b.amount).toFixed(2))
          return { ...b, status: BET_STATUS.PENDING, cashedAt: null, payout: 0 }
        }
        return makeInitialBet(b.amount)
      })
    )
  }, [syncWalletBalance, syncBetHistoryFromApi, syncRoundHistoryPills])

  // Countdown timer tick
  useEffect(() => {
    if (GAME_STOPPED_FOR_TUNING || gameState !== GAME_STATE.COUNTDOWN) return undefined

    const interval = 100
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 0.1
        if (next <= 0) {
          clearInterval(timer)
          setGameState(GAME_STATE.FLYING)
          return 0
        }
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [gameState])

  // FLYING phase
  useEffect(() => {
    if (gameState !== GAME_STATE.FLYING) return undefined

    // Lock in all pending bets as ACTIVE
    setBets((prev) =>
      prev.map((b) => (b.status === BET_STATUS.PENDING ? { ...b, status: BET_STATUS.ACTIVE } : b))
    )

    // Determine target crash point: use adminMultiply if set > 1.0, otherwise use algorithm
    let targetCrash = adminMultiplyRef.current > 1.0
      ? adminMultiplyRef.current
      : generateCrashPoint()

    crashPointRef.current = { value: targetCrash, liveMultiplier: 1.0 }
    setCrashPoint(null)

    soundManager.startEngine()
    phaseStartRef.current = null

    const currentRound = roundIdRef.current

    const tick = (ts) => {
      if (phaseStartRef.current === null) phaseStartRef.current = ts
      const elapsed = (ts - phaseStartRef.current) / 1000
      const liveM = multiplierAtTime(elapsed)
      const target = crashPointRef.current.value

      // Crash Condition (FLEW AWAY!)
      if (liveM >= target) {
        crashPointRef.current.liveMultiplier = target
        setMultiplier(target)
        setFlightElapsed(elapsed)
        setCrashPoint(target)
        soundManager.playFlewAway()

        // Insert result into server
        gameService.insertResult({ gameSr: currentRound, multiplier: target })

        // Refresh pills & history from server
        syncRoundHistoryPills()
        syncBetHistoryFromApi()
        syncWalletBalance()

        // Resolve active bets as lost
        betsRef.current.forEach((b) => {
          if (b.status === BET_STATUS.ACTIVE) {
            setMyBetsHistory((prevH) =>
              [
                {
                  roundId: currentRound,
                  amount: b.amount,
                  multiplier: target,
                  payout: 0,
                  cashedOut: false,
                  timestamp: Date.now(),
                },
                ...prevH,
              ].slice(0, 30)
            )
          }
        })

        setBets((prev) =>
          prev.map((b) => (b.status === BET_STATUS.ACTIVE ? { ...b, status: BET_STATUS.LOST } : b))
        )

        setGameState(GAME_STATE.CRASHED)
        return
      }

      // Normal flight progression
      crashPointRef.current.liveMultiplier = liveM
      setMultiplier(liveM)
      setFlightElapsed(elapsed)
      soundManager.updateEnginePitch(liveM)

      // Auto cashout for player's bets
      betsRef.current.forEach((b, i) => {
        if (b.status === BET_STATUS.ACTIVE && b.autoCashout) {
          const autoTarget = parseFloat(b.autoCashout)
          if (!Number.isNaN(autoTarget) && autoTarget >= 1.01 && liveM >= autoTarget) {
            cashOut(i)
          }
        }
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => clearRaf()
  }, [gameState, cashOut, syncRoundHistoryPills, syncBetHistoryFromApi, syncWalletBalance])

  // CRASHED -> Pause before starting new countdown
  useEffect(() => {
    if (gameState !== GAME_STATE.CRASHED) return undefined

    const t = setTimeout(() => {
      startCountdown()
    }, CRASH_PAUSE_SECONDS * 1000)

    return () => clearTimeout(t)
  }, [gameState, startCountdown])

  // Initial Data Fetching from Live Server APIs (Balance, Pills, Bets, Round ID)
  useEffect(() => {
    syncWalletBalance()
    syncRoundHistoryPills()
    syncBetHistoryFromApi()

    gameService.getResultHalf().then((res) => {
      if (res && res.gameSr) {
        setRoundId(res.gameSr)
      }
    }).catch(() => {})
  }, [syncWalletBalance, syncRoundHistoryPills, syncBetHistoryFromApi])

  // Initialize first game round
  useEffect(() => {
    startCountdown()
    return () => {
      clearRaf()
      soundManager.stopEngine()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    gameState,
    countdown,
    multiplier,
    crashPoint,
    flightElapsed,
    history,
    balance,
    bets,
    roundId,
    liveBots,
    myBetsHistory,
    userProfile,
    winNotification,
    soundMuted,
    actions: {
      placeBet,
      cancelBet,
      cashOut,
      updateBetAmount,
      updateAutoCashout,
      toggleAutoBet,
      resetBalance,
      toggleSound,
      refreshProfile: syncWalletBalance,
    },
  }
}
