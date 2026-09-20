import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Trophy } from 'lucide-react'
import SkeletonCard from '../components/SkeletonCard'
import './Leaderboard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const BADGE_TIERS = [
  { min: 100, label: 'Civic Hero', color: '#9333ea' },
  { min: 50, label: 'Ward Champion', color: '#c1652e' },
  { min: 20, label: 'Active Citizen', color: '#2563a8' },
  { min: 0, label: 'Newcomer', color: '#6b5b95' },
]

function badgeFor(score) {
  return BADGE_TIERS.find((t) => score >= t.min)
}

// A simple, transparent score: reports filed count most (and resolved ones
// even more, since that's a report that actually led to real impact),
// complaints and comments count for staying engaged with what's already reported.
function computeScores(issues) {
  const byUser = {}
  const bump = (userId, username, field, amount = 1) => {
    if (!userId) return
    if (!byUser[userId]) {
      byUser[userId] = { userId, username: username || 'Anonymous', reports: 0, resolvedReports: 0, complaints: 0, comments: 0 }
    }
    if (username) byUser[userId].username = username
    byUser[userId][field] += amount
  }

  for (const issue of issues) {
    bump(issue.userId, issue.username, 'reports')
    if (issue.status === 'resolved') bump(issue.userId, issue.username, 'resolvedReports')
    for (const [uid, uname] of Object.entries(issue.upvoterNames || {})) {
      bump(uid, uname, 'complaints')
    }
    for (const comment of issue.comments || []) {
      bump(comment.userId, comment.username, 'comments')
    }
  }

  return Object.values(byUser)
    .map((u) => ({ ...u, score: u.reports * 10 + u.resolvedReports * 15 + u.complaints * 3 + u.comments * 2 }))
    .sort((a, b) => b.score - a.score)
}

function Leaderboard() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [wardFilter, setWardFilter] = useState('all')
  const currentUserId = localStorage.getItem('userId')

  useEffect(() => {
    axios.get(`${API_BASE_URL}/issues`)
      .then((res) => {
        setIssues(res.data.issues)
        const defaultRegion = localStorage.getItem('userRegion')
        if (defaultRegion) setWardFilter(defaultRegion)
      })
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }, [])

  const wards = useMemo(
    () => [...new Set(issues.map((i) => i.wardId).filter(Boolean))].sort(),
    [issues],
  )

  const filteredIssues = wardFilter === 'all'
    ? issues
    : issues.filter((i) => (i.wardId || '').toLowerCase() === wardFilter.toLowerCase())

  const ranked = useMemo(() => computeScores(filteredIssues), [filteredIssues])

  return (
    <div className="leaderboard-container">
      <h1><Trophy size={22} strokeWidth={2.2} className="leaderboard-title-icon" /> Top Contributors</h1>
      <p className="leaderboard-subtext">
        Points for filing reports (extra for ones that got resolved), complaining on existing issues, and commenting.
      </p>

      <select className="ward-select" value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
        <option value="all">All areas</option>
        {wards.map((w) => <option key={w} value={w}>{w}</option>)}
      </select>

      {loading ? (
        <SkeletonCard withPhoto={false} />
      ) : ranked.length === 0 ? (
        <p className="empty-state">No activity here yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {ranked.slice(0, 20).map((u, i) => {
            const badge = badgeFor(u.score)
            const isMe = u.userId === currentUserId
            return (
              <li key={u.userId} className={`leaderboard-row ${isMe ? 'me' : ''}`}>
                <span className="leaderboard-rank">{i + 1}</span>
                <span className="leaderboard-avatar">{u.username[0]?.toUpperCase() || '?'}</span>
                <div className="leaderboard-info">
                  <span className="leaderboard-name">{u.username}{isMe ? ' (you)' : ''}</span>
                  <span className="leaderboard-stats">
                    {u.reports} report{u.reports === 1 ? '' : 's'} · {u.complaints} complaint{u.complaints === 1 ? '' : 's'} · {u.comments} comment{u.comments === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="leaderboard-score-col">
                  <span className="leaderboard-score">{u.score}</span>
                  <span className="leaderboard-badge" style={{ background: badge.color }}>{badge.label}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default Leaderboard
