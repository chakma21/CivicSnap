import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import CommentSection from '../components/CommentSection'
import './Feed.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const CATEGORIES = ['all', 'road', 'garbage', 'streetlight', 'water', 'other']

function Feed({ userRole }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const loadIssues = () => {
    axios.get(`${API_BASE_URL}/issues`)
      .then((res) => setIssues(res.data.issues))
      .catch(() => setError('Could not load issues right now.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadIssues()
  }, [])

  const userId = localStorage.getItem('userId')

  const handleUpvote = async (issue) => {
    const currentlyUpvoted = (issue.upvotedBy || []).includes(userId)
    setIssues((prev) => prev.map((i) => {
      if (i.issueId !== issue.issueId) return i
      const upvotedBy = currentlyUpvoted
        ? (i.upvotedBy || []).filter((id) => id !== userId)
        : [...(i.upvotedBy || []), userId]
      return { ...i, upvotedBy }
    }))
    try {
      await axios.post(`${API_BASE_URL}/issues/upvote`, { issueId: issue.issueId, createdAt: issue.createdAt, userId })
    } catch {
      loadIssues()
    }
  }

  const handleCommentAdded = (issueId, comments) => {
    setIssues((prev) => prev.map((i) => i.issueId === issueId ? { ...i, comments } : i))
  }

  const userRegion = (localStorage.getItem('userRegion') || '').trim().toLowerCase()
  const regionIssues = userRole === 'municipality' && userRegion
    ? issues.filter((issue) => (issue.wardId || '').trim().toLowerCase() === userRegion)
    : issues

  const visibleIssues = useMemo(() => {
    let result = regionIssues
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((i) => i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
    }
    result = [...result].sort((a, b) => sortBy === 'upvotes' ? (b.upvotedBy?.length || 0) - (a.upvotedBy?.length || 0) : b.createdAt - a.createdAt)
    return result
  }, [regionIssues, categoryFilter, search, sortBy])

  return (
    <div className="feed-container">
      <h1>{userRole === 'citizen' ? 'Community Issues' : 'Reported Issues'}</h1>
      {userRole === 'municipality' && !userRegion && (
        <p className="empty-state">
          Set your region/ward in <Link to="/profile">Manage Profile</Link> to see issues for your area.
        </p>
      )}
      {userRole === 'municipality' && userRegion && (
        <p className="region-label">Showing issues for: <strong>{localStorage.getItem('userRegion')}</strong></p>
      )}
      {(userRole === 'citizen' || userRegion) && (
        <>
          <div className="feed-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="upvotes">Most upvoted</option>
            </select>
          </div>
          <div className="category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`category-tab ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="empty-state">{error}</p>
          ) : visibleIssues.length === 0 ? (
            <p className="empty-state">
              {regionIssues.length === 0 ? 'No issues yet. Be the first to report!' : 'No issues match your search/filter.'}
            </p>
          ) : (
            <div className="issues-list">
              {visibleIssues.map((issue) => (
                <div key={issue.issueId} className="issue-card">
                  {issue.photoUrl && (
                    <img src={issue.photoUrl} alt={issue.title} className="issue-photo" />
                  )}
                  <div className="issue-card-header">
                    <h3>{issue.title}</h3>
                    <span className={`status-badge status-${issue.status}`}>{issue.status}</span>
                  </div>
                  <p>{issue.description}</p>
                  {issue.aiAnalysis && (
                    <div className="ai-badge">
                      🤖 AI: {issue.aiAnalysis.summary} (severity: {issue.aiAnalysis.severity})
                    </div>
                  )}
                  {issue.proofPhotoUrl && (
                    <div className="proof-photo-block">
                      <span className="proof-photo-label">✅ Proof of resolution</span>
                      <img src={issue.proofPhotoUrl} alt="Proof of resolution" className="issue-photo" />
                    </div>
                  )}
                  <div className="issue-card-meta">
                    <span>{issue.category}</span>
                    <span>{issue.wardId}</span>
                    <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    className={`upvote-button ${(issue.upvotedBy || []).includes(userId) ? 'upvoted' : ''}`}
                    onClick={() => handleUpvote(issue)}
                  >
                    👍 {(issue.upvotedBy || []).length}
                  </button>
                  <CommentSection issue={issue} onCommentAdded={handleCommentAdded} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Feed
