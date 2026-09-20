import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import axios from 'axios'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import './Map.css'

// Leaflet's default icon resolves URLs via a bundler-incompatible _getIconUrl; drop it so mergeOptions below takes effect.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: '<span class="user-location-dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const INDIA_CENTER = [22.9734, 78.6569]

// react-leaflet's MapContainer only honors `center`/`zoom` on first render; this
// re-centers the live map once we know where to point it (the user's own
// location by default, or a fallback view over the reported issues).
function SetInitialView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom])
  return null
}

// A Google Maps-style "locate me" button: on click, asks for the device's
// location and pans/zooms the live map there, independent of the issue pins.
function LocateControl({ onLocated }) {
  const map = useMap()
  const [locating, setLocating] = useState(false)

  const handleClick = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        map.flyTo(coords, 15)
        onLocated(coords)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <button
      className={`locate-button ${locating ? 'locating' : ''}`}
      onClick={handleClick}
      title="Show my location"
      aria-label="Show my location"
    >
      {locating ? '...' : '🎯'}
    </button>
  )
}

function Map({ userRole }) {
  const [issues, setIssues] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [initialView, setInitialView] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE_URL}/issues`)
      .then((res) => setIssues(res.data.issues.filter((i) => i.lat != null && i.lng != null)))
      .catch(() => setIssues([]))
  }, [])

  // Default to the user's own location (like a normal maps app) so the view is
  // immediately familiar; every issue pin still renders regardless of region,
  // so panning out reveals anything reported elsewhere.
  useEffect(() => {
    if (!navigator.geolocation) {
      setInitialView({ center: INDIA_CENTER, zoom: 5 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(coords)
        setInitialView({ center: coords, zoom: 14 })
      },
      () => setInitialView({ center: INDIA_CENTER, zoom: 5 }),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const userRegion = (localStorage.getItem('userRegion') || '').trim().toLowerCase()
  const visibleIssues = userRole === 'municipality' && userRegion
    ? issues.filter((issue) => (issue.wardId || '').trim().toLowerCase() === userRegion)
    : issues

  return (
    <div className="map-container">
      <MapContainer center={INDIA_CENTER} zoom={5} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {initialView && <SetInitialView center={initialView.center} zoom={initialView.zoom} />}
        <LocateControl onLocated={setUserLocation} />
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {visibleIssues.map((issue) => (
            <Marker key={issue.issueId} position={[issue.lat, issue.lng]}>
              <Popup>
                <strong>{issue.title}</strong>
                <br />
                {issue.category} &middot; {issue.status}
                <br />
                {issue.wardId}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}

export default Map
