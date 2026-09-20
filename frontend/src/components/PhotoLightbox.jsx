import { useState } from 'react'
import { X } from 'lucide-react'
import './PhotoLightbox.css'

function PhotoLightbox({ src, alt, onClose }) {
  const [zoomed, setZoomed] = useState(false)

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2.2} />
      </button>
      <img
        src={src}
        alt={alt}
        className={`lightbox-image ${zoomed ? 'zoomed' : ''}`}
        onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z) }}
      />
    </div>
  )
}

export default PhotoLightbox
