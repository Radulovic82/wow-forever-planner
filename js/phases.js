export const PHASES = [
  { id: 'before-launch', label: 'Before launch', range: 'Until 3 Nov' },
  { id: 'launch-prep', label: 'Launch prep', range: 'Until the evening of 4 Nov' },
  { id: 'leveling', label: 'Leveling', range: 'Levels 1 to 60' },
  { id: 'endgame', label: 'Endgame', range: 'From 9 Dec', placeholder: 'TBD, too far away.' },
];

const DAY_MS = 86400000;
const URGENT_MS = 7 * DAY_MS;

export function groupByPhase(decisions) {
  const groups = Object.fromEntries(PHASES.map((p) => [p.id, []]));
  for (const decision of decisions) {
    if (groups[decision.phase]) groups[decision.phase].push(decision);
  }
  for (const list of Object.values(groups)) list.sort((a, b) => a.order - b.order);
  return groups;
}

export function phaseProgress(list) {
  return { decided: list.filter((x) => x.status === 'decided').length, total: list.length };
}

export function deadlineInfo(iso, nowMs) {
  const msLeft = Date.parse(iso) - nowMs;
  return {
    msLeft,
    daysLeft: Math.ceil(msLeft / DAY_MS),
    urgent: msLeft <= URGENT_MS,
    overdue: msLeft < 0,
  };
}

export function nextUp(decisions, nowMs, limit = 3) {
  return decisions
    .filter((x) => x.status !== 'decided' && x.deadline)
    .map((decision) => ({ decision, ...deadlineInfo(decision.deadline, nowMs) }))
    .sort((a, b) => a.msLeft - b.msLeft)
    .slice(0, limit);
}

// Firestore serves an empty cached answer when it cannot reach the backend.
export function loadStatus(count, fromCache) {
  return count === 0 && fromCache ? 'unreachable' : 'ready';
}

export function daysLabel({ overdue, daysLeft }) {
  if (overdue) return 'overdue';
  if (daysLeft <= 0) return 'due now';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
}
