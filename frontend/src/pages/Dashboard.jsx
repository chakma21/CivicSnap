import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import StatusUpdateModal from '../components/StatusUpdateModal'
import './Dashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function Dashboard({ userRole }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingIssue, setEditingIssue] = useState(null)

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
  const userRegion = (localStorage.getItem('userRegion') || '').trim().toLowerCase()
  const myIssues = issues.filter((issue) => issue.userId === userId)
  const regionIssues = userRegion
    ? issues.filter((issue) => (issue.wardId || '').trim().toLowerCase() === userRegion)
    : issues

  const counts = {
    pending: regionIssues.filter((i) => i.status === 'pending').length,
    inProgress: regionIssues.filter((i) => i.status === 'in-progress').length,
    resolved: regionIssues.filter((i) => i.status === 'resolved').length,
  }
  const escalatedIssues = regionIssues.filter((i) => i.escalationEmail)

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
            <p className="region-label">Showing issues for: <strong>{localStorage.getItem('userRegion')}</strong></p>
            <div className="analytics-cards">
              <div className="card">
                <span className="card-icon">📋</span>
                <h3>Open Issues</h3>
                <p className="stat">{loading ? '-' : counts.pending}</p>
              </div>
              <div className="card">
                <span className="card-icon">🔧</span>
                <h3>In Progress</h3>
                <p className="stat">{loading ? '-' : counts.inProgress}</p>
              </div>
              <div className="card">
                <span className="card-icon">✅</span>
                <h3>Resolved</h3>
                <p className="stat">{loading ? '-' : counts.resolved}</p>
              </div>
              <div className="card">
                <span className="card-icon">⏱️</span>
                <h3>Avg Resolution Time</h3>
                <p className="stat">-- days</p>
              </div>
            </div>

            {escalatedIssues.length > 0 && (
              <>
                <h2 className="section-heading">⚠️ Escalated Issues (Pending Over 2 Weeks)</h2>
                <p className="section-subtext">
                  These issues were automatically escalated and a notification email was sent. Here's exactly what was sent:
                </p>
                <div className="escalation-list">
                  {escalatedIssues.map((issue) => (
                    <div key={issue.issueId} className="escalation-card">
                      <div className="escalation-card-header">
                        <h3>{issue.title}</h3>
                        <span className="escalation-source">
                          {issue.escalationEmail.generatedBy === 'bedrock' ? '🤖 Written by Bedrock AI' : '📄 Template email'}
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

            <h2 className="section-heading">Update Status</h2>

            {loading ? (
              <p>Loading...</p>
            ) : regionIssues.length === 0 ? (
              <p className="empty-state">No issues reported in your region yet.</p>
            ) : (
              <div className="issues-list">
                {regionIssues.sort((a, b) => b.createdAt - a.createdAt).map((issue) => (
                  <div key={issue.issueId} className="issue-card manage-card">
                    <div className="manage-card-info">
                      <h3>{issue.title}</h3>
                      <span className="manage-card-meta">{issue.category} &middot; {issue.wardId}</span>
                      <span className={`status-badge status-${issue.status}`}>{issue.status}</span>
                    </div>
                    <button className="update-status-button" onClick={() => setEditingIssue(issue)}>
                      Update Status
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      )}

      {userRole === 'citizen' && (
        loading ? (
          <p>Loading...</p>
        ) : myIssues.length === 0 ? (
          <p className="empty-state">You haven't reported any issues yet.</p>
        ) : (
          <div className="issues-list">
            {myIssues.map((issue) => (
              <div key={issue.issueId} className="my-issue-card">
                <h3>{issue.title}</h3>
                <span className={`status-badge status-${issue.status}`}>{issue.status}</span>
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
