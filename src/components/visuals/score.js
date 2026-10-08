'use client';

import { useEffect, useState } from 'react';
import { scoreLabel, scoreTone } from '@/lib/utils';

export function ScoreRing({ score, caption = 'SEO health', delta }) {
  const [shown, setShown] = useState(0);
  const value = Number.isFinite(Number(score)) ? Number(score) : 0;
  const tone = scoreTone(value);
  const color = tone === 'good' ? '#3dd68c' : tone === 'fair' ? '#8d7cff' : tone === 'watch' ? '#f0b429' : tone === 'bad' ? '#ff5d73' : '#93a0b8';
  const radius = 62;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, shown)) / 100) * circ;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="ring-wrap">
      <div className="ring" aria-hidden="true">
        <svg viewBox="0 0 168 168" aria-hidden="true">
          <circle cx="84" cy="84" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
          <circle
            cx="84"
            cy="84"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="ring-copy">
          <div>
            <strong>{shown}</strong>
            <small>/100</small>
          </div>
        </div>
      </div>
      <div>
        <span className="label">{caption}</span>
        <h2 style={{ marginTop: 6 }}>{scoreLabel(value)}</h2>
        {delta ? <p className="lede" style={{ marginTop: 8 }}>{delta}</p> : null}
      </div>
    </div>
  );
}

export function BreakdownBars({ breakdown }) {
  const rows = [
    ['Technical', breakdown?.technical],
    ['On-page', breakdown?.on_page],
    ['Content', breakdown?.content],
    ['Vitals', breakdown?.core_web_vitals],
    ['Schema', breakdown?.schema],
  ];
  return (
    <div className="bars">
      {rows.map(([label, amount]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Number(amount) || 0}%` }} /></div>
          <b>{Number.isFinite(Number(amount)) ? amount : '—'}</b>
        </div>
      ))}
    </div>
  );
}
