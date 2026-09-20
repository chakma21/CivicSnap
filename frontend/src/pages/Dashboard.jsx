import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { ClipboardList, Wrench, CheckCircle2, TriangleAlert, Timer, UserRound } from 'lucide-react'
import StatusUpdateModal from '../components/StatusUpdateModal'
import IssueUpdates from '../components/IssueUpdates'
import SkeletonCard from '../components/SkeletonCard'
import { matchesRegion } from '../utils/region'
import { categoryMeta } from '../utils/categories'
import './Dashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const FILTERS = ['all', 'pending', 'in-progress', 'resolved', 'escalated']

// A simple, explainable triage score built from signals we actually have: how
// long it's sat unresolved, how many citizens have complained about it, whether
// it's already been auto-escalated, and the AI's severity read on the photo (if
// any). Resolved issues don't need a priority — they're done.
function computePriority(issue) {
  if (issue.status === 'resolved') return null
  const daysPending = (Date.now() - issue.createdAt) / (1000 * 60 * 60 * 24)
  const complaints = (issue.upvotedBy || []).length
  const severityWeight = { high: 3, medium: 2, low: 1 }[issue.aiAnalysis?.severity] ?? 1.5
  const escalatedWeight = issue.status === 'escalated' ? 5 : 0
  const score = escalatedWeight + severityWeight + complaints * 0.5 + Math.min(daysPending, 30) * 0.2
  if (score >= 7) return 'high'
  if (score >= 3.5) return 'medium'
  return 'low'
}

// Approximate resolution time from the most recent logged update (status
// changes always log one) — we don't store a dedicated "resolvedAt" timestamp,
// so this is the closest signal available without a schema change.
function estimateAvgResolutionDays(resolvedIssues) {
  const withUpdates = resolvedIssues.filter((i) => (i.updates || []).length > 0)
  if (withUpdates.length === 0) return null
  const totalDays = withUpdates.reduce((sum, i) => {
    const lastUpdateAt = Math.max(...i.updates.map((u) => u.createdAt))
    return sum + (lastUpdateAt - i.createdAt) / (1000 * 60 * 60 * 24)
  }, 0)
  return (totalDays / withUpdates.length).toFixed(1)
}

