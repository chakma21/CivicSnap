import { useState } from 'react'
import axios from 'axios'
import './StatusUpdateModal.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const STATUS_OPTIONS = ['pending', 'in-progress', 'resolved']

function StatusUpdateModal({ issue, onClose, onUpdated }) {
  const [status, setStatus] = useState(issue.status)
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
    setSaving(true)
    setError('')
    try {
      let proofPhotoUrl
      if (photoFile) {
        const presignRes = await axios.post(`${API_BASE_URL}/uploads/presign`, {
          fileName: photoFile.name,
          contentType: photoFile.type,
        })
        const { uploadUrl, photoUrl } = presignRes.data
        await axios.put(uploadUrl, photoFile, { headers: { 'Content-Type': photoFile.type } })
        proofPhotoUrl = photoUrl
      }

      const res = await axios.patch(`${API_BASE_URL}/issues/status`, {
        issueId: issue.issueId,
        createdAt: issue.createdAt,
        status,
        ...(proofPhotoUrl ? { proofPhotoUrl } : {}),
      })
      onUpdated(res.data)
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
          <h2>Update Status</h2>
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
          <label>Proof Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
          {photoPreview && <img src={photoPreview} alt="Proof preview" className="modal-photo-preview" />}
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
