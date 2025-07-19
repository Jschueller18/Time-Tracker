// Sound utilities for the Deep Work Timer

export class SoundManager {
  constructor() {
    this.audioContext = null
    this.isEnabled = true
    this.currentAlarm = null
    this.alarmInterval = null
  }

  async initAudio() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      return true
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      return false
    }
  }

  // Generate a single chime sound (public method for testing)
  async playChime() {
    if (!this.isEnabled || !this.isAudioEnabled()) return
    
    await this.initAudio()
    
    if (!this.audioContext) return

    try {
      const duration = 0.6
      
      // Create three tones for a pleasant chord (C major)
      const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
      
      frequencies.forEach((freq, index) => {
        try {
          const oscillator = this.audioContext.createOscillator()
          const gainNode = this.audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(this.audioContext.destination)
          
          oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime)
          oscillator.type = 'sine'
          
          // Set volume (lower for each additional tone)
          const volume = 0.08 / (index + 1)
          gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
          
          // Fade out
          gainNode.gain.exponentialRampToValueAtTime(
            0.001, 
            this.audioContext.currentTime + duration
          )
          
          oscillator.start(this.audioContext.currentTime + index * 0.08)
          oscillator.stop(this.audioContext.currentTime + duration)
          
          // Clean up oscillator after it's done
          oscillator.addEventListener('ended', () => {
            oscillator.disconnect()
            gainNode.disconnect()
          })
        } catch (oscError) {
          console.error('Error creating oscillator:', oscError)
        }
      })
      
    } catch (error) {
      console.error('Failed to play chime:', error)
    }
  }

  // Start persistent completion sound that loops until stopped
  async playCompletionSound() {
    if (!this.isEnabled || !this.isAudioEnabled()) return

    try {
      await this.initAudio()
      
      if (!this.audioContext) {
        console.warn('Audio context not available')
        return
      }

      // Stop any existing alarm
      this.stopAlarm()
      
      // Play initial chime
      await this.playChime()
      
      // Set up repeating alarm every 3 seconds
      this.alarmInterval = setInterval(() => {
        if (this.isEnabled && this.audioContext) {
          this.playChime()
        } else {
          this.stopAlarm()
        }
      }, 3000)
      
    } catch (error) {
      console.error('Failed to play completion sound:', error)
    }
  }

  // Stop the persistent alarm
  stopAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval)
      this.alarmInterval = null
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  isAudioEnabled() {
    return this.isEnabled && 'AudioContext' in window
  }
}

// Create singleton instance
export const soundManager = new SoundManager()