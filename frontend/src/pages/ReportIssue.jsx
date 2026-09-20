import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ReportIssue.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function ReportIssue() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('road')
  const [wardId, setWardId] = useState('')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async () => {
    const presignRes = await axios.post(`${API_BASE_URL}/uploads/presign`, {
      fileName: photoFile.name,
      contentType: photoFile.type,
    })
    const { uploadUrl, photoUrl, key } = presignRes.data
    await axios.put(uploadUrl, photoFile, { headers: { 'Content-Type': photoFile.type } })
    return { photoUrl, photoKey: key }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      let photoData = {}
      if (photoFile) {
        setStatusMessage('Uploading photo...')
        photoData = await uploadPhoto()
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
          <label>Photo</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
          {photoPreview && <img src={photoPreview} alt="Preview" className="photo-preview" />}
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
