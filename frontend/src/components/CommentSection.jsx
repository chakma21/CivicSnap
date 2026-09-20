import { useState } from 'react'
import axios from 'axios'
import './CommentSection.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function CommentSection({ issue, onCommentAdded }) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const comments = issue.comments || []

  const handlePost = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/issues/comment`, {
        issueId: issue.issueId,
        createdAt: issue.createdAt,
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username'),
        userEmail: localStorage.getItem('userEmail'),
        text,
      })
      onCommentAdded(issue.issueId, res.data.comments)
      setText('')
    } catch {
      // silently ignore; user can retry
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="comment-section">
      <button className="comment-toggle" onClick={() => setExpanded((v) => !v)}>
        💬 {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comment'}
      </button>

      {expanded && (
        <div className="comment-panel">
          {comments.length > 0 && (
            <div className="comment-list">
              {comments.map((c) => (
                <div key={c.commentId} className="comment-item">
                  <span className="comment-avatar">{(c.username || c.userEmail || '?')[0].toUpperCase()}</span>
                  <div className="comment-body">
                    <span className="comment-author">{c.username || c.userEmail}</span>
                    <span className="comment-text">{c.text}</span>
                    <span className="comment-time">{timeAgo(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form className="comment-form" onSubmit={handlePost}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={posting || !text.trim()}>Post</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default CommentSection
