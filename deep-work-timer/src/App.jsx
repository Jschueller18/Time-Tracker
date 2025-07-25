import { useState, useEffect, useRef } from 'react'
import Timer from './components/Timer'
import History from './components/History'
import Data from './components/Data'
import Settings from './components/Settings'
import { sessionDB } from './db/database'
import { soundManager } from './utils/sounds'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('timer')
  const [todayTotal, setTodayTotal] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  
  // Timer state moved to App level for persistence
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(25)
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showSessionComplete, setShowSessionComplete] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const pausedTimeRef = useRef(0)

  // Load today's total and settings from database on app start
  useEffect(() => {
    loadTodayTotal()
    loadSettings()
  }, [])

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('deepwork-settings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        if (settings.defaultDuration) {
          setHours(settings.defaultDuration.hours)
          setMinutes(settings.defaultDuration.minutes)
        }
        // Load sound settings
        if (typeof settings.soundEnabled === 'boolean') {
          soundManager.setEnabled(settings.soundEnabled)
        }
        if (typeof settings.volume === 'number') {
          soundManager.setVolume(settings.volume / 100)
        }
        if (settings.soundType) {
          soundManager.setSoundType(settings.soundType)
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadTodayTotal = async () => {
    try {
      const total = await sessionDB.getTodayTotal()
      setTodayTotal(total)
    } catch (error) {
      console.error('Failed to load today\'s total:', error)
    }
  }

  const handleSessionSaved = async () => {
    // Reload today's total when a session is saved
    loadTodayTotal()
    
    // Increment session counter for auto-backup
    sessionDB.incrementSessionCounter()
    
    // Check if auto-backup should be triggered
    const { monthlyBackupDue, sessionBackupDue } = sessionDB.shouldTriggerAutoBackup()
    
    if (monthlyBackupDue || sessionBackupDue) {
      console.log('Triggering auto-backup...', { monthlyBackupDue, sessionBackupDue })
      const success = await sessionDB.triggerAutoBackup()
      if (success) {
        console.log('Auto-backup completed successfully')
      }
    }
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Deep Work Timer</h1>
        <div className="header-actions">
          <div className="today-total">
            Today: {formatTime(todayTotal)}
          </div>
          <button 
            className="settings-button"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'timer' && (
          <Timer 
            hours={hours}
            setHours={setHours}
            minutes={minutes}
            setMinutes={setMinutes}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            timeLeft={timeLeft}
            setTimeLeft={setTimeLeft}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            showSessionComplete={showSessionComplete}
            setShowSessionComplete={setShowSessionComplete}
            intervalRef={intervalRef}
            startTimeRef={startTimeRef}
            pausedTimeRef={pausedTimeRef}
            onSessionSaved={handleSessionSaved}
          />
        )}
        {currentView === 'history' && <History />}
        {currentView === 'data' && <Data />}
      </main>

      <Settings 
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <nav className="app-nav">
        <button 
          className={currentView === 'timer' ? 'active' : ''}
          onClick={() => setCurrentView('timer')}
        >
          Timer
        </button>
        <button 
          className={currentView === 'history' ? 'active' : ''}
          onClick={() => setCurrentView('history')}
        >
          History
        </button>
        <button 
          className={currentView === 'data' ? 'active' : ''}
          onClick={() => setCurrentView('data')}
        >
          Data
        </button>
      </nav>
    </div>
  )
}

export default App
