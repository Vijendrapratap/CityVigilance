export function Mark({ dx = 0, dy = 0, size = 72 }: { dx?: number; dy?: number; size?: number }) {
  const pupilX = 40 + Math.max(-5, Math.min(5, dx * 10));
  const pupilY = 40 + Math.max(-5, Math.min(5, dy * 10));
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <circle className="mark-spin" cx="40" cy="40" r="31" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="148 48" />
      <circle cx="40" cy="40" r="18" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M40 6v8M40 66v8M6 40h8M66 40h8" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx={pupilX} cy={pupilY} r="2.4" fill="currentColor" />
    </svg>
  );
}
