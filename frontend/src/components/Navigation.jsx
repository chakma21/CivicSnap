import { NavLink } from 'react-router-dom'
import { Home, MapPin, Plus, LayoutDashboard } from 'lucide-react'
import './Navigation.css'

function Navigation({ userRole }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <Home size={22} strokeWidth={2.2} />
        <span>Feed</span>
      </NavLink>
      <NavLink to="/map" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <MapPin size={22} strokeWidth={2.2} />
        <span>Map</span>
      </NavLink>
      {userRole !== 'municipality' && (
        <NavLink to="/report" className="nav-link fab" aria-label="Report an issue">
          <Plus size={26} strokeWidth={2.5} />
        </NavLink>
      )}
      <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <LayoutDashboard size={22} strokeWidth={2.2} />
        <span>Dashboard</span>
      </NavLink>
    </nav>
  )
}

export default Navigation
