/** Pure, reusable quiz navigation rules shared by Practice and Assessment.
 * A question is answered even when its chosen option index is 0.
 */
export function getUnansweredQuestionIds(questionCount, answers = {}) {
  return Array.from({length: Math.max(0, Number(questionCount) || 0)}, (_, i) => i + 1)
    .filter(id => answers?.[id] === undefined || answers?.[id] === null);
}

/** Only questions the learner left unanswered are marked as skipped before final review. */
export function getSkippedQuestionIds(questionCount, answers = {}, visited = []) {
  const unanswered = new Set(getUnansweredQuestionIds(questionCount, answers));
  return [...new Set(visited)].filter(id => unanswered.has(id));
}

/** Record that a question was left (not merely displayed) in the navigator. */
export function markQuestionLeft(visited = [], questionId, questionCount) {
  if (!Number.isInteger(questionId) || questionId < 1 || questionId > questionCount) return visited;
  return visited.includes(questionId) ? visited : [...visited, questionId];
}
