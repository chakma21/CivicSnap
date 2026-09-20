import { useState } from 'react'
import { CognitoUserPool, CognitoUserAttribute } from 'amazon-cognito-identity-js'
import './Profile.css'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
})

function Profile() {
  const email = localStorage.getItem('userEmail') || ''
  const role = localStorage.getItem('userRole') || ''

  const [editingInfo, setEditingInfo] = useState(false)
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [infoStatus, setInfoStatus] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  const [region, setRegion] = useState(localStorage.getItem('userRegion') || '')
  const [regionStatus, setRegionStatus] = useState('')
  const [savingRegion, setSavingRegion] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSaveInfo = () => {
    setInfoStatus('')
    setSavingInfo(true)

    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) {
      setInfoStatus('Your session has expired. Please sign in again.')
      setSavingInfo(false)
      return
    }

    cognitoUser.getSession((err) => {
      if (err) {
        setInfoStatus('Your session has expired. Please sign in again.')
        setSavingInfo(false)
        return
      }
      cognitoUser.updateAttributes(
        [new CognitoUserAttribute({ Name: 'custom:username', Value: username.trim() })],
        (updateErr) => {
          setSavingInfo(false)
          if (updateErr) {
            setInfoStatus(updateErr.message || 'Could not update username.')
            return
          }
          localStorage.setItem('username', username.trim())
          setEditingInfo(false)
        }
      )
    })
  }

  const handleSaveRegion = (e) => {
    e.preventDefault()
    setRegionStatus('')
    setSavingRegion(true)

    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) {
      setRegionStatus('Your session has expired. Please sign in again.')
      setSavingRegion(false)
      return
    }

    cognitoUser.getSession((err) => {
      if (err) {
        setRegionStatus('Your session has expired. Please sign in again.')
        setSavingRegion(false)
        return
      }
      cognitoUser.updateAttributes(
        [new CognitoUserAttribute({ Name: 'custom:region', Value: region.trim() })],
        (updateErr) => {
          setSavingRegion(false)
          if (updateErr) {
            setRegionStatus(updateErr.message || 'Could not update region.')
            return
          }
          localStorage.setItem('userRegion', region.trim())
          setRegionStatus('Region updated. It will apply the next time you view issues.')
        }
      )
    })
  }

  const handleChangePassword = (e) => {
    e.preventDefault()
    setStatus('')
    setSubmitting(true)

    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) {
      setStatus('Your session has expired. Please sign in again.')
      setSubmitting(false)
      return
    }

    cognitoUser.getSession((err) => {
      if (err) {
        setStatus('Your session has expired. Please sign in again.')
        setSubmitting(false)
        return
      }
      cognitoUser.changePassword(currentPassword, newPassword, (changeErr) => {
        setSubmitting(false)
        if (changeErr) {
          setStatus(changeErr.message || 'Could not change password.')
          return
        }
        setStatus('Password updated successfully.')
        setCurrentPassword('')
        setNewPassword('')
      })
    })
  }

  return (
    <div className="profile-container">
      <h1>Manage Profile</h1>

      <div className="profile-info">
        <div className="profile-info-header">
          <h2>Account Info</h2>
          {!editingInfo && (
            <button className="edit-button" onClick={() => setEditingInfo(true)}>✏️ Edit</button>
          )}
        </div>

        {editingInfo ? (
          <>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
              />
            </div>
            <div>
              <label>Email</label>
              <p className="readonly-field">{email} <span className="readonly-tag">cannot be changed</span></p>
            </div>
            <div>
              <label>Role</label>
              <p className="readonly-field">{role === 'citizen' ? 'Citizen' : 'Municipal Official'} <span className="readonly-tag">cannot be changed</span></p>
            </div>
            {infoStatus && <p className="error-text">{infoStatus}</p>}
            <div className="edit-actions">
              <button className="save-button" onClick={handleSaveInfo} disabled={savingInfo}>
                {savingInfo ? 'Saving...' : 'Save'}
              </button>
              <button className="cancel-button" onClick={() => { setEditingInfo(false); setUsername(localStorage.getItem('username') || ''); setInfoStatus('') }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label>Username</label>
              <p>{username || '—'}</p>
            </div>
            <div>
              <label>Email</label>
              <p>{email}</p>
            </div>
            <div>
              <label>Role</label>
              <p className="role-value">{role === 'citizen' ? 'Citizen' : 'Municipal Official'}</p>
            </div>
          </>
        )}
      </div>

      {role === 'municipality' && (
        <>
          <h2>Your Region / Ward</h2>
          <form onSubmit={handleSaveRegion}>
            <div className="form-group">
              <label>Region / Ward</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Pune or ward-9"
                required
              />
              <p className="hint-text">Matches any issue whose ward/area contains this text — e.g. "Pune" also matches "FC Road, Pune".</p>
            </div>
            {regionStatus && <p className={regionStatus.includes('updated') ? 'success-text' : 'error-text'}>{regionStatus}</p>}
            <button type="submit" disabled={savingRegion}>
              {savingRegion ? 'Saving...' : 'Save Region →'}
            </button>
          </form>
        </>
      )}

      <h2>Change Password</h2>
      <form onSubmit={handleChangePassword}>
        <div className="form-group">
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {status && <p className={status.includes('success') ? 'success-text' : 'error-text'}>{status}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update Password →'}
        </button>
      </form>
    </div>
  )
}

export default Profile
