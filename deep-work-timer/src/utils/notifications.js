// Notification utilities for the Deep Work Timer

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

export const showTimerCompleteNotification = (duration) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null
  }

  try {
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

    const notification = new Notification('Deep Work Timer Complete! 🎉', {
      body: `Your ${timeText} deep work session has finished. Time to take a break!`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'timer-complete',
      requireInteraction: true,
      silent: false,
      // These options help bypass ringer settings on some devices
      renotify: true,
      vibrate: [200, 100, 200, 100, 200]
    })

    // Focus the window when notification is clicked
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Don't auto-close - let it persist until user interacts
    // This helps ensure the user sees it even if they're away from the device
    
    return notification
  } catch (error) {
    console.error('Failed to show notification:', error)
    return null
  }
}

// Enhanced notification for persistent alerts
export const showPersistentTimerNotification = async (duration) => {
  // First try the regular notification
  const notification = showTimerCompleteNotification(duration)
  
  // If service worker is available, also send a persistent notification
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready
      
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      
      // Service worker notifications can persist even when app is closed
      await registration.showNotification('Deep Work Timer Complete! 🎉', {
        body: `Your ${timeText} deep work session has finished. Time to take a break!`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'timer-complete-sw',
        requireInteraction: true,
        silent: false,
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          {
            action: 'open',
            title: 'Open Timer'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        data: {
          duration: duration,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Failed to show service worker notification:', error)
    }
  }
  
  return notification
}