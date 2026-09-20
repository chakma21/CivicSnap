import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import axios from 'axios'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { Crosshair, CheckCircle2 } from 'lucide-react'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import complaintMarkerIcon from '../assets/icons/complaint-marker-icon.png'
import inProgressIcon from '../assets/icons/in-progress-icon.png'
import { matchesRegion } from '../utils/region'
import { haversineMeters } from '../utils/geo'
import 'leaflet/dist/leaflet.css'
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

// Reports this close together are treated as the same real-world spot (e.g. 3
// people photographing the same pothole) and merged into one pin.
const CLUSTER_RADIUS_METERS = 10

const STATUS_COLORS = {
  resolved: '#16a34a',
  inProgress: '#2563eb',
}
const HEAT_LOW = [250, 204, 21] // yellow — one pending report here
const HEAT_HIGH = [190, 24, 24] // deep red — many pending reports here

// Greedy proximity grouping: each issue joins the nearest existing cluster
// centroid within CLUSTER_RADIUS_METERS, or starts a new one.
function clusterByDistance(issues, thresholdMeters) {
  const clusters = []
  for (const issue of issues) {
    const pos = [issue.lat, issue.lng]
    const target = clusters.find((c) => haversineMeters(c.center, pos) <= thresholdMeters)
    if (target) {
      target.members.push(issue)
      const n = target.members.length
      target.center = [
        target.members.reduce((s, m) => s + m.lat, 0) / n,
        target.members.reduce((s, m) => s + m.lng, 0) / n,
      ]
    } else {
      clusters.push({ center: pos, members: [issue] })
    }
  }
  return clusters
}

function heatColor(weight, min, max) {
  const t = max > min ? (weight - min) / (max - min) : 1
  const rgb = HEAT_LOW.map((c, i) => Math.round(c + (HEAT_HIGH[i] - c) * t))
  return `rgb(${rgb.join(',')})`
}

// Blend a cluster's mixed statuses into one representative pin color: an
// active in-progress fix takes priority (tells citizens "already being worked
// on"), then unresolved pending/escalated reports heat from yellow to red by
// how many are stacked at that spot, and only an all-resolved cluster goes green.
function classifyClusters(rawClusters) {
  const withStats = rawClusters.map((cluster) => {
    const members = cluster.members
    const hasInProgress = members.some((m) => m.status === 'in-progress')
    const pendingWeight = members.reduce((sum, m) => {
      if (m.status === 'escalated') return sum + 1.5
      if (m.status === 'pending') return sum + 1
      return sum
    }, 0)
    let kind
    if (hasInProgress) kind = 'in-progress'
    else if (pendingWeight > 0) kind = 'pending'
    else kind = 'resolved'
    return { ...cluster, kind, pendingWeight, count: members.length }
  })

  const pendingWeights = withStats.filter((c) => c.kind === 'pending').map((c) => c.pendingWeight)
  const maxWeight = pendingWeights.length ? Math.max(...pendingWeights) : 1
  const minWeight = pendingWeights.length ? Math.min(...pendingWeights) : 0

  return withStats.map((c) => ({
    ...c,
    color: c.kind === 'resolved'
      ? STATUS_COLORS.resolved
      : c.kind === 'in-progress'
        ? STATUS_COLORS.inProgress
        : heatColor(c.pendingWeight, minWeight, maxWeight),
  }))
}

const resolvedIconMarkup = renderToStaticMarkup(<CheckCircle2 color="#fff" size={18} strokeWidth={2.6} />)

function buildClusterIcon(cluster) {
  const size = Math.min(58, 36 + Math.max(0, cluster.count - 1) * 6)
  let inner
  if (cluster.kind === 'resolved') {
    inner = `<span class="cluster-marker-icon">${resolvedIconMarkup}</span>`
  } else if (cluster.kind === 'in-progress') {
    inner = `<img src="${inProgressIcon}" class="cluster-marker-img" alt="" />`
  } else {
    inner = `<img src="${complaintMarkerIcon}" class="cluster-marker-img" alt="" />`
  }
  const badge = cluster.count > 1 ? `<span class="cluster-marker-badge">${cluster.count}</span>` : ''
  const html = `<div class="cluster-marker" style="width:${size}px;height:${size}px;background:${cluster.color};">${inner}${badge}</div>`
  return L.divIcon({ html, className: 'cluster-marker-wrapper', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

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
      {locating ? '...' : <Crosshair size={20} strokeWidth={2.2} />}
    </button>
  )
}

function MapLegend() {
  return (
    <div className="map-legend">
      <div className="map-legend-title">Pin colors</div>
      <div className="map-legend-row">
        <span className="legend-swatch" style={{ background: STATUS_COLORS.resolved }} />
        Resolved
      </div>
      <div className="map-legend-row">
        <span className="legend-swatch" style={{ background: STATUS_COLORS.inProgress }} />
        Work in progress
      </div>
      <div className="map-legend-row">
        <span className="legend-swatch legend-swatch-gradient" />
        Pending — more reports = more red
      </div>
    </div>
  )
}

function ClusterPopup({ cluster }) {
  const reporterNames = [...new Set(cluster.members.map((m) => m.username).filter(Boolean))]
  const areaLabel = cluster.members[0]?.wardId || 'Unknown area'

  return (
    <div className="cluster-popup">
      <strong>{areaLabel}</strong>
      <div className="cluster-popup-stats">{cluster.count} report{cluster.count > 1 ? 's' : ''} here</div>
      {reporterNames.length > 0 && (
        <div className="cluster-popup-reporters">
          Complaint from <strong>{reporterNames[0]}</strong>
          {reporterNames.length > 1 ? ` and ${reporterNames.length - 1} more` : ''}
        </div>
      )}
      <ul className="cluster-popup-list">
        {cluster.members.slice(0, 6).map((m) => (
          <li key={m.issueId} className="cluster-popup-item">
            {m.photoUrl && <img src={m.photoUrl} alt="" className="cluster-popup-thumb" />}
            <div>
              <div className="cluster-popup-item-title">{m.title}</div>
              <div className="cluster-popup-item-meta">{m.category} · {m.status}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
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

  const userRegion = localStorage.getItem('userRegion') || ''
  const visibleIssues = userRole === 'municipality' && userRegion
    ? issues.filter((issue) => matchesRegion(issue.wardId, userRegion))
    : issues

  const clusters = useMemo(
    () => classifyClusters(clusterByDistance(visibleIssues, CLUSTER_RADIUS_METERS)),
    [visibleIssues],
  )

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
        {clusters.map((cluster, idx) => (
          <Marker key={idx} position={cluster.center} icon={buildClusterIcon(cluster)}>
            <Popup>
              <ClusterPopup cluster={cluster} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <MapLegend />
    </div>
  )
}

export default Map
