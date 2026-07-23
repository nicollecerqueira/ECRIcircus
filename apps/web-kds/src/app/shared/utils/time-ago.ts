/** Minutes since fired — drives KDS color aging (green → yellow → red). */
export function minutesSince(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 60000);
}

export function agingTone(minutes: number): 'fresh' | 'warn' | 'late' {
  if (minutes >= 10) {
    return 'late';
  }
  if (minutes >= 5) {
    return 'warn';
  }
  return 'fresh';
}
