import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search, Plus } from 'lucide-react'
import ComplaintsModal from '../components/ComplaintsModal'
import IssueCard from '../components/IssueCard'
import SkeletonCard from '../components/SkeletonCard'
import { matchesRegion } from '../utils/region'
import { CATEGORIES, categoryMeta } from '../utils/categories'
import { haversineMeters } from '../utils/geo'
import './Feed.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function Feed({ userRole }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [activeComplaintIssue, setActiveComplaintIssue] = useState(null)
  const [myLocation, setMyLocation] = useState(null)
  const [locatingForSort, setLocatingForSort] = useState(false)
  const cardRefs = useRef({})

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
  const username = localStorage.getItem('username') || localStorage.getItem('userEmail') || 'Anonymous'

  const handleSortChange = (value) => {
    setSortBy(value)
    if (value === 'nearest' && !myLocation && navigator.geolocation) {
      setLocatingForSort(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLocation([pos.coords.latitude, pos.coords.longitude])
          setLocatingForSort(false)
        },
        () => setLocatingForSort(false),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    }
  }

  const handleComplain = async (issue) => {
    const currentlyComplained = (issue.upvotedBy || []).includes(userId)
    const upvotedBy = currentlyComplained
      ? (issue.upvotedBy || []).filter((id) => id !== userId)
      : [...(issue.upvotedBy || []), userId]
    const upvoterNames = { ...(issue.upvoterNames || {}) }
    if (currentlyComplained) {
      delete upvoterNames[userId]
    } else {
      upvoterNames[userId] = username
    }

    const updatedIssue = { ...issue, upvotedBy, upvoterNames }
    setIssues((prev) => prev.map((i) => (i.issueId === issue.issueId ? updatedIssue : i)))
    setActiveComplaintIssue(updatedIssue)

    try {
      await axios.post(`${API_BASE_URL}/issues/upvote`, { issueId: issue.issueId, createdAt: issue.createdAt, userId, username })
    } catch {
      loadIssues()
    }
  }

  const handleCommentAdded = (issueId, comments) => {
    setIssues((prev) => prev.map((i) => i.issueId === issueId ? { ...i, comments } : i))
  }

  const userRegion = localStorage.getItem('userRegion') || ''
  const regionIssues = userRole === 'municipality' && userRegion
    ? issues.filter((issue) => matchesRegion(issue.wardId, userRegion))
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
    if (sortBy === 'nearest' && myLocation) {
      result = [...result]
        .filter((i) => i.lat != null && i.lng != null)
        .sort((a, b) => haversineMeters(myLocation, [a.lat, a.lng]) - haversineMeters(myLocation, [b.lat, b.lng]))
    } else if (sortBy === 'upvotes') {
      result = [...result].sort((a, b) => (b.upvotedBy?.length || 0) - (a.upvotedBy?.length || 0))
    } else {
      result = [...result].sort((a, b) => b.createdAt - a.createdAt)
    }
    return result
  }, [regionIssues, categoryFilter, search, sortBy, myLocation])

  // One story bubble per unique ward/area (most recent report there), so a busy
  // ward doesn't repeat itself across the whole strip.
  const recentStories = useMemo(() => {
    const sorted = [...regionIssues].sort((a, b) => b.createdAt - a.createdAt)
    const seen = new Set()
    const unique = []
    for (const issue of sorted) {
      const key = (issue.wardId || 'unknown').trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(issue)
      if (unique.length >= 12) break
    }
    return unique
  }, [regionIssues])

  const scrollToCard = (issueId) => {
    cardRefs.current[issueId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="feed-container">
      <h1>{userRole === 'citizen' ? 'Community Issues' : 'Reported Issues'}</h1>
      {userRole === 'municipality' && !userRegion && (
        <p className="empty-state">
          Set your region/ward in <Link to="/profile">Manage Profile</Link> to see issues for your area.
        </p>
      )}
      {userRole === 'municipality' && userRegion && (
        <p className="region-label">Showing issues for: <strong>{userRegion}</strong></p>
      )}
      {(userRole === 'citizen' || userRegion) && (
        <>
          {recentStories.length > 0 && (
            <div className="story-strip">
              <Link to="/report" className="story" aria-label="Report a new issue">
                <span className="story-ring story-ring-new">
                  <span className="story-avatar story-avatar-new">
                    <Plus size={20} strokeWidth={2.5} />
                  </span>
                </span>
                <span className="story-label">Report</span>
              </Link>
              {recentStories.map((issue) => {
                const meta = categoryMeta(issue.category)
                const Icon = meta.icon
                return (
                  <button
                    key={issue.issueId}
                    className="story"
                    onClick={() => scrollToCard(issue.issueId)}
                  >
                    <span className="story-ring">
                      {issue.photoUrl ? (
                        <img src={issue.photoUrl} alt={issue.title} className="story-avatar story-avatar-photo" />
                      ) : (
                        <span className="story-avatar" style={{ background: meta.color }}>
                          <Icon size={20} color="#fff" strokeWidth={2.2} />
                        </span>
                      )}
                    </span>
                    <span className="story-label">{issue.wardId || meta.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="feed-controls">
            <div className="search-wrap">
              <Search size={16} className="search-icon" strokeWidth={2.2} />
              <input
                type="text"
                className="search-input"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="sort-select" value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="upvotes">Most complaints</option>
              <option value="nearest">{locatingForSort ? 'Locating...' : 'Nearest to me'}</option>
            </select>
          </div>
          <div className="category-tabs">
            {CATEGORIES.map((cat) => {
              const Icon = cat === 'all' ? null : categoryMeta(cat).icon
              return (
                <button
                  key={cat}
                  className={`category-tab ${categoryFilter === cat ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {Icon && <Icon size={13} strokeWidth={2.2} />}
                  {cat === 'all' ? 'All' : categoryMeta(cat).label}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="issues-list">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard withPhoto={false} />
            </div>
          ) : error ? (
            <p className="empty-state">{error}</p>
          ) : visibleIssues.length === 0 ? (
            <p className="empty-state">
              {regionIssues.length === 0 ? 'No issues yet. Be the first to report!' : 'No issues match your search/filter.'}
            </p>
          ) : (
            <div className="issues-list">
              {visibleIssues.map((issue) => (
                <IssueCard
                  key={issue.issueId}
                  issue={issue}
                  userId={userId}
                  cardRef={(el) => { cardRefs.current[issue.issueId] = el }}
                  distanceMeters={sortBy === 'nearest' && myLocation && issue.lat != null
                    ? haversineMeters(myLocation, [issue.lat, issue.lng])
                    : null}
                  onComplain={handleComplain}
                  onCommentAdded={handleCommentAdded}
                  onOpenComplaints={setActiveComplaintIssue}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeComplaintIssue && (
        <ComplaintsModal
          issue={activeComplaintIssue}
          names={Object.values(activeComplaintIssue.upvoterNames || {})}
          onClose={() => setActiveComplaintIssue(null)}
        />
      )}
    </div>
  )
}

export default Feed
