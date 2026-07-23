/** "há 3 min" style relative time (Angular pipe → pure function). */
export function timeAgo(iso: string, now = Date.now()): string {
  const secs = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) {
    return `${secs}s`;
  }
  const mins = Math.floor(secs / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}min`;
}

/** Minutes since an ISO timestamp — used for KDS color aging. */
export function minutesSince(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 60000);
}
