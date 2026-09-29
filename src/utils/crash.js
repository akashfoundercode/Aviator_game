/**
 * Crash point generation and Aviator flight math.
 * Standard exponential growth curve calibrated to authentic crash game timings.
 */

const HOUSE_EDGE = 0.03 // 3% instant crash at 1.00x
const MAX_CRASH = 1000 // ceiling

export function generateCrashPoint() {
  const r = Math.random()

  if (r < HOUSE_EDGE) {
    return 1.00
  }

  // Long-tail distribution: 97% distributed across 1.01x to 1000x
  const raw = (1 - HOUSE_EDGE) / (1 - r)
  const crash = Math.min(MAX_CRASH, raw)
  return Math.max(1.00, Math.floor(crash * 100) / 100)
}

/**
 * Generate a simulated Provably Fair SHA256 hex string for a round
 */
export function generateProvablyFairHash(roundId, crashPoint) {
  const serverSeed = `aviator_server_${roundId}_${(crashPoint * 9381).toString(16)}`
  const clientSeed = '000000000000000000045f94b92b6a782e'
  // Simplified deterministic hash representation
  let hash = ''
  const str = `${serverSeed}:${clientSeed}:${roundId}`
  for (let i = 0; i < 32; i++) {
    const code = (str.charCodeAt(i % str.length) * (i + 1) * 31 + Math.floor(crashPoint * 100)) % 256
    hash += code.toString(16).padStart(2, '0')
  }
  return {
    serverSeed,
    clientSeed,
    hash,
  }
}

/**
 * Multiplier as a function of elapsed flying time (seconds).
 * Smooth exponential growth: 1.00x at t=0, ~2.00x at ~4.5s, ~5.00x at ~10s, etc.
 */
export function multiplierAtTime(t) {
  const GROWTH_RATE = 0.155
  return Math.max(1.00, Math.exp(GROWTH_RATE * t))
}

/**
 * Get color category for a multiplier value matching Aviator standard
 */
export function getMultiplierColor(multiplier) {
  if (multiplier < 2.0) {
    return '#34b4ff' // Cyan / Blue for < 2.00x
  }
  if (multiplier < 10.0) {
    return '#913ef8' // Purple / Violet for 2.00x - 9.99x
  }
  return '#c017b4' // Magenta / Pink for >= 10.00x
}
