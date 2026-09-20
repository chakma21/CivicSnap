import { useState } from 'react'
import { Sparkles, CheckCircle2, Share2, Check } from 'lucide-react'
import CommentSection from './CommentSection'
import IssueUpdates from './IssueUpdates'
import PhotoLightbox from './PhotoLightbox'
import complaintIcon from '../assets/icons/complaint-icon.png'
import { timeAgo } from '../utils/timeAgo'
import { categoryMeta } from '../utils/categories'
import { formatDistance } from '../utils/geo'
import './IssueCard.css'

function IssueCard({ issue, userId, cardRef, distanceMeters, onComplain, onCommentAdded, onOpenComplaints }) {
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [copied, setCopied] = useState(false)

  const meta = categoryMeta(issue.category)
  const Icon = meta.icon
  const complained = (issue.upvotedBy || []).includes(userId)
  const complainantNames = Object.values(issue.upvoterNames || {})
  const photos = issue.photoUrls?.length > 0 ? issue.photoUrls : (issue.photoUrl ? [issue.photoUrl] : [])

  const handleShare = async (e) => {
    e.stopPropagation()
    const url = `${window.location.origin}/issue/${issue.issueId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: issue.title, url })
      } catch {
        // user cancelled the share sheet
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable, nothing more we can do
    }
  }

  return (
    <div className="issue-card" ref={cardRef}>
      <div className="issue-card-top">
        <span className="post-avatar" style={{ background: meta.color }}>
          <Icon size={18} color="#fff" strokeWidth={2.2} />
        </span>
        <div className="post-meta">
          <span className="post-meta-line">
            Reported by <strong>{issue.username || 'A citizen'}</strong>
          </span>
          <span className="post-meta-sub">
            {meta.label} · {issue.wardId || 'unknown ward'} · {timeAgo(issue.createdAt)}
            {distanceMeters != null && ` · ${formatDistance(distanceMeters)} away`}
          </span>
        </div>
        <span className={`status-badge status-${issue.status}`}>{issue.status}</span>
      </div>

      {photos.length > 0 && (
        <div className={`issue-photo-wrap ${photos.length > 1 ? 'multi' : ''}`}>
          {photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={issue.title}
              className="issue-photo"
              onClick={() => setLightboxSrc(url)}
            />
          ))}
        </div>
      )}

      <div className="issue-card-body">
        <p className="issue-caption"><strong>{issue.title}</strong>{issue.description ? ` — ${issue.description}` : ''}</p>

        {issue.aiAnalysis && (
          <div className="ai-badge">
            <Sparkles size={13} strokeWidth={2.2} />
            {issue.aiAnalysis.summary} (severity: {issue.aiAnalysis.severity})
          </div>
        )}

        {issue.proofPhotoUrl && (
          <div className="proof-photo-block">
            <span className="proof-photo-label">
              <CheckCircle2 size={13} strokeWidth={2.2} /> Proof of resolution
            </span>
            <img
              src={issue.proofPhotoUrl}
              alt="Proof of resolution"
              className="issue-photo"
              onClick={() => setLightboxSrc(issue.proofPhotoUrl)}
            />
          </div>
        )}

        <div className="issue-actions">
          <button
            className={`action-button complaint-button ${complained ? 'complained' : ''}`}
            onClick={() => onComplain(issue)}
          >
            <img src={complaintIcon} alt="" className="complaint-icon" />
            {(issue.upvotedBy || []).length}
          </button>
          <CommentSection issue={issue} onCommentAdded={onCommentAdded} />
          <button className="action-button share-button" onClick={handleShare} title="Share this issue">
            {copied ? <Check size={16} strokeWidth={2.4} /> : <Share2 size={16} strokeWidth={2.2} />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>

        {complainantNames.length > 0 && (
          <button className="complaint-summary" onClick={() => onOpenComplaints(issue)}>
            Complaint from <strong>{complainantNames[0]}</strong>
            {complainantNames.length > 1 ? ` and ${complainantNames.length - 1} more` : ''}
          </button>
        )}

        <IssueUpdates updates={issue.updates} />
      </div>

      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} alt={issue.title} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}

export default IssueCard
