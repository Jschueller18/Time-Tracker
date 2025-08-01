// Sound utilities for the Deep Work Timer

export class SoundManager {
  constructor() {
    this.audioContext = null
    this.isEnabled = true
    this.currentAlarm = null
    this.alarmInterval = null
    this.volume = 0.5 // Default volume (0.0 to 1.0)
    this.soundType = 'chime' // Default sound type
  }

  async initAudio() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        console.log('Audio context created, state:', this.audioContext.state)
      }
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        console.log('Resuming suspended audio context...')
        await this.audioContext.resume()
        console.log('Audio context resumed, state:', this.audioContext.state)
      }
      
      return true
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      return false
    }
  }


  // Generate sound based on current sound type (public method for testing)
  async playSound() {
    console.log('playSound called - enabled:', this.isEnabled, 'audioEnabled:', this.isAudioEnabled())
    if (!this.isEnabled || !this.isAudioEnabled()) {
      console.log('Sound disabled or audio not available')
      return
    }
    
    console.log('Playing sound type:', this.soundType, 'volume:', this.volume)
    
    switch (this.soundType) {
      case 'chime':
        return this.playChime()
      case 'beep':
        return this.playBeep()
      case 'bell':
        return this.playBell()
      case 'ping':
        return this.playPing()
      case 'alert':
        return this.playAlert()
      default:
        return this.playChime()
    }
  }

  // Generate a single chime sound
  async playChime() {
    if (!this.isEnabled || !this.isAudioEnabled()) return
    
    console.log('playChime called, initializing audio...')
    await this.initAudio()
    
    if (!this.audioContext) {
      console.error('Audio context not available after init')
      return
    }
    
    console.log('Audio context state:', this.audioContext.state)

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
          
          // Set volume (lower for each additional tone, adjusted by user volume)
          const volume = (this.volume * 0.3) / (index + 1)
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
      
      // Force resume audio context for background tabs
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      // Play initial sound
      await this.playSound()
      
      // Set up repeating alarm every second for urgent attention
      this.alarmInterval = setInterval(async () => {
        if (this.isEnabled && this.audioContext) {
          // Ensure audio context stays active in background tabs
          if (this.audioContext.state === 'suspended') {
            try {
              await this.audioContext.resume()
            } catch (e) {
              console.warn('Could not resume audio context:', e)
            }
          }
          this.playSound()
        } else {
          this.stopAlarm()
        }
      }, 1000)
      
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

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)) // Clamp between 0 and 1
  }

  setSoundType(soundType) {
    this.soundType = soundType
  }

  isAudioEnabled() {
    return this.isEnabled && ('AudioContext' in window || 'webkitAudioContext' in window)
  }

  // Test method for immediate sound feedback
  async testSound() {
    console.log('Testing sound with current settings...')
    console.log('Enabled:', this.isEnabled, 'Volume:', this.volume, 'Type:', this.soundType)
    
    try {
      await this.initAudio()
      if (this.audioContext && this.audioContext.state === 'running') {
        await this.playSound()
        console.log('Test sound completed successfully')
        return true
      } else {
        console.error('Audio context not running:', this.audioContext?.state)
        return false
      }
    } catch (error) {
      console.error('Test sound failed:', error)
      return false
    }
  }

  // Alert beep sound - higher frequency rapid beeps
  async playBeep() {
    if (!this.isEnabled || !this.isAudioEnabled()) return
    
    await this.initAudio()
    if (!this.audioContext) return

    try {
      const beepDuration = 0.1
      const frequency = 800 // Higher frequency for alert
      
      for (let i = 0; i < 3; i++) {
        const oscillator = this.audioContext.createOscillator()
        const gainNode = this.audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
        oscillator.type = 'square'
        
        const volume = this.volume * 0.2
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + i * 0.15)
        gainNode.gain.exponentialRampToValueAtTime(
          0.001, 
          this.audioContext.currentTime + i * 0.15 + beepDuration
        )
        
        oscillator.start(this.audioContext.currentTime + i * 0.15)
        oscillator.stop(this.audioContext.currentTime + i * 0.15 + beepDuration)
        
        oscillator.addEventListener('ended', () => {
          oscillator.disconnect()
          gainNode.disconnect()
        })
      }
    } catch (error) {
      console.error('Failed to play beep:', error)
    }
  }

  // Bell ring sound - harmonic bell simulation
  async playBell() {
    if (!this.isEnabled || !this.isAudioEnabled()) return
    
    await this.initAudio()
    if (!this.audioContext) return

    try {
      const duration = 1.2
      const fundamental = 440 // A4
      const harmonics = [1, 2, 3, 4.2, 5.4] // Bell-like harmonic series
      
      harmonics.forEach((harmonic, index) => {
        const oscillator = this.audioContext.createOscillator()
        const gainNode = this.audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        
        oscillator.frequency.setValueAtTime(fundamental * harmonic, this.audioContext.currentTime)
        oscillator.type = 'sine'
        
        const volume = (this.volume * 0.15) / (index + 1)
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(
          0.001, 
          this.audioContext.currentTime + duration
        )
        
        oscillator.start(this.audioContext.currentTime)
        oscillator.stop(this.audioContext.currentTime + duration)
        
        oscillator.addEventListener('ended', () => {
          oscillator.disconnect()
          gainNode.disconnect()
        })
      })
    } catch (error) {
      console.error('Failed to play bell:', error)
    }
  }

  // Soft ping sound - single tone with fade
  async playPing() {
    if (!this.isEnabled || !this.isAudioEnabled()) return
    
    await this.initAudio()
    if (!this.audioContext) return

    try {
      const duration = 0.8
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime) // A5
      oscillator.type = 'sine'
      
      const volume = this.volume * 0.3
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(
        0.001, 
        this.audioContext.currentTime + duration
      )
      
      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
      
      oscillator.addEventListener('ended', () => {
        oscillator.disconnect()
        gainNode.disconnect()
      })
    } catch (error) {
      console.error('Failed to play ping:', error)
    }
  }

  // Attention tone - attention-grabbing but gentle
  async playAlert() {
    if (!this.isEnabled || !this.isAudioEnabled()) return
    
    await this.initAudio()
    if (!this.audioContext) return

    try {
      const duration = 0.4
      const frequencies = [523.25, 698.46] // C5 to F5 interval
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator()
        const gainNode = this.audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(this.audioContext.destination)
        
        oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime)
        oscillator.type = 'triangle'
        
        const volume = this.volume * 0.25
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + index * 0.2)
        gainNode.gain.exponentialRampToValueAtTime(
          0.001, 
          this.audioContext.currentTime + index * 0.2 + duration
        )
        
        oscillator.start(this.audioContext.currentTime + index * 0.2)
        oscillator.stop(this.audioContext.currentTime + index * 0.2 + duration)
        
        oscillator.addEventListener('ended', () => {
          oscillator.disconnect()
          gainNode.disconnect()
        })
      })
    } catch (error) {
      console.error('Failed to play alert:', error)
    }
  }
}

// Create singleton instance
export const soundManager = new SoundManager()