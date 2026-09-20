import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { X } from 'lucide-react'
import { haversineMeters, formatDistance } from '../utils/geo'
import './ReportIssue.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const DUPLICATE_CHECK_RADIUS_METERS = 25
const MAX_PHOTOS = 4

function ReportIssue({ userRole }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('road')
  const [wardId, setWardId] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const [nearbyIssues, setNearbyIssues] = useState([])
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [complaining, setComplaining] = useState(false)

  const useMyLocation = () => {
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setError('Could not get your location. Without it, this issue won\'t appear on the map.')
        setLocating(false)
      }
    )
  }

  // Capture location automatically as soon as the form opens, so citizens don't
  // have to remember to press the button — issues without coordinates never show on the map.
  useEffect(() => {
    if (navigator.geolocation) useMyLocation()
  }, [])

  // Municipal officials manage issues, they don't file them — keep this route
  // citizen-only even if someone lands here directly (e.g. via browser back/URL).
  useEffect(() => {
    if (userRole === 'municipality') navigate('/', { replace: true })
  }, [userRole, navigate])

  // Once we know where the citizen is standing, check for an existing unresolved
  // report right nearby — cuts down on duplicate reports of the same pothole.
  useEffect(() => {
    if (!coords) return
    axios.get(`${API_BASE_URL}/issues`)
      .then((res) => {
        const nearby = (res.data.issues || [])
          .filter((i) => i.lat != null && i.lng != null && i.status !== 'resolved')
          .map((i) => ({ issue: i, distance: haversineMeters([coords.lat, coords.lng], [i.lat, i.lng]) }))
          .filter((i) => i.distance <= DUPLICATE_CHECK_RADIUS_METERS)
          .sort((a, b) => a.distance - b.distance)
        setNearbyIssues(nearby)
      })
      .catch(() => setNearbyIssues([]))
  }, [coords])

  const closestNearby = nearbyIssues[0]

  if (userRole === 'municipality') return null

  const handlePhotosChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS)
    if (files.length === 0) return
    setPhotoFiles(files)
    setPhotoPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removePhoto = (index) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadPhotos = async () => {
    const uploaded = []
    for (const file of photoFiles) {
      const presignRes = await axios.post(`${API_BASE_URL}/uploads/presign`, {
        fileName: file.name,
        contentType: file.type,
      })
      const { uploadUrl, photoUrl, key } = presignRes.data
      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })
      uploaded.push({ photoUrl, photoKey: key })
    }
    return { photoUrls: uploaded.map((u) => u.photoUrl), photoKeys: uploaded.map((u) => u.photoKey) }
  }

  const handleComplainInstead = async (issue) => {
    setComplaining(true)
    const userId = localStorage.getItem('userId')
    const username = localStorage.getItem('username')
    try {
      await axios.post(`${API_BASE_URL}/issues/upvote`, { issueId: issue.issueId, createdAt: issue.createdAt, userId, username })
      navigate('/')
    } catch {
      setComplaining(false)
      setError('Could not add your complaint. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      let photoData = {}
      if (photoFiles.length > 0) {
        setStatusMessage(photoFiles.length > 1 ? 'Uploading photos...' : 'Uploading photo...')
        photoData = await uploadPhotos()
        setStatusMessage('Analyzing photo & submitting...')
      }

      await axios.post(`${API_BASE_URL}/issues`, {
        title,
        description,
        category,
        wardId: wardId || 'unassigned',
        lat: coords?.lat,
        lng: coords?.lng,
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username'),
        ...photoData,
      })
      navigate('/')
    } catch (err) {
      setError('Could not submit the report. Please try again.')
      setSubmitting(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="report-container">
      <h1>Report an Issue</h1>

      {closestNearby && !nudgeDismissed && (
        <div className="duplicate-nudge">
          <p>
            There's already an open report <strong>{formatDistance(closestNearby.distance)}</strong> from here:
            <br /><strong>"{closestNearby.issue.title}"</strong>
            {(closestNearby.issue.upvotedBy || []).length > 0 && ` (${closestNearby.issue.upvotedBy.length} ${closestNearby.issue.upvotedBy.length === 1 ? 'person has' : 'people have'} already complained)`}.
          </p>
          <p className="duplicate-nudge-question">Is this the same issue?</p>
          <div className="duplicate-nudge-actions">
            <button type="button" className="duplicate-nudge-complain" onClick={() => handleComplainInstead(closestNearby.issue)} disabled={complaining}>
              {complaining ? 'Adding complaint...' : 'Yes, complain on it instead'}
            </button>
            <button type="button" className="duplicate-nudge-dismiss" onClick={() => setNudgeDismissed(true)}>
              No, this is different
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <div className="form-group">
          <label>Photos (up to {MAX_PHOTOS})</label>
          <input type="file" accept="image/*" multiple onChange={handlePhotosChange} />
          {photoPreviews.length > 0 && (
            <div className="photo-preview-row">
              {photoPreviews.map((src, i) => (
                <div key={i} className="photo-preview-item">
                  <img src={src} alt={`Preview ${i + 1}`} className="photo-preview" />
                  <button type="button" className="photo-preview-remove" onClick={() => removePhoto(i)} aria-label="Remove photo">
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="road">Road / Pothole</option>
            <option value="garbage">Garbage</option>
            <option value="streetlight">Streetlight</option>
            <option value="water">Water Supply</option>
            <option value="other">Other</option>
          </select>
          <p className="hint-text">If you add a photo, AI will suggest a category automatically.</p>
        </div>
        <div className="form-group">
          <label>Ward</label>
          <input value={wardId} onChange={(e) => setWardId(e.target.value)} placeholder="e.g. ward-12" />
        </div>
        <div className="form-group">
          <label>Location</label>
          <button type="button" onClick={useMyLocation} disabled={locating} className="location-button">
            {locating ? 'Getting location...' : coords ? `📍 Location set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Use my location'}
          </button>
          {!locating && !coords && (
            <p className="hint-text location-warning">⚠️ Without a location, this issue won't show a pin on the map.</p>
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? (statusMessage || 'Submitting...') : 'Submit Report →'}
        </button>
      </form>
    </div>
  )
}

export default ReportIssue
