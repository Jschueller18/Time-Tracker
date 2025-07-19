import { useState, useEffect } from 'react'
import { sessionDB } from '../db/database'

function History() {
  const [sessions, setSessions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editRating, setEditRating] = useState(3)
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, sessionId: null, sessionInfo: null })

  useEffect(() => {
    // Load sessions from IndexedDB
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const allSessions = await sessionDB.getAllSessions()
      setSessions(allSessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const startEdit = (session) => {
    setEditingId(session.id)
    setEditRating(session.rating)
    setEditNotes(session.notes || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRating(3)
    setEditNotes('')
  }

  const saveEdit = async (sessionId) => {
    setIsSaving(true)
    try {
      await sessionDB.updateSession(sessionId, {
        rating: editRating,
        notes: editNotes.trim()
      })
      setEditingId(null)
      loadSessions()
    } catch (error) {
      console.error('Failed to update session:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const showDeleteConfirm = (session) => {
    setDeleteConfirm({ 
      show: true, 
      sessionId: session.id,
      sessionInfo: {
        date: new Date(session.startTime).toLocaleDateString(),
        duration: formatDuration(session.duration),
        rating: getRatingEmoji(session.rating)
      }
    })
  }

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, sessionId: null, sessionInfo: null })
  }

  const confirmDelete = async () => {
    try {
      await sessionDB.deleteSession(deleteConfirm.sessionId)
      setDeleteConfirm({ show: false, sessionId: null, sessionInfo: null })
      // Reload sessions after deletion
      loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getRatingEmoji = (rating) => {
    const emojis = ['', '😢', '🙁', '😐', '🙂', '😄']
    return emojis[rating] || '😐'
  }

  const ratingEmojis = ['😢', '🙁', '😐', '🙂', '😄']

  return (
    <div className="history-container">
      <h2>Session History</h2>
      {sessions.length === 0 ? (
        <p>No sessions yet. Start your first deep work session!</p>
      ) : (
        <div className="sessions-list">
          {sessions.map(session => (
            <div key={session.id} className="session-item">
              <div className="session-header">
                <span className="session-date">
                  {new Date(session.startTime).toLocaleDateString()}
                </span>
                {editingId === session.id ? (
                  <div className="edit-rating">
                    <div className="rating-buttons">
                      {ratingEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          className={`rating-button small ${editRating === index + 1 ? 'selected' : ''}`}
                          onClick={() => setEditRating(index + 1)}
                          disabled={isSaving}
                        >
                          <span className="rating-emoji">{emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="session-rating">
                    {getRatingEmoji(session.rating)}
                  </span>
                )}
              </div>
              <div className="session-details">
                <span className="session-duration">
                  {formatDuration(session.duration)}
                </span>
                <span className="session-time">
                  {new Date(session.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {editingId === session.id ? (
                <div className="edit-notes">
                  <textarea
                    className="edit-notes-input"
                    placeholder="Session notes (optional)"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    disabled={isSaving}
                    rows={3}
                  />
                </div>
              ) : (
                session.notes && (
                  <div className="session-notes">
                    {session.notes}
                  </div>
                )
              )}
              <div className="session-actions">
                {editingId === session.id ? (
                  <>
                    <button 
                      className="save-btn"
                      onClick={() => saveEdit(session.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={cancelEdit}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="edit-btn"
                      onClick={() => startEdit(session)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => showDeleteConfirm(session)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {deleteConfirm.show && (
        <div className="delete-confirm-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Session?</h3>
            </div>
            <p>Are you sure you want to delete this session?</p>
            
            <div className="session-preview">
              <div className="preview-item">
                <strong>Date:</strong> {deleteConfirm.sessionInfo.date}
              </div>
              <div className="preview-item">
                <strong>Duration:</strong> {deleteConfirm.sessionInfo.duration}
              </div>
              <div className="preview-item">
                <strong>Rating:</strong> {deleteConfirm.sessionInfo.rating}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-delete-button"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-button"
                onClick={confirmDelete}
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History