// Web Audio API Synthesizer for Aviator game (zero external audio file dependency)

class SoundManager {
  constructor() {
    this.ctx = null
    this.muted = false
    this.engineOsc = null
    this.engineGain = null
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.ctx = new AudioContext()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setMuted(muted) {
    this.muted = muted
    if (muted) {
      this.stopEngine()
    }
  }

  // Click sound on buttons
  playClick() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04)

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.04)
    } catch (e) {
      // Ignore
    }
  }

  // Start plane engine hum during flight
  startEngine() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    try {
      this.stopEngine()
      this.engineOsc = this.ctx.createOscillator()
      this.engineGain = this.ctx.createGain()

      this.engineOsc.type = 'sawtooth'
      this.engineOsc.frequency.setValueAtTime(80, this.ctx.currentTime)

      // Low-pass filter for smooth rumble
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(220, this.ctx.currentTime)

      this.engineGain.gain.setValueAtTime(0.06, this.ctx.currentTime)

      this.engineOsc.connect(filter)
      filter.connect(this.engineGain)
      this.engineGain.connect(this.ctx.destination)

      this.engineOsc.start()
    } catch (e) {
      // Ignore
    }
  }

  // Modulate engine pitch as multiplier increases
  updateEnginePitch(multiplier) {
    if (this.muted || !this.engineOsc || !this.ctx) return
    try {
      const baseFreq = 80
      const newFreq = Math.min(300, baseFreq + (multiplier - 1) * 20)
      this.engineOsc.frequency.setTargetAtTime(newFreq, this.ctx.currentTime, 0.1)
    } catch (e) {
      // Ignore
    }
  }

  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop()
        this.engineOsc.disconnect()
      } catch (e) {
        // Ignore
      }
      this.engineOsc = null
    }
  }

  // Winning / Cashout chime
  playCashout() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05)

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.05)
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.05 + 0.22)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(this.ctx.currentTime + idx * 0.05)
        osc.stop(this.ctx.currentTime + idx * 0.05 + 0.22)
      })
    } catch (e) {
      // Ignore
    }
  }

  // Crash / Flew Away sound
  playFlewAway() {
    if (this.muted) return
    this.init()
    this.stopEngine()
    if (!this.ctx) return

    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(360, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.35)

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.35)
    } catch (e) {
      // Ignore
    }
  }
}

export const soundManager = new SoundManager()

