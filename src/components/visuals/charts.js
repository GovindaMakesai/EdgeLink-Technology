'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  background: '#12182b',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#eef2ff',
};

export function QueryChart({ rows }) {
  const data = (rows || []).map((row) => ({
    name: row.query.length > 12 ? `${row.query.slice(0, 12)}…` : row.query,
    clicks: row.clicks,
    impressions: row.impressions,
  }));
  if (!data.length) return <p className="lede">Search queries appear after an audit finishes.</p>;
  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={14} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#93a0b8', fontSize: 11 }} interval="preserveStartEnd" minTickGap={18} height={36} />
          <YAxis tick={{ fill: '#93a0b8', fontSize: 11 }} width={36} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="clicks" fill="#8d7cff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankBars({ items }) {
  const rows = items || [];
  if (!rows.length) return <p className="lede">Ranking rows appear after the DataForSEO step.</p>;
  const max = Math.max(...rows.map((item) => item.rank_absolute || 1));
  return (
    <div className="bars">
      {rows.map((item) => (
        <div className="bar-row" key={item.domain}>
          <span>#{item.rank_absolute}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(12, 100 - ((item.rank_absolute - 1) / max) * 80)}%` }} />
          </div>
          <b className="bar-value" title={item.domain}>{item.domain.split('.')[0]}</b>
        </div>
      ))}
    </div>
  );
}
