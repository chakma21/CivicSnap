import { useState } from 'react'
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js'
import './Auth.css'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
})

function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [userRole, setUserRole] = useState('citizen')
  const [region, setRegion] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')

  const signIn = (emailToUse, passwordToUse) => {
    const cognitoUser = new CognitoUser({ Username: emailToUse, Pool: userPool })
    const authDetails = new AuthenticationDetails({ Username: emailToUse, Password: passwordToUse })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const payload = session.getIdToken().decodePayload()
        const role = payload['custom:role'] || 'citizen'
        localStorage.setItem('authToken', session.getIdToken().getJwtToken())
        localStorage.setItem('userRole', role)
        localStorage.setItem('userId', payload.sub)
        localStorage.setItem('userEmail', payload.email)
        localStorage.setItem('username', payload['custom:username'] || payload.email)
        if (payload['custom:region']) {
          localStorage.setItem('userRegion', payload['custom:region'])
        } else {
          localStorage.removeItem('userRegion')
        }
        setLoading(false)
        onAuthSuccess(role)
      },
      onFailure: (err) => {
        setError(err.message || 'Sign in failed')
        setLoading(false)
      },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isLogin) {
      signIn(email, password)
      return
    }

    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'custom:role', Value: userRole }),
      new CognitoUserAttribute({ Name: 'custom:username', Value: username.trim() }),
    ]
    if (userRole === 'municipality' && region.trim()) {
      attributes.push(new CognitoUserAttribute({ Name: 'custom:region', Value: region.trim() }))
    }

    userPool.signUp(email, password, attributes, null, (err) => {
      setLoading(false)
      if (err) {
        setError(err.message || 'Sign up failed')
        return
      }
      setPendingConfirmation(true)
    })
  }

  const handleConfirm = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    cognitoUser.confirmRegistration(confirmationCode, true, (err) => {
      if (err) {
        setError(err.message || 'Confirmation failed')
        setLoading(false)
        return
      }
      signIn(email, password)
    })
  }

  if (pendingConfirmation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>CivicSnap</h1>
          <p className="tagline">See it. Snap it. Get it fixed.</p>
          <p>We emailed a verification code to {email}. Enter it below to finish signing up.</p>
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Sign In →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Civic<span className="accent-word">Snap</span></h1>
        <p className="tagline">See it. Snap it. Get it fixed.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="How others will see you in comments"
                minLength={2}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>I am a...</label>
              <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                <option value="citizen">Citizen</option>
                <option value="municipality">Municipal Official</option>
              </select>
            </div>
          )}
          {!isLogin && userRole === 'municipality' && (
            <div className="form-group">
              <label>Your Municipality Region / Ward</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. ward-9"
                required
              />
              <p className="hint-text">Issues reported in this ward will be shown to you. Must match the ward citizens select when reporting.</p>
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In →' : 'Sign Up →')}
          </button>
        </form>
        <p>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="link-button"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
        <div className="trust-stats">
          <div className="trust-stat">
            <span className="trust-icon">📸</span>
            <span className="trust-number">2,400+</span>
            <span className="trust-label">Issues reported</span>
          </div>
          <div className="trust-stat">
            <span className="trust-icon">🏙️</span>
            <span className="trust-number">30+</span>
            <span className="trust-label">Wards covered</span>
          </div>
          <div className="trust-stat">
            <span className="trust-icon">⚡</span>
            <span className="trust-number">48h</span>
            <span className="trust-label">Avg. response</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
