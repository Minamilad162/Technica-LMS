// Canonical demo course authoring tree: Course > Domain > Topic > Lesson.
// Existing legacy modules are kept intact. They are shown under an explicitly
// UNMAPPED legacy domain, never misclassified into ASP exam blueprint domains.
const clone = value => JSON.parse(JSON.stringify(value));
export const newHierarchyId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2)}`;

export function getCourseHierarchy(state, courseId, legacyModules = []) {
  const saved = state?.courseHierarchies?.[courseId];
  if (Array.isArray(saved)) return saved;
  if (!legacyModules.length) return [];
  return [{
    id: `legacy-domain-${courseId}`,
    title: 'Unmapped legacy content',
    legacyUnmapped: true,
    topics: legacyModules.map(module => ({
      id: `legacy-topic-${module.id}`,
      title: module.title || 'Legacy topic',
      lessons: (module.lessons || []).map(lesson => ({
        ...clone(lesson), id: String(lesson.id), title: lesson.title || 'Untitled lesson',
        type: lesson.type || 'Text'
      }))
    }))
  }];
}

export function hierarchySummary(domains) {
  return {
    domains: domains.length,
    topics: domains.reduce((total, d) => total + (d.topics || []).length, 0),
    lessons: domains.reduce((total, d) =>
      total + (d.topics || []).reduce((count, t) => count + (t.lessons || []).length, 0), 0)
  };
}

export function validateCourseHierarchy(domains) {
  if (!Array.isArray(domains)) return 'Domains must be an array';
  const ids = new Set();
  const visit = (node, type) => {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id)) return `Duplicate or missing ${type} ID`;
    ids.add(node.id);
    if (!node.title || !String(node.title).trim()) return `${type} title is required`;
    return null;
  };
  for (const domain of domains) {
    let problem = visit(domain, 'Domain'); if (problem) return problem;
    if (!Array.isArray(domain.topics)) return 'Domain topics must be an array';
    for (const topic of domain.topics) {
      problem = visit(topic, 'Topic'); if (problem) return problem;
      if (!Array.isArray(topic.lessons)) return 'Topic lessons must be an array';
      for (const lesson of topic.lessons) {
        problem = visit(lesson, 'Lesson'); if (problem) return problem;
        if (!['Text','PDF','Video','Quiz','Image'].includes(lesson.type)) return 'Unknown lesson type';
      }
    }
  }
  return null;
}

export function moveItem(items, id, direction) {
  const result = [...items], from = result.findIndex(item => item.id === id), to = from + direction;
  if (from < 0 || to < 0 || to >= result.length) return result;
  [result[from], result[to]] = [result[to], result[from]];
  return result;
}
