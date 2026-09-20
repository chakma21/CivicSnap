import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import Navigation from './components/Navigation'
import TopBar from './components/TopBar'
import Feed from './pages/Feed'
import Map from './pages/Map'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import ReportIssue from './pages/ReportIssue'
import Profile from './pages/Profile'
import './App.css'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
})

function App() {
  const [userRole, setUserRole] = useState(null) // 'citizen' or 'municipality'
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const role = localStorage.getItem('userRole')
    if (token && role) {
      setIsAuthenticated(true)
      setUserRole(role)
    }
  }, [])

  const handleSignOut = () => {
    const currentUser = userPool.getCurrentUser()
    if (currentUser) currentUser.signOut()
    localStorage.removeItem('authToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRegion')
    localStorage.removeItem('username')
    setIsAuthenticated(false)
    setUserRole(null)
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={(role) => {
      setUserRole(role)
      setIsAuthenticated(true)
    }} />
  }

  return (
    <Router>
      <div className="app-container">
        <TopBar onSignOut={handleSignOut} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Feed userRole={userRole} />} />
            <Route path="/map" element={<Map userRole={userRole} />} />
            <Route path="/dashboard" element={<Dashboard userRole={userRole} />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        <Navigation userRole={userRole} />
      </div>
    </Router>
  )
}

export default App
