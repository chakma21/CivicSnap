import { Link } from 'react-router-dom'
import './Navigation.css'

function Navigation({ userRole }) {
  return (
    <nav className="bottom-nav">
      <Link to="/" className="nav-link">
        <span className="icon">📰</span>
        <span>Feed</span>
      </Link>
      <Link to="/map" className="nav-link">
        <span className="icon">🗺️</span>
        <span>Map</span>
      </Link>
      <Link to="/report" className="nav-link fab">
        <span className="icon">➕</span>
      </Link>
      <Link to="/dashboard" className="nav-link">
        <span className="icon">📊</span>
        <span>Dashboard</span>
      </Link>
    </nav>
  )
}

export default Navigation
