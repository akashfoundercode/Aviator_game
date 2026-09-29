import React, { useEffect, useRef, useState } from 'react'
import World from './World'
import AviatorPlane from './AviatorPlane'
import BoardingLoaderOverlay from './BoardingLoaderOverlay'
import flyingCharacterImg from '../assets/loader/flyingchar.png'
import { GAME_STATE } from '../hooks/useGameEngine'

function getMultiplierTier(m) {
  if (m >= 50) return 'gold'
  if (m >= 10) return 'pink'
  if (m >= 2) return 'purple'
  return 'blue'
}

export default function FlightArena({
  gameState,
  multiplier,
  countdown,
  crashPoint,
  flightElapsed,
  winNotification,
}) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [parachutes, setParachutes] = useState([])
  const nextParachuteAtRef = useRef(3.4)
  const parachuteIdRef = useRef(0)

  // Observe container dimensions responsively
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    const updateSize = () => {
      if (el) {
        setDimensions({
          width: el.clientWidth || 800,
          height: el.clientHeight || 420,
        })
      }
    }

    updateSize()
    const ro = new ResizeObserver(() => updateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const width = dimensions.width || 800
  const height = dimensions.height || 420

  // Runway ground baseline in pixels - matches the runway tarmac strip in the background
  const runwayY = height * 0.775
  const runwayStartX = width * 0.06
  const cruiseX = width * 0.52
  const cruiseY = height * 0.46

  let planeX = runwayStartX
  let planeY = runwayY
  let rotation = 0
  let retract = 0
  let vibration = 0
  let worldOffset = 0
  let isGroundRolling = false

  const SPRINT_START = 1.60 // Phase 1: Slow gentle taxi roll -> Engines build full thrust
  const ROTATE_START = 2.50 // Phase 2: High-speed sprint -> Nose rotates up (Vr)
  const LIFTOFF_TIME = 3.30 // Phase 3: Full speed liftoff into the sky

  if (gameState === GAME_STATE.COUNTDOWN) {
    // Parked flat on the runway tarmac (0deg level)
    planeX = runwayStartX
    planeY = runwayY
    rotation = 0
    retract = 0
    vibration = 0
    worldOffset = 0
    isGroundRolling = false
  } else if (gameState === GAME_STATE.FLYING) {
    const t = flightElapsed

    // Real Airplane Physics:
    // 1. (0 to 1.6s): Slow taxi roll (gentle creeping forward)
    // 2. (1.6 to 3.3s): Massive jet engine thrust surge (accelerates rapidly)
    // 3. (3.3s+): Aerodynamic liftoff & climb
    let forwardRatio = 0
    if (t < SPRINT_START) {
      const p1 = t / SPRINT_START
      forwardRatio = Math.pow(p1, 1.8) * 0.12 // slow start
    } else if (t < LIFTOFF_TIME) {
      const p2 = (t - SPRINT_START) / (LIFTOFF_TIME - SPRINT_START)
      forwardRatio = 0.12 + Math.pow(p2, 2.0) * 0.48 // builds massive speed
    } else {
      const p3 = Math.min(1, (t - LIFTOFF_TIME) / 2.0)
      const easeAir = 1 - Math.pow(1 - p3, 2.0)
      forwardRatio = 0.60 + easeAir * 0.40
    }

    planeX = runwayStartX + (cruiseX - runwayStartX) * forwardRatio

    if (t < SPRINT_START) {
      // Phase 1: Gentle slow taxi roll on tarmac
      planeY = runwayY
      rotation = 0
      retract = 0
      vibration = Math.sin(t * 18) * 0.3
      worldOffset = 0
      isGroundRolling = true
    } else if (t < ROTATE_START) {
      // Phase 2A: Full power engine sprint
      planeY = runwayY
      rotation = 0
      retract = 0
      const speedP = (t - SPRINT_START) / (ROTATE_START - SPRINT_START)
      vibration = Math.sin(t * (24 + speedP * 18)) * (0.4 + speedP * 0.8)
      worldOffset = 0
      isGroundRolling = true
    } else if (t < LIFTOFF_TIME) {
      // Phase 2B: High-speed nose rotation
      const rotP = (t - ROTATE_START) / (LIFTOFF_TIME - ROTATE_START)
      const easeRot = rotP * rotP * (3 - 2 * rotP)
      rotation = -15.0 * easeRot
      planeY = runwayY
      retract = 0
      vibration = Math.sin(t * 42) * (1.1 * (1 - rotP * 0.3))
      worldOffset = 0
      isGroundRolling = true
    } else {
      // Phase 3: Aerodynamic Liftoff & Climb into the Sky
      isGroundRolling = false
      const climbT = t - LIFTOFF_TIME

      // Smooth aerodynamic lift climb
      const climbP = Math.min(1, climbT / 2.6)
      const easeY = 1 - Math.pow(1 - climbP, 2.4)
      planeY = runwayY - (runwayY - cruiseY) * easeY

      // Smooth Rocket Pitch Angle (-48deg upward climb)
      const pitchP = Math.min(1, climbT / 1.1)
      const easePitch = pitchP * pitchP * (3 - 2 * pitchP)
      const targetRocketPitch = -15.0 + (-33.0 * easePitch) // Pitches smoothly up to -48deg
      const microRocketSway = Math.sin(climbT * 2.8) * 0.5
      rotation = targetRocketPitch + microRocketSway

      // Landing Gear Retraction
      const gearDelay = 0.2
      const gearDuration = 0.75
      retract = Math.min(1, Math.max(0, (climbT - gearDelay) / gearDuration))

      // Aerodynamic micro-sway
      const wobbleY = Math.sin(climbT * 2.2) * 1.6
      const wobbleX = Math.cos(climbT * 1.6) * 1.0
      planeX += wobbleX
      planeY += wobbleY

      // High-speed background scrolling through celestial frames
      const milestoneScroll = climbT * 0.75 + Math.log(Math.max(1, multiplier)) * 0.65
      worldOffset = height * (easeY * 1.0 + milestoneScroll)
      vibration = 0
    }
  } else if (gameState === GAME_STATE.CRASHED) {
    planeX = width + 320
    planeY = -280
    rotation = -55
    retract = 1
    vibration = 0
    worldOffset = height * 8
    isGroundRolling = false
  }

  const isFlying = gameState === GAME_STATE.FLYING
  const isCrashed = gameState === GAME_STATE.CRASHED
  const isCountdown = gameState === GAME_STATE.COUNTDOWN
  const multTier = getMultiplierTier(multiplier)

  useEffect(() => {
    if (isCountdown) {
      setParachutes([])
      nextParachuteAtRef.current = 3.4
      parachuteIdRef.current = 0
      return
    }
    if (!isFlying || flightElapsed < nextParachuteAtRef.current) return

    const planeWidth = Math.min(215, Math.max(140, width * 0.165))
    const planeHeight = planeWidth / 1.55
    const centerX = planeX + planeWidth * 0.5
    const centerY = planeY + planeHeight * 0.5
    // Top flank / bagal ejection position
    const relX = -0.12 * planeWidth
    const relY = -0.42 * planeHeight
    const rad = (rotation * Math.PI) / 180
    const rotX = relX * Math.cos(rad) - relY * Math.sin(rad)
    const rotY = relX * Math.sin(rad) + relY * Math.cos(rad)

    const parachute = {
      id: parachuteIdRef.current,
      left: centerX + rotX - 33,
      top: centerY + rotY - 33,
    }
    parachuteIdRef.current += 1
    const nextInterval = parachuteIdRef.current < 3 ? 1.0 : 2.2
    nextParachuteAtRef.current = flightElapsed + nextInterval
    setParachutes((current) => [...current, parachute])
  }, [isCountdown, isFlying, flightElapsed, planeX, planeY, rotation, width])



  return (
    <div className={`flight-arena ${isCrashed ? 'is-crashed' : ''} ${isCountdown ? 'is-countdown' : ''}`} ref={containerRef}>
      {/* Vertically Stacked Seamless Sky + Runway with Celestial Milestones */}
      <World
        offset={worldOffset}
        flightElapsed={flightElapsed}
        multiplier={multiplier}
      />

      {/* Jet Actor Container (Active during Flight & Crash) */}
      {!isCountdown && (
        <div
          className={`plane-actor-container ${isCrashed ? 'plane-flew-away' : ''}`}
          style={{
            left: `${planeX}px`,
            top: `${planeY}px`,
          }}
        >
          <AviatorPlane
            rotation={rotation}
            isFlying={isFlying}
            retract={retract}
            vibration={vibration}
            isGroundRolling={isGroundRolling}
          />
        </div>
      )}

      {parachutes.map((parachute) => (
        <div
          key={parachute.id}
          className="flight-parachute-eject"
          style={{
            left: `${parachute.left}px`,
            top: `${parachute.top}px`,
          }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && e.animationName === 'parachuteEject') {
              setParachutes((current) => current.filter((item) => item.id !== parachute.id))
            }
          }}
          aria-hidden="true"
        >
          <span className="eject-blast-puff" onAnimationEnd={(e) => e.stopPropagation()} />
          <img src={flyingCharacterImg} alt="" draggable="false" />
        </div>
      ))}

      {/* Center Stage Multiplier & Intermission Overlay */}
      <div className="arena-center-display">
        {/* Realistic Boarding Loader & Miniature Jumping Passengers Overlay */}
        {isCountdown && (
          <BoardingLoaderOverlay
            countdown={countdown}
            totalCountdown={10.0}
          />
        )}

        {/* Ultra-Premium Live Active Multiplier */}
        {isFlying && (
          <div className={`premium-multiplier-display tier-${multTier}`}>
            <div className="multiplier-ambient-halo" />
            <div className="multiplier-digits-wrap">
              <span className="multiplier-number">{multiplier.toFixed(2)}</span>
              <span className="multiplier-x-badge">x</span>
            </div>
          </div>
        )}

        {/* Crashed / Flew Away State */}
        {isCrashed && (
          <div className="premium-flew-away-card">
            <div className="flew-away-title">FLEW AWAY!</div>
            <div className="flew-away-multiplier">
              {crashPoint ? crashPoint.toFixed(2) : multiplier.toFixed(2)}
              <span className="mult-x-tag">x</span>
            </div>
          </div>
        )}

        {/* Win Notification Banner */}
        {winNotification && (
          <div className="win-toast-overlay">
            <div className="win-toast-badge">YOU WON</div>
            <div className="win-toast-amount">₹{winNotification.payout.toFixed(2)}</div>
            <div className="win-toast-mult">@ {winNotification.multiplier.toFixed(2)}x</div>
          </div>
        )}
      </div>
    </div>
  )
}
