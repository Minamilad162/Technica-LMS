/**
 * Technica LMS page entrance choreography.
 * Only animation order, never data state, permissions, or timer progression.
 * Adapted from UI_COMPONENT_REFERENCE_GUIDE.md: Section 6 (E-learning) and Bencho/Coterie.
 */
const beat = (selector, start = 0, step = 0, max = 1, variant = 'up') =>
  ({selector, start, step, max, variant});

const shared = [
  beat('.breadcrumb', 0, 0, 1, 'fade'),
  beat('h1', 48, 0, 1, 'up'),
  beat('.page-subtitle', 110, 0, 1, 'fade'),
];

const plans = {
  home: [
    beat('.home-greeting', 0, 0, 1, 'fade'),
    beat('.home-headline', 65, 0, 1, 'up'),
    beat('.mobile-search-wrap', 115, 0, 1, 'fade'),
    beat('.home-top-grid > .continue-hero', 145, 0, 1, 'left'),
    beat('.home-top-grid > .review-hero', 250, 0, 1, 'right'),
    beat('.asp-home-title, .section-heading', 315, 0, 2, 'up'),
    beat('.filter-pills > *', 320, 55, 4, 'up'),
    beat('.course-grid > *', 370, 75, 6, 'up'),
    beat('.asp-home-panel', 360, 0, 1, 'up'),
    beat('.asp-home-domains > *', 420, 60, 5, 'pop'),
    beat('.weekly-grid > *', 490, 85, 3, 'up'),
  ],
  practice: [
    ...shared,
    beat('.steps .step', 150, 80, 3, 'pop'),
    beat('.steps .step-line', 175, 80, 2, 'fade'),
    beat('.practice-main > .step-label', 180, 80, 4, 'up'),
    beat('.course-choice-grid > *', 235, 85, 3, 'pop'),
    beat('.practice-selects > *', 235, 80, 2, 'up'),
    beat('.practice-topics > *', 305, 65, 5, 'pop'),
    beat('.option-row', 410, 75, 4, 'up'),
    beat('.practice-summary', 270, 0, 1, 'right'),
  ],
  courses: [
    ...shared,
    beat('.admin-course-filters > *', 135, 65, 4, 'pop'),
    beat('.admin-course-card', 230, 78, 7, 'up'),
  ],
  analytics: [
    beat('.analytics-top', 0, 0, 1, 'up'),
    beat('.analytics-stats > *', 125, 85, 4, 'pop'),
    beat('.analytics-mid > *', 320, 105, 2, 'up'),
    beat('.asp-analytics-panel', 420, 0, 1, 'up'),
    beat('.asp-coverage-item', 450, 58, 5, 'fade'),
    beat('.learners-panel', 475, 0, 1, 'up'),
  ],
  builder: [
    beat('.breadcrumb', 0, 0, 1, 'fade'),
    beat('.builder-header', 80, 0, 1, 'up'),
    beat('.builder-steps > *', 155, 65, 4, 'pop'),
    beat('.builder-content-title', 245, 0, 1, 'up'),
    beat('.module-panel', 275, 75, 5, 'up'),
    beat('.builder-aside-card', 315, 85, 3, 'right'),
    beat('.builder-tab-body', 275, 0, 1, 'up'),
    beat('.admin-config-grid > *', 325, 65, 4, 'up'),
  ],
  assessment: [
    ...shared,
    beat('.assessment-banner', 155, 0, 1, 'left'),
    beat('.assessment-stat-grid > *', 245, 78, 4, 'pop'),
    beat('.assessment-config-panel', 135, 0, 1, 'up'),
    beat('.assessment-config-panel .course-choice', 195, 85, 2, 'pop'),
    beat('.assessment-content-grid > *', 415, 100, 2, 'up'),
    beat('.instructions > *', 475, 65, 4, 'fade'),
  ],
  results: [
    ...shared,
    beat('.review-course-intro', 135, 0, 1, 'up'),
    beat('.review-course-list > *', 210, 95, 6, 'up'),
    beat('.result-main-card', 155, 0, 1, 'left'),
    beat('.result-stats > .result-tile', 250, 95, 3, 'pop'),
    beat('.results-detail-grid > *', 395, 110, 2, 'up'),
  ],
  directory: [
    ...shared,
    beat('.learners-panel', 195, 0, 1, 'up'),
    beat('.learners-table tbody tr', 265, 40, 5, 'fade'),
  ],
  library: [
    beat('.library-heading', 0, 0, 1, 'up'),
    beat('.domain-filters > *', 120, 47, 6, 'pop'),
    beat('.saved-head', 240, 0, 1, 'up'),
    beat('.bank-list-meta', 290, 0, 1, 'fade'),
    beat('.bank-entry', 325, 55, 6, 'up'),
    beat('.bank-pagination', 430, 0, 1, 'fade'),
  ],
  auth: [
    beat('.auth-brand', 0, 0, 1, 'fade'),
    beat('.auth-story-bottom h2', 100, 0, 1, 'left'),
    beat('.auth-story-bottom > p', 170, 0, 1, 'fade'),
    beat('.auth-perks > *', 230, 70, 4, 'pop'),
    beat('.auth-card-heading', 100, 0, 1, 'up'),
    beat('.auth-form-card h1', 125, 0, 1, 'up'),
    beat('.auth-description', 175, 0, 1, 'fade'),
    beat('.auth-field', 225, 75, 6, 'up'),
    beat('.auth-options, .auth-checkbox', 320, 0, 2, 'fade'),
    beat('.auth-main-button, .auth-demo-login-button, .auth-alt-button', 385, 65, 3, 'pop'),
  ],
  quiz: [
    // A timed assessment must NEVER stage/delay answer buttons or timer controls.
    beat('.quiz-status', 0, 0, 1, 'fade'),
    beat('.question-panel', 65, 0, 1, 'fade'),
    beat('.navigator-panel', 100, 0, 1, 'fade'),
  ],
};

export const MOTION_PLANS = plans;
export const MAX_ENTRANCE_DELAY_MS = 550;
export const getPageMotionPlan = pathname => {
  if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password') return plans.auth;
  if (pathname === '/home' || pathname === '/my-learning') return plans.home;
  if (pathname === '/practice') return plans.practice;
  if (pathname === '/analytics' || pathname === '/reports') return plans.analytics;
  if (pathname === '/courses') return plans.courses;
  if (pathname === '/builder') return plans.builder;
  if (pathname === '/assessments') return plans.assessment;
  if (pathname === '/results' || pathname === '/practice/results') return plans.results;
  if (pathname === '/learners') return plans.directory;
  if (pathname === '/question-bank') return plans.library;
  if (pathname === '/practice/session' || pathname === '/assessments/take') return plans.quiz;
  return shared;
};
export const capMotionDelay = (delay, nearTop = true) =>
  Math.max(0, Math.min(nearTop ? MAX_ENTRANCE_DELAY_MS : 110, delay));
