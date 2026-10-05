import { validateCatalog, mergeDecision } from './catalog.js';

// Validates the file, reads the current documents fresh through readExisting,
// merges, and hands the writes to commit. Nothing is written if any step before commit fails.
export async function runCatalogImport(json, { readExisting, commit }) {
  const result = validateCatalog(json);
  if (!result.ok) return { ok: false, errors: result.errors };

  const existing = await readExisting();
  const writes = [];
  const tally = { created: 0, updated: 0, revisit: 0 };
  for (const incoming of result.decisions) {
    const { create, data } = mergeDecision(existing.get(incoming.id) ?? null, incoming);
    writes.push({ id: incoming.id, create, data });
    if (create) tally.created += 1;
    else tally.updated += 1;
    if (data.status === 'revisit') tally.revisit += 1;
  }
  await commit(writes);
  return { ok: true, ...tally };
}
