import { useCallback, useEffect, useRef, useState } from 'react'
import { generateCrashPoint, multiplierAtTime, RUNWAY_TAKEOFF_TIME } from '../utils/crash'
import { getPlayerProfile, generateRoundPlayers } from '../utils/playerPool'
import { soundManager } from '../utils/audio'
import {
  authService,
  betService,
  gameService,
  socketService,
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
  
  // Simulated dynamic multiplayer bets with realistic names, real human portraits, and cashouts
  const [liveBots, setLiveBots] = useState(() => generateRoundPlayers(1084816, 38))
  
  // Real round serial number from GET /Aviator/result_half_new.php
  const [roundId, setRoundId] = useState(1084816)
  const [adminMultiply, setAdminMultiply] = useState(0)
  const [winNotification, setWinNotification] = useState(null)
  const [soundMuted, setSoundMuted] = useState(false)
  const [socketStatus, setSocketStatus] = useState({
    connected: false,
    channel: 'demobdg_aviator',
    lastPacket: null,
  })

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
  const liveBotsRef = useRef(liveBots)
  liveBotsRef.current = liveBots
  const roundPoolRef = useRef([])
  const poolIndexRef = useRef(0)

  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState
  const lastSocketTimeRef = useRef(0)
  const flightStartTsRef = useRef(0)
  const countdownStartTsRef = useRef(performance.now())
  const countdownDurationRef = useRef(10.0)
  const crashToCountdownTimerRef = useRef(null)

  const clearRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (crashToCountdownTimerRef.current) {
      clearTimeout(crashToCountdownTimerRef.current)
      crashToCountdownTimerRef.current = null
    }
  }

  // Real user profile data from GET /api/profile?id=1
  const [userProfile, setUserProfile] = useState(null)

  // Refresh live user bet history & all bets list from API
  // Refresh live user bet history from API
  const syncBetHistoryFromApi = useCallback(() => {
    betService.getMyBetsHistory().then((historyList) => {
      if (Array.isArray(historyList) && historyList.length > 0) {
        setMyBetsHistory(historyList)
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

  // Start fresh countdown -> restarts loading bar and 10s timer cleanly
  const startCountdown = useCallback((duration = COUNTDOWN_SECONDS) => {
    clearRaf()
    soundManager.stopEngine()
    setGameState(GAME_STATE.COUNTDOWN)
    gameStateRef.current = GAME_STATE.COUNTDOWN
    countdownStartTsRef.current = performance.now()
    countdownDurationRef.current = duration
    setCountdown(+duration.toFixed(1))
    setMultiplier(1.0)
    setCrashPoint(null)
    setFlightElapsed(0)
    crashPointRef.current = null

    // Fresh dynamic pool of live players with authentic first names & human portrait photos
    const currentRound = roundIdRef.current || 1084816
    const pool = generateRoundPlayers(currentRound, 55)
    roundPoolRef.current = pool
    // Start countdown with initial batch of 12 bets (auto-bets / early bets)
    const initialBots = pool.slice(0, 12)
    poolIndexRef.current = 12
    setLiveBots(initialBots)
    liveBotsRef.current = initialBots

    // Sync round serial number & admin multiply from server
    gameService.getResultHalf().then((res) => {
      if (res && res.gameSr) {
        setRoundId(res.gameSr)
        if (res.adminMultiply && res.adminMultiply > 0) {
          setAdminMultiply(res.adminMultiply)
        } else {
          setAdminMultiply(0)
        }
        if (res.gameSr !== currentRound) {
          const updatedPool = generateRoundPlayers(res.gameSr, 55)
          roundPoolRef.current = updatedPool
          const updatedInitial = updatedPool.slice(0, 12)
          poolIndexRef.current = 12
          setLiveBots(updatedInitial)
          liveBotsRef.current = updatedInitial
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

  // Countdown timer tick & dynamic bet streaming during betting phase
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return undefined

    // 1. Monotonic countdown tick
    const interval = setInterval(() => {
      const now = performance.now()
      const elapsed = (now - countdownStartTsRef.current) / 1000
      const remaining = Math.max(0, countdownDurationRef.current - elapsed)
      setCountdown(+remaining.toFixed(1))

      const isSocketActive = (now - lastSocketTimeRef.current) < 4000
      if (!isSocketActive && !GAME_STOPPED_FOR_TUNING && remaining <= 0) {
        clearInterval(interval)
        setGameState(GAME_STATE.FLYING)
      }
    }, 100)

    // 2. Stream in new bets dynamically as users place bets (every 250ms - 400ms)
    const streamInterval = setInterval(() => {
      const pool = roundPoolRef.current
      const idx = poolIndexRef.current
      if (pool && idx < pool.length) {
        const batchSize = Math.min(pool.length - idx, Math.random() < 0.4 ? 2 : 1)
        const incoming = pool.slice(idx, idx + batchSize)
        poolIndexRef.current = idx + batchSize
        setLiveBots((prev) => [...prev, ...incoming])
        liveBotsRef.current = [...liveBotsRef.current, ...incoming]
      }
    }, 320)

    return () => {
      clearInterval(interval)
      clearInterval(streamInterval)
    }
  }, [gameState])

  // Local fallback FLYING loop (only runs when socket is offline)
  useEffect(() => {
    if (gameState !== GAME_STATE.FLYING) return undefined

    // Skip local calculations if socket is actively streaming
    if (performance.now() - lastSocketTimeRef.current < 4000) {
      return undefined
    }

    // Lock in all pending bets as ACTIVE
    setBets((prev) =>
      prev.map((b) => (b.status === BET_STATUS.PENDING ? { ...b, status: BET_STATUS.ACTIVE } : b))
    )

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
      const isAirborne = elapsed >= RUNWAY_TAKEOFF_TIME

      if (isAirborne && liveM >= target) {
        crashPointRef.current.liveMultiplier = target
        setMultiplier(target)
        setFlightElapsed(elapsed)
        setCrashPoint(target)
        soundManager.playFlewAway()

        gameService.insertResult({ gameSr: currentRound, multiplier: target })
        syncRoundHistoryPills()
        syncBetHistoryFromApi()
        syncWalletBalance()

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

      crashPointRef.current.liveMultiplier = liveM
      setMultiplier(liveM)
      setFlightElapsed(elapsed)
      soundManager.updateEnginePitch(liveM)

      // Live bot cashouts in offline / local fallback mode
      const currentBots = liveBotsRef.current
      const hasNewCashout = currentBots.some(
        (b) => !b.cashedOut && b.targetCashout <= liveM
      )
      if (hasNewCashout) {
        const updatedBots = currentBots.map((b) => {
          if (!b.cashedOut && b.targetCashout <= liveM) {
            return {
              ...b,
              cashedOut: true,
              cashedAt: b.targetCashout,
              payout: +(b.amount * b.targetCashout).toFixed(2),
            }
          }
          return b
        })
        liveBotsRef.current = updatedBots
        setLiveBots(updatedBots)
      }

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

  // CRASHED -> Display explosion blast (min 2.2s).
  // If socket is active, the server's s === 0 packet will trigger startCountdown at the exact millisecond betting opens.
  // If socket is offline, fallback timer automatically transitions to countdown.
  useEffect(() => {
    if (gameState !== GAME_STATE.CRASHED) return undefined

    const t = setTimeout(() => {
      const isSocketActive = (performance.now() - lastSocketTimeRef.current) < 4000
      if (!isSocketActive) {
        startCountdown(10.0)
      }
    }, 2400)

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

  // Initialize socket connection to https://fctechteamnode.shop/ for demobdg_aviator
  useEffect(() => {
    socketService.connect()

    const unsubStatus = socketService.on('connection_status', (st) => {
      setSocketStatus((prev) => ({
        ...prev,
        connected: Boolean(st?.connected),
      }))
    })

    const unsubChannel = socketService.on('demobdg_aviator', (pkt) => {
      if (!pkt) return
      const now = performance.now()
      lastSocketTimeRef.current = now

      setSocketStatus((prev) => ({
        ...prev,
        lastPacket: pkt,
      }))

      const s = Number(pkt.status)
      const period = Number(pkt.period) || roundIdRef.current

      // 1. Period / Round ID sync
      if (period && period !== roundIdRef.current) {
        roundIdRef.current = period
        setRoundId(period)
        const pool = generateRoundPlayers(period, 55)
        roundPoolRef.current = pool
        const initialBots = pool.slice(0, 12)
        poolIndexRef.current = 12
        setLiveBots(initialBots)
        liveBotsRef.current = initialBots
      }

      // 2. STATUS 0: COUNTDOWN (Socket 10s Timer)
      if (s === 0) {
        const betTime = typeof pkt.betTime === 'number' ? pkt.betTime : (parseFloat(pkt.betTime) || 10)

        if (gameStateRef.current !== GAME_STATE.COUNTDOWN) {
          startCountdown(betTime)
        } else {
          // Re-sync with server's authoritative betTime countdown every second
          // This ensures that at betTime: 1, exactly 1.0 second remains until flight,
          // preventing the countdown from hitting 0.0s prematurely!
          countdownStartTsRef.current = now
          countdownDurationRef.current = betTime
        }
      }

      // 3. STATUS 1: FLYING (Socket live flight & multiplier)
      else if (s === 1) {
        const liveM = parseFloat(pkt.timer) || 1.0

        if (gameStateRef.current !== GAME_STATE.FLYING) {
          clearRaf()
          setCountdown(0)
          setGameState(GAME_STATE.FLYING)
          gameStateRef.current = GAME_STATE.FLYING
          flightStartTsRef.current = now
          soundManager.startEngine()

          // Lock in all pending bets as ACTIVE
          setBets((prev) =>
            prev.map((b) => (b.status === BET_STATUS.PENDING ? { ...b, status: BET_STATUS.ACTIVE } : b))
          )

          // 60 FPS smooth RAF loop for silky-smooth plane flight & background movements
          const animTick = () => {
            if (gameStateRef.current !== GAME_STATE.FLYING) return
            const elapsedNow = (performance.now() - flightStartTsRef.current) / 1000
            setFlightElapsed(elapsedNow)
            rafRef.current = requestAnimationFrame(animTick)
          }
          rafRef.current = requestAnimationFrame(animTick)
        }

        setMultiplier(liveM)
        crashPointRef.current = { value: liveM, liveMultiplier: liveM }
        soundManager.updateEnginePitch(liveM)

        // Live bot cashouts
        const currentBots = liveBotsRef.current
        const hasNewCashout = currentBots.some(
          (b) => !b.cashedOut && b.targetCashout <= liveM
        )
        if (hasNewCashout) {
          const updatedBots = currentBots.map((b) => {
            if (!b.cashedOut && b.targetCashout <= liveM) {
              return {
                ...b,
                cashedOut: true,
                cashedAt: b.targetCashout,
                payout: +(b.amount * b.targetCashout).toFixed(2),
              }
            }
            return b
          })
          liveBotsRef.current = updatedBots
          setLiveBots(updatedBots)
        }

        // Auto cashout for player's bets
        betsRef.current.forEach((b, i) => {
          if (b.status === BET_STATUS.ACTIVE && b.autoCashout) {
            const autoTarget = parseFloat(b.autoCashout)
            if (!Number.isNaN(autoTarget) && autoTarget >= 1.01 && liveM >= autoTarget) {
              cashOut(i)
            }
          }
        })
      }

      // 4. STATUS 2: CRASHED (Socket flew away / explosion)
      else if (s === 2) {
        const finalCrash = parseFloat(pkt.timer) || 1.0

        // Only trigger explosion if currently flying
        if (gameStateRef.current === GAME_STATE.FLYING) {
          clearRaf()
          setGameState(GAME_STATE.CRASHED)
          gameStateRef.current = GAME_STATE.CRASHED
          setMultiplier(finalCrash)
          setCrashPoint(finalCrash)
          soundManager.playCrash()

          // Optimistically add to top history pills immediately
          const curRound = roundIdRef.current || period
          setHistory((prev) => {
            if (prev.some((h) => h.id === curRound || h.gameSr === curRound)) return prev
            return [{ id: curRound, gameSr: curRound, multiplier: finalCrash }, ...prev].slice(0, 30)
          })

          // Resolve active bets as lost
          betsRef.current.forEach((b) => {
            if (b.status === BET_STATUS.ACTIVE) {
              setMyBetsHistory((prevH) =>
                [
                  {
                    roundId: curRound,
                    amount: b.amount,
                    multiplier: finalCrash,
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

          // Refresh pills & history from server
          syncRoundHistoryPills()
          syncBetHistoryFromApi()
          syncWalletBalance()

          // Transition to loading page & restart loading bar after 2.4s of explosion!
          clearTimeout(crashToCountdownTimerRef.current)
          crashToCountdownTimerRef.current = setTimeout(() => {
            startCountdown(10.0)
          }, 2400)
        }
      }
    })

    return () => {
      unsubStatus()
      unsubChannel()
      socketService.disconnect()
    }
  }, [cashOut, syncBetHistoryFromApi, syncRoundHistoryPills, syncWalletBalance])

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
    socketStatus,
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
