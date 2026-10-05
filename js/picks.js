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
