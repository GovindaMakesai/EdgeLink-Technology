export default function Loading() {
  return (
    <div className="stack">
      <div className="shimmer" style={{ height: 84 }} />
      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="shimmer" style={{ height: 92 }} />)}
      </div>
      <div className="shimmer" style={{ height: 280 }} />
    </div>
  );
}
