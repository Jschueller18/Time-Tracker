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
  }
}