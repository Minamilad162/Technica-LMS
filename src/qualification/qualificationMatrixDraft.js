export function isEvidenceMappingEditable(outcome) {
  return !outcome.claim?.state || ['draft', 'changes_requested'].includes(outcome.claim.state);
}

export function buildMatrixUpdates(units, draft, availableEvidenceIds) {
  const updates = [];
  for (const unit of units) {
    for (const outcome of unit.outcomes) {
      const mapping = {...outcome.claim?.mapping};
      let count = 0;
      for (const criterion of outcome.criteria) {
        const changes = draft.get(criterion.id);
        if (!changes) continue;
        const linked = new Set(mapping[criterion.id] || []);
        for (const [id, checked] of changes) {
          if (!availableEvidenceIds.has(id) || linked.has(id) === checked) continue;
          if (checked) linked.add(id);
          else linked.delete(id);
          count++;
        }
        if (linked.size) mapping[criterion.id] = [...linked];
        else delete mapping[criterion.id];
      }
      if (count) {
        updates.push({
          outcomeId: outcome.id,
          version: outcome.claim?.version || 0,
          mapping,
          editable: isEvidenceMappingEditable(outcome),
          count,
        });
      }
    }
  }
  return updates;
}
