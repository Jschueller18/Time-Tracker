// Enhanced Service Worker for Deep Work Timer
// Handles background notifications and timer persistence

const CACHE_NAME = 'deep-work-timer-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
      })
  )
})

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('deep-work-timer') && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
    )
  }
  // Dismiss action just closes the notification (already handled above)
})

// Handle background timer completion
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TIMER_COMPLETE') {
    const { duration } = event.data
    
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    
    // Show persistent notification even if app is backgrounded
    self.registration.showNotification('Deep Work Timer Complete! 🎉', {
      body: `Your ${timeText} deep work session has finished. Time to take a break!`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'timer-complete-bg',
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
  }
})

// Handle background sync for timer persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'timer-sync') {
    event.waitUntil(
      // Handle any background timer synchronization if needed
      console.log('Background sync for timer')
    )
  }
})