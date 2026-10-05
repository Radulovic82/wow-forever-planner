export const LAUNCH_ISO = '2026-11-04T23:00:00Z';
export const LAUNCH_MS = Date.parse(LAUNCH_ISO);

// Before launch the numbers count down (partial seconds round up).
// From the launch instant on they count elapsed time (partial seconds round down).
export function getCountdown(nowMs, launchMs = LAUNCH_MS) {
  const diffMs = launchMs - nowMs;
  const live = diffMs <= 0;
  let rest = live ? Math.floor(Math.abs(diffMs) / 1000) : Math.ceil(diffMs / 1000);
  const days = Math.floor(rest / 86400);
  rest %= 86400;
  const hours = Math.floor(rest / 3600);
  rest %= 3600;
  const minutes = Math.floor(rest / 60);
  const seconds = rest % 60;
  return { live, days, hours, minutes, seconds };
}

const zagreb = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zagreb',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatZagreb(ms) {
  const parts = zagreb.formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} Zagreb time`;
}

export function formatDeadline(iso) {
  return formatZagreb(Date.parse(iso));
}

export function formatCompact(cd) {
  if (cd.live) return `Live for ${cd.days}d ${cd.hours}h ${cd.minutes}m`;
  return `${cd.days}d ${cd.hours}h ${cd.minutes}m ${cd.seconds}s`;
}
