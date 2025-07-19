import Dexie from 'dexie'

export const db = new Dexie('DeepWorkTimer')

db.version(1).stores({
  sessions: '++id, startTime, duration, rating, notes'
})

// Helper functions for session management
export const sessionDB = {
  // Add a new session
  async addSession(session) {
    return await db.sessions.add({
      startTime: session.startTime,
      duration: session.duration,
      rating: session.rating,
      notes: session.notes || ''
    })
  },

  // Get all sessions
  async getAllSessions() {
    return await db.sessions.orderBy('startTime').reverse().toArray()
  },

  // Get today's sessions
  async getTodaySessions() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return await db.sessions
      .where('startTime')
      .between(today, tomorrow)
      .toArray()
  },

  // Calculate today's total minutes
  async getTodayTotal() {
    const todaySessions = await this.getTodaySessions()
    return todaySessions.reduce((total, session) => total + session.duration, 0)
  },

  // Update a session
  async updateSession(id, updates) {
    return await db.sessions.update(id, updates)
  },

  // Delete a session
  async deleteSession(id) {
    return await db.sessions.delete(id)
  },

  // Get sessions for a specific date range
  async getSessionsInRange(startDate, endDate) {
    return await db.sessions
      .where('startTime')
      .between(startDate, endDate)
      .toArray()
  },

  // Backup functionality
  async exportData() {
    try {
      const sessions = await this.getAllSessions()
      const settings = JSON.parse(localStorage.getItem('deepwork-settings') || '{}')
      
      const backup = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalSessions: sessions.length,
        sessions: sessions,
        settings: settings
      }
      
      return backup
    } catch (error) {
      throw new Error('Failed to export data: ' + error.message)
    }
  },

  async downloadBackup() {
    try {
      const backup = await this.exportData()
      const date = new Date().toISOString().split('T')[0]
      const filename = `deepwork-backup-${date}.json`
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      return filename
    } catch (error) {
      throw new Error('Failed to download backup: ' + error.message)
    }
  },

  async importData(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== 'application/json') {
        reject(new Error('Please select a valid JSON backup file'))
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result)
          
          // Validate backup format
          if (!backup.version || !backup.sessions || !Array.isArray(backup.sessions)) {
            reject(new Error('Invalid backup file format'))
            return
          }

          // Clear existing data
          await db.sessions.clear()
          
          // Import sessions
          if (backup.sessions.length > 0) {
            await db.sessions.bulkAdd(backup.sessions)
          }
          
          // Import settings
          if (backup.settings && typeof backup.settings === 'object') {
            localStorage.setItem('deepwork-settings', JSON.stringify(backup.settings))
          }

          resolve({
            sessionsImported: backup.sessions.length,
            settingsImported: !!backup.settings
          })
        } catch (error) {
          reject(new Error('Failed to parse backup file: ' + error.message))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read backup file'))
      reader.readAsText(file)
    })
  },

  // Auto-backup functionality
  shouldTriggerAutoBackup() {
    const backupCounters = JSON.parse(localStorage.getItem('deepwork-backup-counters') || '{}')
    const lastMonthlyBackup = new Date(backupCounters.lastMonthlyBackup || 0)
    const sessionsCompleted = backupCounters.sessionsCompleted || 0
    const now = new Date()
    
    // Check if a month has passed since last backup
    const monthInMs = 30 * 24 * 60 * 60 * 1000
    const monthlyBackupDue = (now - lastMonthlyBackup) >= monthInMs
    
    // Check if 50 sessions have been completed since last backup
    const sessionBackupDue = sessionsCompleted >= 50
    
    return { monthlyBackupDue, sessionBackupDue }
  },

  incrementSessionCounter() {
    const backupCounters = JSON.parse(localStorage.getItem('deepwork-backup-counters') || '{}')
    backupCounters.sessionsCompleted = (backupCounters.sessionsCompleted || 0) + 1
    localStorage.setItem('deepwork-backup-counters', JSON.stringify(backupCounters))
  },

  resetBackupCounters() {
    const backupCounters = JSON.parse(localStorage.getItem('deepwork-backup-counters') || '{}')
    backupCounters.sessionsCompleted = 0
    backupCounters.lastMonthlyBackup = new Date().toISOString()
    localStorage.setItem('deepwork-backup-counters', JSON.stringify(backupCounters))
  },

  async triggerAutoBackup() {
    try {
      await this.downloadBackup()
      this.resetBackupCounters()
      return true
    } catch (error) {
      console.error('Auto-backup failed:', error)
      return false
    }
  }
}