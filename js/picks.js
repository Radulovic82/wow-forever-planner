export function togglePick(chosen, optionId, maxPicks = 1) {
  if (chosen.includes(optionId)) return chosen.filter((id) => id !== optionId);
  if (maxPicks === 1) return [optionId];
  if (chosen.length >= maxPicks) return [...chosen];
  return [...chosen, optionId];
}

const STATUSES = ['open', 'decided', 'revisit'];

export function ownerStateError(decision, state) {
  if (!STATUSES.includes(state.status)) return 'Unknown status.';
  if (state.chosen.some((id) => !decision.options.some((o) => o.id === id))) {
    return 'A chosen option does not exist.';
  }
  if (state.status === 'decided') {
    if (decision.kind === 'freeform') {
      if (!state.answer.trim()) return 'Write your answer before marking this decided.';
    } else if (state.chosen.length === 0) {
      return 'Pick an option before marking this decided.';
    }
  }
  return null;
}

// Chosen ids that the decision no longer offers (after a re-import removed an option or changed the kind).
export function danglingChoices(decision, chosen) {
  return chosen.filter((id) => !decision.options.some((o) => o.id === id));
}

export function pruneChosen(decision, chosen) {
  return chosen.filter((id) => decision.options.some((o) => o.id === id));
}

// What a decided decision concluded: the picked option names, or the written answer.
export function conclusion(decision, state) {
  if (decision.kind === 'freeform') return state.answer.trim();
  return state.chosen.map((id) => (decision.options.find((o) => o.id === id) || {}).name || id).join(', ');
}

export function phaseSummary(list) {
  return list
    .filter((d) => d.status === 'decided')
    .map((d) => conclusion(d, d))
    .filter((text) => text.length > 0)
    .join(', ');
}
