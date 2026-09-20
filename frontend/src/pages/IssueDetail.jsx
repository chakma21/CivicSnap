import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'
import IssueCard from '../components/IssueCard'
import ComplaintsModal from '../components/ComplaintsModal'
import SkeletonCard from '../components/SkeletonCard'
import './IssueDetail.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function IssueDetail() {
  const { issueId } = useParams()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeComplaintIssue, setActiveComplaintIssue] = useState(null)

  const load = () => {
    axios.get(`${API_BASE_URL}/issues`)
      .then((res) => {
        const found = res.data.issues.find((i) => i.issueId === issueId)
        if (found) setIssue(found)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId])

  const userId = localStorage.getItem('userId')
  const username = localStorage.getItem('username') || localStorage.getItem('userEmail') || 'Anonymous'

  const handleComplain = async (targetIssue) => {
    const currentlyComplained = (targetIssue.upvotedBy || []).includes(userId)
    const upvotedBy = currentlyComplained
      ? (targetIssue.upvotedBy || []).filter((id) => id !== userId)
      : [...(targetIssue.upvotedBy || []), userId]
    const upvoterNames = { ...(targetIssue.upvoterNames || {}) }
    if (currentlyComplained) delete upvoterNames[userId]
    else upvoterNames[userId] = username

    const updated = { ...targetIssue, upvotedBy, upvoterNames }
    setIssue(updated)
    setActiveComplaintIssue(updated)

    try {
      await axios.post(`${API_BASE_URL}/issues/upvote`, { issueId: targetIssue.issueId, createdAt: targetIssue.createdAt, userId, username })
    } catch {
      load()
    }
  }

  const handleCommentAdded = (_issueId, comments) => {
    setIssue((prev) => (prev ? { ...prev, comments } : prev))
  }

  return (
    <div className="issue-detail-container">
      <Link to="/" className="back-link"><ArrowLeft size={16} strokeWidth={2.2} /> Back to feed</Link>

      {loading ? (
        <SkeletonCard />
      ) : notFound ? (
        <p className="empty-state">This issue doesn't exist or was removed.</p>
      ) : (
        <IssueCard
          issue={issue}
          userId={userId}
          onComplain={handleComplain}
          onCommentAdded={handleCommentAdded}
          onOpenComplaints={setActiveComplaintIssue}
        />
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

export default IssueDetail
