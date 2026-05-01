/**
 * Format a UTC datetime string from SQLite (e.g. "2026-04-05 14:30:00")
 * into a human-friendly relative or absolute label.
 */
export function formatRelativeDate(utcDateStr: string): string {
  // SQLite datetime('now') omits the timezone — append 'Z' to parse as UTC.
  // Other UTC ISO strings (e.g. from Date.toISOString()) already end in 'Z',
  // so don't double-append.
  const needsZ = !/[Zz]$/.test(utcDateStr);
  const date = new Date(needsZ ? utcDateStr + 'Z' : utcDateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  }).format(date);
}
