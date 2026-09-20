import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './TopBar.css'

function getInitialTheme() {
  return localStorage.getItem('theme') || 'light'
}

function TopBar({ onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const email = localStorage.getItem('userEmail') || ''
  const username = localStorage.getItem('username') || email
  const initial = username ? username[0].toUpperCase() : '?'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <span className="top-bar-title">CivicSnap</span>
        <span className="top-bar-tagline">See it. Snap it. Get it fixed.</span>
      </div>
      <div className="top-bar-actions">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="profile-menu" ref={menuRef}>
          <button className="profile-avatar" onClick={() => setMenuOpen((open) => !open)}>
            {initial}
          </button>
          {menuOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-email">
                <strong>{username}</strong>
                {username !== email && <div>{email}</div>}
              </div>
              <button onClick={() => { setMenuOpen(false); navigate('/profile') }}>
                Manage Profile
              </button>
              <button onClick={() => { setMenuOpen(false); onSignOut() }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
