// Simulated multiplayer live bets for Aviator

const USER_NAMES = [
  'ak***78', 'vi***92', 'ro***11', 'sa***45', 'am***88', 'ra***23', 'ne***67',
  'po***34', 'ka***90', 'mo***56', 'di***19', 'su***82', 'an***03', 'sh***41',
  'pr***77', 'ma***65', 'vi***30', 'ku***14', 'ga***59', 'ja***81', 'ta***28',
  'ri***99', 'yo***37', 'he***52', 'ch***63', 'de***74', 'ar***18', 'na***85'
]

const AVATAR_COLORS = [
  '#e50914', '#913ef8', '#34b4ff', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'
]

export function generateLiveBots(roundId) {
  const count = 18 + Math.floor(Math.random() * 12)
  const bots = []

  for (let i = 0; i < count; i++) {
    const user = USER_NAMES[i % USER_NAMES.length] + (i >= USER_NAMES.length ? `_${i}` : '')
    const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
    const amount = [50, 100, 200, 300, 500, 1000, 2000, 5000][Math.floor(Math.random() * 8)]

    // Target cashout point for bot
    let targetMultiplier
    const r = Math.random()
    if (r < 0.35) {
      targetMultiplier = +(1.1 + Math.random() * 0.7).toFixed(2) // 1.10 - 1.80x
    } else if (r < 0.7) {
      targetMultiplier = +(1.8 + Math.random() * 1.5).toFixed(2) // 1.80 - 3.30x
    } else if (r < 0.9) {
      targetMultiplier = +(3.3 + Math.random() * 4.0).toFixed(2) // 3.30 - 7.30x
    } else {
      targetMultiplier = +(7.5 + Math.random() * 15.0).toFixed(2) // 7.50 - 22.50x
    }

    bots.push({
      id: `bot-${roundId}-${i}`,
      user,
      avatarColor: color,
      amount,
      targetMultiplier,
      cashedOut: false,
      cashedAt: null,
      payout: 0,
    })
  }

  return bots
}

export function updateBotCashouts(bots, currentMultiplier) {
  let hasChanges = false
  const updated = bots.map((bot) => {
    if (!bot.cashedOut && currentMultiplier >= bot.targetMultiplier) {
      hasChanges = true
      return {
        ...bot,
        cashedOut: true,
        cashedAt: bot.targetMultiplier,
        payout: +(bot.amount * bot.targetMultiplier).toFixed(2),
      }
    }
    return bot
  })

  return hasChanges ? updated : bots
}

