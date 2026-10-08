export default function Loading() {
  return (
    <div className="stack">
      <div className="shimmer skeleton-title" />
      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="shimmer" style={{ height: 92 }} />)}
      </div>
      <div className="hero-grid">
        <div className="shimmer skeleton-panel" />
        <div className="shimmer skeleton-panel" />
      </div>
    </div>
  );
}
