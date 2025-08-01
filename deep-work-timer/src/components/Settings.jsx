import { useState, useEffect, useRef } from 'react'
import { soundManager } from '../utils/sounds'
import { sessionDB } from '../db/database'

function Settings({ isVisible, onClose }) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [defaultDuration, setDefaultDuration] = useState({ hours: 0, minutes: 25 })
  const [volume, setVolume] = useState(50)
  const [soundType, setSoundType] = useState('chime')
  const [backupStatus, setBackupStatus] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('deepwork-settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setSoundEnabled(settings.soundEnabled ?? true)
        setNotificationsEnabled(settings.notificationsEnabled ?? false)
        setDefaultDuration(settings.defaultDuration ?? { hours: 0, minutes: 25 })
        setVolume(settings.volume ?? 50)
        setSoundType(settings.soundType ?? 'chime')
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
      defaultDuration,
      volume,
      soundType
    }
    
    localStorage.setItem('deepwork-settings', JSON.stringify(settings))
    soundManager.setEnabled(soundEnabled)
    soundManager.setVolume(volume / 100) // Convert percentage to 0-1 range
    soundManager.setSoundType(soundType)
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

  const testSound = async () => {
    console.log('Test sound button clicked')
    
    // Update sound manager with current settings before testing
    soundManager.setEnabled(soundEnabled)
    soundManager.setVolume(volume / 100)
    soundManager.setSoundType(soundType)
    
    // Test the sound - this includes better error handling and logging
    const success = await soundManager.testSound()
    if (!success) {
      console.error('Sound test failed - check console for details')
      // Could show user feedback here
    }
  }

  const handleExportData = async () => {
    try {
      setBackupStatus('Exporting data...')
      const filename = await sessionDB.downloadBackup()
      setBackupStatus(`✓ Data exported successfully: ${filename}`)
      setTimeout(() => setBackupStatus(''), 3000)
    } catch (error) {
      setBackupStatus(`✗ Export failed: ${error.message}`)
      setTimeout(() => setBackupStatus(''), 5000)
    }
  }

  const handleImportData = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const confirmRestore = window.confirm(
      'This will replace all your current data (sessions and settings) with the backup data. Are you sure you want to continue?'
    )
    
    if (!confirmRestore) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    try {
      setBackupStatus('Importing data...')
      const result = await sessionDB.importData(file)
      setBackupStatus(`✓ Data imported successfully: ${result.sessionsImported} sessions restored`)
      
      // Reload the page to reflect imported settings
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      setBackupStatus(`✗ Import failed: ${error.message}`)
      setTimeout(() => setBackupStatus(''), 5000)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
          </div>
          
          {soundEnabled && (
            <>
              <div className="setting-item">
                <label className="setting-label">Sound Type</label>
                <select 
                  value={soundType} 
                  onChange={(e) => setSoundType(e.target.value)}
                  className="sound-type-select"
                >
                  <option value="chime">Gentle Chime</option>
                  <option value="beep">Alert Beep</option>
                  <option value="bell">Bell Ring</option>
                  <option value="ping">Soft Ping</option>
                  <option value="alert">Attention Tone</option>
                </select>
              </div>
              
              <div className="setting-item">
                <label className="setting-label">Volume: {volume}%</label>
                <div className="volume-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="volume-slider"
                  />
                  <div className="volume-labels">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              <div className="setting-actions">
                <button 
                  className="test-sound-button"
                  onClick={testSound}
                >
                  Test Sound
                </button>
              </div>
            </>
          )}
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

        <div className="settings-section">
          <h4>Data Backup</h4>
          <div className="setting-item">
            <p className="setting-description">
              Export your sessions and settings to a backup file, or restore from a previous backup.
            </p>
            <div className="backup-controls">
              <button 
                className="backup-button export-button"
                onClick={handleExportData}
              >
                📁 Export My Data
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
              <button 
                className="backup-button import-button"
                onClick={() => fileInputRef.current?.click()}
              >
                📂 Import Backup
              </button>
            </div>
            {backupStatus && (
              <div className={`backup-status ${backupStatus.includes('✓') ? 'success' : 'error'}`}>
                {backupStatus}
              </div>
            )}
            <p className="setting-description">
              Auto-backup: Data is automatically backed up every 50 completed sessions or once per month.
            </p>
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