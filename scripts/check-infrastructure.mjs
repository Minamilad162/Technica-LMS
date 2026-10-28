import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const required = [
  'TECHNICA_LMS_MASTER_BLUEPRINT.md',
  'AGENTS.md',
  'UI_COMPONENT_REFERENCE_GUIDE.md',
  'docs/infrastructure/README.md',
  'docs/infrastructure/source/MASTER_PROJECT_PROMPT_GITHUB_SECURITY_READY.md',
  'docs/infrastructure/source/PROJECT_AUTOMATED_AUDIT_INSTRUCTIONS.md',
  'docs/infrastructure/source/UI_COMPONENT_REFERENCE_GUIDE_2026-09-15_UPLOADED.md',
  'docs/current/LOGIC_REGISTRY.md',
  'docs/current/AUDIT_PLAYBOOK.md',
  'docs/current/RELEASE_SECURITY_CHECKLIST.md',
  'docs/current/SECURITY_PLAN.md',
  'docs/current/TEST_PLAN.md',
  'PROJECT_CONTEXT.md',
  'SECURITY.md',
  '.github/workflows/ci-security.yml',
  '.github/dependabot.yml',
];
for (const p of required) assert.ok(existsSync(resolve(root, p)), 'Missing infrastructure file: ' + p);

const blueprint = readFileSync(resolve(root, 'TECHNICA_LMS_MASTER_BLUEPRINT.md'), 'utf8');
const agents = readFileSync(resolve(root, 'AGENTS.md'), 'utf8');
const registry = readFileSync(resolve(root, 'docs/current/LOGIC_REGISTRY.md'), 'utf8');
assert.ok(blueprint.includes('Course → Domain → Topic → Lesson'), 'Taxonomy must remain in blueprint');
assert.ok(blueprint.includes('300 minutes'), 'Mock must remain 300 minutes');
assert.ok(agents.includes('TECHNICA_LMS_MASTER_BLUEPRINT.md'), 'Agents must use canonical blueprint');
assert.ok(registry.includes('Mock Exclusive'), 'Logic registry must protect mock exclusivity');

// Check tracked Git paths, not local untracked developer secrets.
// A .env file may legitimately exist on a developer's machine as long as it is NOT committed.
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter(Boolean);
for (const p of tracked) {
  const file = p.split('/').at(-1);
  const isSecret = file === '.env' || (file.startsWith('.env.') && file !== '.env.example')
    || file === '.dev.vars' || file.startsWith('.dev.vars.');
  assert.ok(!isSecret, 'Tracked secret file must be removed from Git index: ' + p);
}
const ignore = readFileSync(resolve(root, '.gitignore'), 'utf8');
assert.ok(ignore.includes('.wrangler'), 'Missing .wrangler ignore');
assert.ok(ignore.includes('.dev.vars'), 'Missing .dev.vars ignore');

console.log('PASS: infrastructure references, governance, security and core LMS rules are present.');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (!existsSync(resolve(root, 'package-lock.json'))) {
  console.warn('GAP: package-lock.json missing; npm ci reproducibility not yet satisfied.');
}
if (!pkg.scripts?.typecheck) {
  console.warn('GAP: TypeScript typecheck not yet enabled in legacy React/JS demo.');
}
console.log('INFO: infrastructure PASS is not production deployment certification.');
