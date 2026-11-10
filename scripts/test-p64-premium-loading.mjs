import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(p,'utf8');
const loader=file('src/components/PremiumLoading.jsx');
const css=file('src/components/premiumLoading.css');
const app=file('src/App.jsx');
assert.match(loader,/role="status" aria-live="polite" aria-label="Loading"/);
assert.match(loader,/technica-logo\.webp/);
assert.match(loader,/acceptedVariants\.has\(variant\)/);
assert.doesNotMatch(loader,/database|Supabase|Verifying|JWT|access required/i);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/100dvh/);
assert.match(css,/tlm-premium-loading--compact/);
assert.match(app,/if\(authLoading\)return <PremiumLoading variant="fullscreen"\/>/);
assert.match(app,/React\.Suspense fallback=\{<PremiumLoading variant="page"\/>\}/);
assert.match(app,/restorePortalAccount\(\)/);
assert.match(app,/subscribeToPortalAuth\(/);
assert.match(app,/if\(!auth\)/);
const files=[
 'src/production/AdminToolsWorkspace.jsx','src/production/LiveLearnerPortal.jsx',
 'src/production/LiveLearnerWorkspace.jsx','src/production/LiveCoursesPage.jsx',
 'src/production/LiveCourseBuilder.jsx','src/production/AdminCoursePreview.jsx',
 'src/production/LiveLearning.jsx','src/production/LivePracticePortal.jsx',
 'src/production/LiveMockPortal.jsx','src/production/LiveExamPracticeHub.jsx',
 'src/production/LiveMyProfile.jsx','src/production/LiveLearnerProgress.jsx',
 'src/production/SubscriptionPlans.jsx','src/production/AdminSubscriptionsPanel.jsx',
 'src/production/AdminToolsPanels.jsx','src/production/NotificationsPage.jsx',
 'src/production/KillMistakesPage.jsx','src/production/LiveReleaseReadiness.jsx'
];
for(const p of files){
 const src=file(p);
 assert.match(src,/import PremiumLoading from '\.\.\/components\/PremiumLoading\.jsx';/);
 assert.match(src,/<PremiumLoading variant="(page|compact)"\/>/);
}
const admin=file('src/production/AdminToolsWorkspace.jsx');
assert.match(admin,/verifiedLiveAdmin\(db\)/);
assert.match(admin,/if\(state==='checking'\)return <PremiumLoading/);
assert.match(admin,/state!=='ready'/);
assert.match(file('src/production/LiveLearnerPortal.jsx'),/db\.auth\.getUser\(\)/);
assert.match(file('src/production/LiveExamPracticeHub.jsx'),/fetchLiveLearningCatalog\(db\)/);
assert.match(file('src/production/LiveMockPortal.jsx'),/mayReadLiveCourse\(catalog,viewingCourse\)/);
assert.match(file('src/production/LiveLearnerWorkspace.jsx'),/fetchP15Catalog\(db,user\)/);
console.log('P64 premium loading across authenticated LMS routes PASS');
