// Timer persistence utilities for maintaining timer state across page refreshes

const TIMER_STORAGE_KEY = 'deepWorkTimer_state'

export const saveTimerState = (timerState) => {
  try {
    const stateToSave = {
      ...timerState,
      savedAt: Date.now()
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (error) {
    console.error('Failed to save timer state:', error)
  }
}

export const loadTimerState = () => {
  try {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!saved) return null
    
    const state = JSON.parse(saved)
    
    // Check if timer was running and calculate current position
    if (state.isRunning && !state.isPaused) {
      const now = Date.now()
      const totalElapsed = Math.floor((now - state.startTime + state.pausedTime) / 1000)
      const originalDuration = state.originalDuration || (state.hours * 60 + state.minutes) * 60
      const timeLeft = Math.max(0, originalDuration - totalElapsed)
      
      // If timer should have completed while page was closed
      if (timeLeft === 0) {
        return {
          ...state,
          timeLeft: 0,
          isRunning: false,
          isPaused: false,
          shouldShowCompletion: true
        }
      }
      
      return {
        ...state,
        timeLeft,
        startTime: state.startTime, // Keep original start time
        pausedTime: state.pausedTime
      }
    }
    
    return state
  } catch (error) {
    console.error('Failed to load timer state:', error)
    return null
  }
}

export const clearTimerState = () => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear timer state:', error)
  }
}

export const createTimerState = (hours, minutes, isRunning, isPaused, timeLeft, startTime, pausedTime, originalDuration = null) => {
  return {
    hours,
    minutes,
    isRunning,
    isPaused,
    timeLeft,
    startTime,
    pausedTime,
    originalDuration: originalDuration || (hours * 60 + minutes) * 60
  }
}