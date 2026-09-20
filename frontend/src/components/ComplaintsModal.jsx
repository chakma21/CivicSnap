import complaintIcon from '../assets/icons/complaint-icon.png'
import '../components/StatusUpdateModal.css'
import './ComplaintsModal.css'

function ComplaintsModal({ issue, names, onClose }) {
  const totalComplaints = (issue.upvotedBy || []).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <img src={complaintIcon} alt="" className="modal-header-icon" />
            Complaints
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="modal-issue-title">{issue.title}</p>

        {names.length === 0 && totalComplaints === 0 ? (
          <p className="complaints-empty">No one has complained about this yet — you're the first.</p>
        ) : names.length === 0 ? (
          <p className="complaints-empty">
            {totalComplaints} {totalComplaints === 1 ? 'person has' : 'people have'} complained, but names weren't recorded for this older report.
          </p>
        ) : (
          <ul className="complaints-list">
            {names.map((name, i) => (
              <li key={`${name}-${i}`} className="complaints-list-item">
                <span className="complaints-avatar">{(name || '?')[0].toUpperCase()}</span>
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ComplaintsModal
