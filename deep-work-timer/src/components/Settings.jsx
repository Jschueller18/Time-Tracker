import { useState, useEffect } from 'react'
import { soundManager } from '../utils/sounds'

function Settings({ isVisible, onClose }) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [defaultDuration, setDefaultDuration] = useState({ hours: 0, minutes: 25 })

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('deepwork-settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setSoundEnabled(settings.soundEnabled ?? true)
        setNotificationsEnabled(settings.notificationsEnabled ?? false)
        setDefaultDuration(settings.defaultDuration ?? { hours: 0, minutes: 25 })
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    // Check current notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [isVisible])

  const saveSettings = () => {
    const settings = {
      soundEnabled,
      notificationsEnabled,
      defaultDuration
    }
    
    localStorage.setItem('deepwork-settings', JSON.stringify(settings))
    soundManager.setEnabled(soundEnabled)
    onClose()
  }

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      // Request permission
      const granted = await Notification.requestPermission()
      setNotificationsEnabled(granted === 'granted')
    } else {
      // Can't revoke programmatically, just disable in our app
      setNotificationsEnabled(false)
    }
  }

  const testSound = () => {
    // For testing, just play a single chime, not the persistent alarm
    soundManager.playChime()
  }

  if (!isVisible) return null

  return (
    <div className="settings-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-section">
          <h4>Notifications</h4>
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
              />
              <span className="checkmark"></span>
              Browser notifications when timer completes
            </label>
            <p className="setting-description">
              Get notified even when the app is in the background
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h4>Sound</h4>
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span className="checkmark"></span>
              Sound alerts when timer completes
            </label>
            <div className="setting-actions">
              <button 
                className="test-sound-button"
                onClick={testSound}
                disabled={!soundEnabled}
              >
                Test Sound
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h4>Default Timer Duration</h4>
          <div className="setting-item">
            <div className="duration-picker">
              <div className="duration-input">
                <label>Hours</label>
                <select 
                  value={defaultDuration.hours} 
                  onChange={(e) => setDefaultDuration(prev => ({
                    ...prev, 
                    hours: parseInt(e.target.value)
                  }))}
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="duration-input">
                <label>Minutes</label>
                <select 
                  value={defaultDuration.minutes} 
                  onChange={(e) => setDefaultDuration(prev => ({
                    ...prev, 
                    minutes: parseInt(e.target.value)
                  }))}
                >
                  {[...Array(60)].map((_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="save-button" onClick={saveSettings}>
            Save Settings
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings