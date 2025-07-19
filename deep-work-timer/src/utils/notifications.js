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
      silent: false
    })

    // Focus the window when notification is clicked
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto-close after 10 seconds if user doesn't interact
    setTimeout(() => {
      notification.close()
    }, 10000)

    return notification
  } catch (error) {
    console.error('Failed to show notification:', error)
    return null
  }
}