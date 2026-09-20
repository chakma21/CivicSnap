import { useState } from 'react'
import axios from 'axios'
import './StatusUpdateModal.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const STATUS_OPTIONS = ['pending', 'in-progress', 'resolved']

function StatusUpdateModal({ issue, onClose, onUpdated }) {
  const [status, setStatus] = useState(issue.status)
  const [assignedTo, setAssignedTo] = useState(issue.assignedTo || '')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    const statusChanged = status !== issue.status
    const assignedToChanged = assignedTo.trim() !== (issue.assignedTo || '')
    if (!statusChanged && !assignedToChanged && !note.trim() && !photoFile) {
      setError('Change the status, assignment, or add an update note/photo before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      let photoUrl
      if (photoFile) {
        const presignRes = await axios.post(`${API_BASE_URL}/uploads/presign`, {
          fileName: photoFile.name,
          contentType: photoFile.type,
        })
        const presigned = presignRes.data
        await axios.put(presigned.uploadUrl, photoFile, { headers: { 'Content-Type': photoFile.type } })
        photoUrl = presigned.photoUrl
      }

      let latest = issue
      if (statusChanged || assignedToChanged || photoUrl) {
        const res = await axios.patch(`${API_BASE_URL}/issues/status`, {
          issueId: issue.issueId,
          createdAt: issue.createdAt,
          status,
          ...(photoUrl ? { proofPhotoUrl: photoUrl } : {}),
          ...(assignedToChanged ? { assignedTo: assignedTo.trim() } : {}),
        })
        latest = res.data
      }

      if (note.trim() || photoUrl) {
        const res = await axios.post(`${API_BASE_URL}/issues/update`, {
          issueId: issue.issueId,
          createdAt: issue.createdAt,
          text: note.trim() || `Status changed to ${status}`,
          photoUrl: photoUrl || null,
          authorUsername: localStorage.getItem('username') || 'Municipal team',
          visibility,
        })
        latest = res.data
      }

      onUpdated(latest)
      onClose()
    } catch (err) {
      setError('Could not save the update. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Issue</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="modal-issue-title">{issue.title}</p>

        <div className="modal-form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="modal-form-group">
          <label>Assigned to (staff/team)</label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="e.g. Ramesh Kumar — Roads Team"
          />
        </div>

        <div className="modal-form-group">
          <label>Update note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Team dispatched, expected fix by Friday"
          />
          <label className="modal-checkbox-row">
            <input
              type="checkbox"
              checked={visibility === 'internal'}
              onChange={(e) => setVisibility(e.target.checked ? 'internal' : 'public')}
            />
            Internal note only — don't show this to citizens
          </label>
        </div>

        <div className="modal-form-group">
          <label>Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
          <p className="modal-hint">Shown with this update, and as proof of resolution if you're marking it resolved.</p>
          {photoPreview && <img src={photoPreview} alt="Preview" className="modal-photo-preview" />}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <button className="modal-save-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Update →'}
        </button>
      </div>
    </div>
  )
}

export default StatusUpdateModal
