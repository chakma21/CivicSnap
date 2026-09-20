import './SkeletonCard.css'

function SkeletonCard({ withPhoto = true }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-top">
        <span className="skeleton shimmer skeleton-avatar" />
        <div className="skeleton-card-lines">
          <span className="skeleton shimmer skeleton-line skeleton-line-short" />
          <span className="skeleton shimmer skeleton-line skeleton-line-shorter" />
        </div>
      </div>
      {withPhoto && <span className="skeleton shimmer skeleton-photo" />}
      <span className="skeleton shimmer skeleton-line" />
      <span className="skeleton shimmer skeleton-line skeleton-line-short" />
    </div>
  )
}

export default SkeletonCard
