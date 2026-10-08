export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="11" fill="#12182b" stroke="rgba(141,124,255,0.45)" />
      <path d="M10 23.5 18 10l8 13.5" fill="none" stroke="#8d7cff" strokeWidth="1.8" />
      <circle cx="18" cy="23.5" r="2.4" fill="#79e7ee" />
      <circle cx="10" cy="23.5" r="1.5" fill="#d9d4ff" />
      <circle cx="26" cy="23.5" r="1.5" fill="#d9d4ff" />
    </svg>
  );
}
