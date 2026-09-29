import { io } from 'socket.io-client'

const socket = io('https://fctechteamnode.shop/', {
  transports: ['websocket', 'polling'],
})

console.log('Connecting to https://fctechteamnode.shop/ for demobdg_aviator ...')

socket.on('connect', () => {
  console.log('Connected! Socket ID:', socket.id)
})

socket.on('demobdg_aviator', (raw) => {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  console.log(`[demobdg_aviator] status: ${data.status}, betTime: ${data.betTime}, period: ${data.period}, timer: ${data.timer}`)
})

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message)
})

// Listen for 45 seconds to capture a full cycle
setTimeout(() => {
  console.log('Done.')
  socket.disconnect()
  process.exit(0)
}, 45000)
