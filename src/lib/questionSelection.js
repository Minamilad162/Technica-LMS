/**
 * Client-only demo question selector. This is NOT a secure production exam engine.
 * All source items keep their stable bankId; session-local id is 1..N.
 */
export function shuffleQuestions(source, random = Math.random) {
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createQuestionSet({
  bank,
  domainIds,
  count = 50,
  pool = 'all',
  seenIds = [],
  wrongIds = [],
  balanced = false,
  random = Math.random,
}) {
  const domains = [...new Set(domainIds || [])];
  const seen = new Set(seenIds);
  const wrong = new Set(wrongIds);
  const ids = new Set();
  const eligible = (bank || []).filter(q => {
    const key = q.bankId ?? q.id;
    if (!domains.includes(q.domainId) || ids.has(key)) return false;
    ids.add(key);
    return true;
  });
  let candidates = eligible;
  if (pool === 'unseen') candidates = eligible.filter(q => !seen.has(q.bankId ?? q.id));
  if (pool === 'mistakes') candidates = eligible.filter(q => wrong.has(q.bankId ?? q.id));
  const fallback = pool !== 'all' && candidates.length === 0;
  if (fallback) candidates = eligible;

  const requestedCount = Number.isFinite(Number(count)) ? Math.floor(Number(count)) : 50;
  const total = Math.min(Math.max(1, requestedCount), 50, candidates.length);
  let chosen;
  if (balanced && domains.length > 1) {
    // Deal one randomly shuffled question per domain in rounds. Domain order
    // is randomized each attempt and limited domains are safely exhausted.
    const queues = domains.map(domain => shuffleQuestions(candidates.filter(q => q.domainId === domain), random));
    const order = shuffleQuestions(queues.map((_, i) => i), random);
    chosen = [];
    while (chosen.length < total) {
      let filled = false;
      for (const index of order) {
        if (chosen.length >= total) break;
        const question = queues[index].pop();
        if (question) { chosen.push(question); filled = true; }
      }
      if (!filled) break;
    }
    chosen = shuffleQuestions(chosen, random);
  } else {
    chosen = shuffleQuestions(candidates, random).slice(0, total);
  }
  return {
    questions: chosen.map((q, i) => ({ ...q, id: i + 1 })),
    fallback,
    available: candidates.length,
  };
}
