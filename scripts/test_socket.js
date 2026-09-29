import { io } from 'socket.io-client'

console.log('Connecting to https://fctechteamnode.shop/ ...')

// Test 1: Root namespace '/'
const socketRoot = io('https://fctechteamnode.shop/', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
})

socketRoot.on('connect', () => {
  console.log('[Root] Connected! Socket ID:', socketRoot.id)
  
  // Try sending demobdg_aviator room join or events
  socketRoot.emit('join', 'demobdg_aviator')
  socketRoot.emit('joinRoom', 'demobdg_aviator')
  socketRoot.emit('demobdg_aviator', { action: 'init' })
  socketRoot.emit('subscribe', { game: 'demobdg_aviator' })
  socketRoot.emit('room', 'demobdg_aviator')
})

socketRoot.on('connect_error', (err) => {
  console.log('[Root] Connect error:', err.message)
})

socketRoot.onAny((event, ...args) => {
  console.log('[Root Event Received]:', event, JSON.stringify(args))
})

// Test 2: demobdg_aviator namespace '/demobdg_aviator'
const socketNs = io('https://fctechteamnode.shop/demobdg_aviator', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
})

socketNs.on('connect', () => {
  console.log('[Namespace /demobdg_aviator] Connected! Socket ID:', socketNs.id)
})

socketNs.on('connect_error', (err) => {
  console.log('[Namespace /demobdg_aviator] Connect error:', err.message)
})

socketNs.onAny((event, ...args) => {
  console.log('[Namespace /demobdg_aviator Event]:', event, JSON.stringify(args))
})

// Wait 16 seconds to collect logs
setTimeout(() => {
  console.log('Finished listening. Disconnecting...')
  socketRoot.disconnect()
  socketNs.disconnect()
  process.exit(0)
}, 16000)
