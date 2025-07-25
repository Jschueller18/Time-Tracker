import { useEffect, useState, useRef } from 'react'
import { sessionDB } from '../db/database'
import { requestNotificationPermission, showPersistentTimerNotification } from '../utils/notifications'
import { soundManager } from '../utils/sounds'
import { saveTimerState, loadTimerState, clearTimerState, createTimerState } from '../utils/timerPersistence'
import { getRandomQuote } from '../utils/quotes'

function Timer({
  hours, setHours,
  minutes, setMinutes,
  isRunning, setIsRunning,
  timeLeft, setTimeLeft,
  isPaused, setIsPaused,
  showSessionComplete, setShowSessionComplete,
  intervalRef, startTimeRef, pausedTimeRef,
  onSessionSaved
}) {
  const [rating, setRating] = useState(3)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentQuote, setCurrentQuote] = useState(getRandomQuote())
  const originalDurationRef = useRef(null)
  const originalHoursRef = useRef(null)
  const originalMinutesRef = useRef(null)

  // Request notification permission on component mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Restore timer state on page load
  useEffect(() => {
    const savedState = loadTimerState()
    if (savedState) {
      // First set the timer values
      setHours(savedState.hours)
      setMinutes(savedState.minutes)
      setTimeLeft(savedState.timeLeft)
      
      // Then set the running state to prevent recalculation with wrong values
      setIsRunning(savedState.isRunning)
      setIsPaused(savedState.isPaused)
      
      if (savedState.startTime) {
        startTimeRef.current = savedState.startTime
      }
      if (savedState.pausedTime) {
        pausedTimeRef.current = savedState.pausedTime
      }
      
      // Store original values for timer calculations
      originalDurationRef.current = savedState.originalDuration || (savedState.hours * 60 + savedState.minutes) * 60
      originalHoursRef.current = savedState.hours
      originalMinutesRef.current = savedState.minutes
      
      // If timer completed while page was closed
      if (savedState.shouldShowCompletion) {
        setShowSessionComplete(true)
        soundManager.playCompletionSound()
        showPersistentTimerNotification(savedState.hours * 60 + savedState.minutes)
        clearTimerState() // Clear the saved state since timer is complete
      }
    }
  }, [])

  // Stop alarm when modal becomes visible (user can see it's complete)
  useEffect(() => {
    if (showSessionComplete) {
      // Give user 5 seconds to see the completion, then they can manually stop
      // This gives them a moment to realize the session is complete
      const stopTimer = setTimeout(() => {
        // Don't auto-stop, let user control it
      }, 5000)
      
      return () => clearTimeout(stopTimer)
    }
  }, [showSessionComplete])

  const startTimer = () => {
    const totalMinutes = hours * 60 + minutes
    if (totalMinutes > 0) {
      const totalSeconds = totalMinutes * 60
      setTimeLeft(totalSeconds)
      setIsRunning(true)
      setIsPaused(false)
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      
      // Store original values for calculations
      originalDurationRef.current = totalSeconds
      originalHoursRef.current = hours
      originalMinutesRef.current = minutes
      
      // Save timer state
      const timerState = createTimerState(
        hours, minutes, true, false, totalSeconds, 
        startTimeRef.current, pausedTimeRef.current, originalDurationRef.current
      )
      saveTimerState(timerState)
      
      // Initialize audio context on user interaction
      if (soundManager.isAudioEnabled()) {
        soundManager.initAudio()
      }
    }
  }

  const pauseTimer = () => {
    setIsPaused(true)
    if (startTimeRef.current) {
      pausedTimeRef.current += Date.now() - startTimeRef.current
    }
    
    // Save paused state
    const timerState = createTimerState(
      hours, minutes, true, true, timeLeft, 
      startTimeRef.current, pausedTimeRef.current, originalDurationRef.current
    )
    saveTimerState(timerState)
  }

  const resumeTimer = () => {
    setIsPaused(false)
    startTimeRef.current = Date.now()
    
    // Save resumed state
    const timerState = createTimerState(
      hours, minutes, true, false, timeLeft, 
      startTimeRef.current, pausedTimeRef.current, originalDurationRef.current
    )
    saveTimerState(timerState)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setTimeLeft(0)
    setShowSessionComplete(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    startTimeRef.current = null
    pausedTimeRef.current = 0
    originalDurationRef.current = null
    originalHoursRef.current = null
    originalMinutesRef.current = null
    
    // Clear saved timer state
    clearTimerState()
  }

  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current + pausedTimeRef.current) / 1000)
        const originalDuration = originalDurationRef.current || (hours * 60 + minutes) * 60
        const remaining = Math.max(0, originalDuration - elapsed)
        
        setTimeLeft(remaining)
        
        // Periodically save timer state (every 5 seconds to avoid too frequent saves)
        if (Math.floor(remaining) % 5 === 0) {
          const timerState = createTimerState(
            originalHoursRef.current || hours, originalMinutesRef.current || minutes, true, false, remaining, 
            startTimeRef.current, pausedTimeRef.current, originalDurationRef.current
          )
          saveTimerState(timerState)
        }
        
        if (remaining === 0) {
          setIsRunning(false)
          setIsPaused(false)
          setShowSessionComplete(true)
          
          // Play sound and show notification
          const sessionDuration = hours * 60 + minutes
          soundManager.playCompletionSound()
          showPersistentTimerNotification(sessionDuration)
          
          // Send message to service worker for background notification
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'TIMER_COMPLETE',
              duration: sessionDuration
            })
          }
          
          // Clear saved timer state since timer is complete
          clearTimerState()
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, 100)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused, hours, minutes])

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Check if timer is in final minute
  const isLastMinute = timeLeft > 0 && timeLeft <= 60

  // Add document title updates for better UX
  useEffect(() => {
    if (isRunning && !isPaused) {
      document.title = `${formatTime(timeLeft)} - Deep Work Timer`
    } else if (showSessionComplete) {
      document.title = 'Session Complete! - Deep Work Timer'
    } else {
      document.title = 'Deep Work Timer'
    }
    
    return () => {
      document.title = 'Deep Work Timer'
    }
  }, [isRunning, isPaused, timeLeft, showSessionComplete])

  // Cleanup alarm on component unmount
  useEffect(() => {
    return () => {
      soundManager.stopAlarm()
    }
  }, [])

  const saveSession = async () => {
    setIsSaving(true)
    // Stop the alarm when user interacts with modal
    soundManager.stopAlarm()
    
    try {
      const sessionDuration = hours * 60 + minutes
      const sessionData = {
        startTime: new Date(startTimeRef.current),
        duration: sessionDuration,
        rating: rating,
        notes: notes.trim()
      }
      
      await sessionDB.addSession(sessionData)
      
      // Reset modal state
      setRating(3)
      setNotes('')
      setShowSessionComplete(false)
      
      // Clear timer state since session is saved
      clearTimerState()
      
      // Notify parent component
      if (onSessionSaved) {
        onSessionSaved()
      }
    } catch (error) {
      console.error('Failed to save session:', error)
    } finally {
      setIsSaving(false)
    }
  }



  const stopAlarmOnly = () => {
    // Just stop the alarm without closing modal
    soundManager.stopAlarm()
  }

  const ratingEmojis = ['😢', '🙁', '😐', '🙂', '😄']
  const ratingLabels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

  return (
    <div className="timer-container">
      {!isRunning ? (
        <div className="time-picker">
          <h2>Set Timer</h2>
          <div className="wheel-picker">
            <div className="wheel-container">
              <div className="wheel-column">
                <div className="wheel-label">Hours</div>
                <div className="wheel-scroll" data-type="hours">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`wheel-item ${hours === i ? 'selected' : ''}`}
                      onClick={() => setHours(i)}
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>
              <div className="wheel-separator">:</div>
              <div className="wheel-column">
                <div className="wheel-label">Minutes</div>
                <div className="wheel-scroll" data-type="minutes">
                  {[...Array(60)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`wheel-item ${minutes === i ? 'selected' : ''}`}
                      onClick={() => setMinutes(i)}
                    >
                      {i.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="quote-container">
            <div className="quote-text">"{currentQuote.text}"</div>
            <button 
              className="new-quote-button"
              onClick={() => setCurrentQuote(getRandomQuote())}
              title="Get new quote"
            >
              💫
            </button>
          </div>
          
          <button 
            className="start-button"
            onClick={startTimer} 
            disabled={hours === 0 && minutes === 0}
          >
            Start Timer
          </button>
        </div>
      ) : (
        <div className="timer-display">
          <h1 className={`timer-time ${isLastMinute ? 'timer-urgent' : ''}`}>
            {formatTime(timeLeft)}
          </h1>
          {isLastMinute && !isPaused && (
            <div className="timer-warning">
              Final minute! 🔥
            </div>
          )}
          <div className="timer-controls">
            {!isPaused ? (
              <button className="pause-button" onClick={pauseTimer}>Pause</button>
            ) : (
              <>
                <button className="resume-button" onClick={resumeTimer}>Resume</button>
                <button className="stop-button" onClick={resetTimer}>Stop</button>
              </>
            )}
          </div>
        </div>
      )}
      
      {showSessionComplete && (
        <div className="session-complete-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Session Complete!</h3>
              <button 
                className="stop-sound-button"
                onClick={stopAlarmOnly}
                title="Stop notification sound"
              >
                🔇
              </button>
            </div>
            <p>Great work! Your {hours > 0 ? `${hours}h ` : ''}{minutes}m deep work session is finished.</p>
            
            <div className="rating-section">
              <label>How was your session?</label>
              <div className="rating-buttons">
                {ratingEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    className={`rating-button ${rating === index + 1 ? 'selected' : ''}`}
                    onClick={() => setRating(index + 1)}
                    disabled={isSaving}
                  >
                    <span className="rating-emoji">{emoji}</span>
                    <span className="rating-label">{ratingLabels[index]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="notes-section">
              <label htmlFor="session-notes">Session notes (optional)</label>
              <textarea
                id="session-notes"
                className="session-notes"
                placeholder="How did this session go? Any insights or reflections..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="save-session-button"
                onClick={saveSession}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Timer