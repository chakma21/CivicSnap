import { useState } from 'react'
import { ClipboardList, Megaphone, Lock } from 'lucide-react'
import { timeAgo } from '../utils/timeAgo'
import './IssueUpdates.css'

function IssueUpdates({ updates = [], showInternal = false }) {
  const [expanded, setExpanded] = useState(false)

  const visible = showInternal ? updates : updates.filter((u) => u.visibility !== 'internal')
  if (visible.length === 0) return null

  const sorted = [...visible].sort((a, b) => b.createdAt - a.createdAt)
  const latest = sorted[0]

  return (
    <div className="issue-updates">
      <button className="issue-updates-toggle" onClick={() => setExpanded((v) => !v)}>
        <ClipboardList size={15} strokeWidth={2.2} />
        {expanded ? 'Hide updates' : `${visible.length} update${visible.length === 1 ? '' : 's'} from the municipal team`}
      </button>

      {!expanded && (
        <p className="issue-updates-latest">
          <Megaphone size={12} strokeWidth={2.2} />
          <span><strong>{latest.authorUsername}</strong>: {latest.text} · {timeAgo(latest.createdAt)}</span>
        </p>
      )}

      {expanded && (
        <ul className="issue-updates-list">
          {sorted.map((u) => (
            <li key={u.updateId} className="issue-updates-item">
              <div className="issue-updates-item-header">
                <span className="issue-updates-author">
                  {u.authorUsername}
                  {u.visibility === 'internal' && (
                    <span className="issue-updates-internal-tag"><Lock size={9} strokeWidth={2.5} /> Internal</span>
                  )}
                </span>
                <span className="issue-updates-time">{timeAgo(u.createdAt)}</span>
              </div>
              {u.text && <p className="issue-updates-text">{u.text}</p>}
              {u.photoUrl && <img src={u.photoUrl} alt="" className="issue-updates-photo" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default IssueUpdates
