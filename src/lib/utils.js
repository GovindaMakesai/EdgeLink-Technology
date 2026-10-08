import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function scoreTone(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'neutral';
  if (value >= 90) return 'good';
  if (value >= 70) return 'fair';
  if (value >= 50) return 'watch';
  return 'bad';
}

export function scoreLabel(score) {
  const tone = scoreTone(score);
  if (tone === 'good') return 'Healthy';
  if (tone === 'fair') return 'Needs improvement';
  if (tone === 'watch') return 'Attention';
  if (tone === 'bad') return 'Critical';
  return 'Pending';
}

export function domainFromUrl(raw) {
  const url = new URL(raw);
  return url.hostname.replace(/^www\./, '').toLowerCase();
}

export function elapsedLabel(startedAt, endedAt) {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  if (minutes <= 0) return `${remain}s`;
  return `${minutes}m ${remain}s`;
}