function Dashboard({ userRole }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingIssue, setEditingIssue] = useState(null)
  const [filter, setFilter] = useState('all')

  const loadIssues = () => {
    axios.get(`${API_BASE_URL}/issues`)
      .then((res) => setIssues(res.data.issues))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadIssues()
  }, [])

  const handleIssueUpdated = (updatedIssue) => {
    setIssues((prev) => prev.map((i) => i.issueId === updatedIssue.issueId ? updatedIssue : i))
  }

  const userId = localStorage.getItem('userId')
  const userRegion = localStorage.getItem('userRegion') || ''
  const myIssues = issues.filter((issue) => issue.userId === userId)
  const regionIssues = userRegion
    ? issues.filter((issue) => matchesRegion(issue.wardId, userRegion))
    : issues

  const counts = {
    total: regionIssues.length,
    pending: regionIssues.filter((i) => i.status === 'pending').length,
    inProgress: regionIssues.filter((i) => i.status === 'in-progress').length,
    resolved: regionIssues.filter((i) => i.status === 'resolved').length,
    escalated: regionIssues.filter((i) => i.status === 'escalated').length,
  }
  const avgResolutionDays = useMemo(
    () => estimateAvgResolutionDays(regionIssues.filter((i) => i.status === 'resolved')),
    [regionIssues],
  )
  const escalatedIssues = regionIssues.filter((i) => i.escalationEmail)

  const prioritizedIssues = useMemo(() => {
    const withPriority = regionIssues.map((issue) => ({ issue, priority: computePriority(issue) }))
    const filtered = filter === 'all' ? withPriority : withPriority.filter(({ issue }) => issue.status === filter)
    const priorityRank = { high: 0, medium: 1, low: 2, null: 3 }
    return filtered.sort((a, b) => {
      const rankDiff = priorityRank[a.priority] - priorityRank[b.priority]
      if (rankDiff !== 0) return rankDiff
      return b.issue.createdAt - a.issue.createdAt
    })
  }, [regionIssues, filter])

  return (
    <div className="dashboard-container">
      <h1>{userRole === 'citizen' ? 'My Issues' : 'Municipal Dashboard'}</h1>

      {userRole === 'municipality' && (
        !userRegion ? (
          <p className="empty-state">
            Set your region/ward in <Link to="/profile">Manage Profile</Link> to see issues for your area.
          </p>
        ) : (
          <>
            <p className="region-label">Showing issues for: <strong>{userRegion}</strong></p>
            <div className="analytics-cards">
              <div className="card">
                <ClipboardList size={20} className="card-icon" strokeWidth={2} />
                <h3>Raised</h3>
                <p className="stat">{loading ? '-' : counts.total}</p>
              </div>
              <div className="card">
                <Wrench size={20} className="card-icon" strokeWidth={2} />
                <h3>In Progress</h3>
                <p className="stat">{loading ? '-' : counts.inProgress}</p>
              </div>
              <div className="card">
                <CheckCircle2 size={20} className="card-icon" strokeWidth={2} />
                <h3>Resolved</h3>
                <p className="stat">{loading ? '-' : counts.resolved}</p>
              </div>
              <div className="card">
                <Timer size={20} className="card-icon" strokeWidth={2} />
                <h3>Avg Resolution</h3>
                <p className="stat stat-small">{avgResolutionDays ? `${avgResolutionDays}d` : '—'}</p>
              </div>
            </div>

            {escalatedIssues.length > 0 && (
              <>
                <h2 className="section-heading"><TriangleAlert size={16} strokeWidth={2.2} /> Escalated Issues (Pending Over 2 Weeks)</h2>
                <p className="section-subtext">
                  These issues were automatically escalated and a notification email was sent. Here's exactly what was sent:
                </p>
                <div className="escalation-list">
                  {escalatedIssues.map((issue) => (
                    <div key={issue.issueId} className="escalation-card">
                      <div className="escalation-card-header">
                        <h3>{issue.title}</h3>
                        <span className="escalation-source">
                          {issue.escalationEmail.generatedBy === 'bedrock' ? 'Written by Bedrock AI' : 'Template email'}
                        </span>
                      </div>
                      <div className="email-preview">
                        <div className="email-preview-subject">Subject: {issue.escalationEmail.subject}</div>
                        <div className="email-preview-body">{issue.escalationEmail.body}</div>
                        <div className="email-preview-meta">
                          Sent {new Date(issue.escalationEmail.sentAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="section-heading">Issue Queue</h2>
            <div className="filter-tabs">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="issues-list">
                <SkeletonCard withPhoto={false} />
                <SkeletonCard withPhoto={false} />
              </div>
            ) : prioritizedIssues.length === 0 ? (
              <p className="empty-state">No issues match this filter.</p>
            ) : (
              <div className="issues-list">
                {prioritizedIssues.map(({ issue, priority }) => {
                  const meta = categoryMeta(issue.category)
                  const Icon = meta.icon
                  const daysPending = Math.floor((Date.now() - issue.createdAt) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={issue.issueId} className="queue-card">
                      <div className="queue-card-top">
                        <span className="queue-card-icon"><Icon size={16} strokeWidth={2.2} /></span>
                        <div className="queue-card-info">
                          <h3>{issue.title}</h3>
                          <span className="manage-card-meta">
                            {meta.label} · {issue.wardId} · {daysPending}d ago · {(issue.upvotedBy || []).length} complaint{(issue.upvotedBy || []).length === 1 ? '' : 's'}
                          </span>
                          {issue.assignedTo && (
                            <span className="assigned-to-tag">
                              <UserRound size={11} strokeWidth={2.4} /> {issue.assignedTo}
                            </span>
                          )}
                        </div>
                        {priority && <span className={`priority-badge priority-${priority}`}>{priority}</span>}
                      </div>

                      <div className="queue-card-bottom">
                        <span className={`status-badge status-${issue.status}`}>{issue.status}</span>
                        <button className="update-status-button" onClick={() => setEditingIssue(issue)}>
                          Update
                        </button>
                      </div>

                      <IssueUpdates updates={issue.updates} showInternal />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      )}

      {userRole === 'citizen' && (
        loading ? (
          <div className="issues-list">
            <SkeletonCard withPhoto={false} />
            <SkeletonCard withPhoto={false} />
          </div>
        ) : myIssues.length === 0 ? (
          <p className="empty-state">You haven't reported any issues yet.</p>
        ) : (
          <div className="issues-list">
            {myIssues.map((issue) => (
              <div key={issue.issueId} className="my-issue-card">
                <div className="my-issue-card-top">
                  <h3>{issue.title}</h3>
                  <span className={`status-badge status-${issue.status}`}>{issue.status}</span>
                </div>
                <IssueUpdates updates={issue.updates} />
              </div>
            ))}
          </div>
        )
      )}

      {editingIssue && (
        <StatusUpdateModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onUpdated={handleIssueUpdated}
        />
      )}
    </div>
  )
}

export default Dashboard
