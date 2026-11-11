'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  LMS_ORIGIN, supportedCaptureExclusionOS,
  isTrustedLmsNavigation, isEmbeddedOAuthAttempt,
} = require('./policy.cjs');

const src = fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8');
const demo = fs.readFileSync(path.join(__dirname, 'demo.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

test('Windows 10 build 19041+ only, fails closed on other OS', () => {
  assert.equal(supportedCaptureExclusionOS('win32', '10.0.19041'), true);
  assert.equal(supportedCaptureExclusionOS('win32', '10.0.19045'), true);
  assert.equal(supportedCaptureExclusionOS('win32', '10.0.26100'), true);
  assert.equal(supportedCaptureExclusionOS('win32', '10.0.18363'), false);
  assert.equal(supportedCaptureExclusionOS('darwin', '24.0.0'), false);
  assert.equal(supportedCaptureExclusionOS('linux', '6.11.0'), false);
});

test('only the exact HTTPS LMS origin is allowed in protected window', () => {
  assert.equal(isTrustedLmsNavigation(LMS_ORIGIN + '/#/my-learning'), true);
  assert.equal(isTrustedLmsNavigation(LMS_ORIGIN + '/#/courses'), true);
  for(const url of [
    'http://technica-lms.minamilad939.workers.dev/',
    'https://technica-lms.minamilad939.workers.dev.evil.org/',
    'https://attacker.org/',
    'https://technica-lms.minamilad939.workers.dev@evil.org/',
    'file:///C:/secret.txt',
    'javascript:alert(1)',
    'data:text/html,evil',
    'not a URL',
    'https://technica-lms.minamilad939.workers.dev:444/',
  ]) assert.equal(isTrustedLmsNavigation(url), false, url);
});

test('Google OAuth in embedded browsers is detected (no insecure bypass)', () => {
  assert.equal(isEmbeddedOAuthAttempt('https://accounts.google.com/o/oauth2/v2/auth'), true);
  assert.equal(isEmbeddedOAuthAttempt('https://klmwiivitgbyjbynxwbg.supabase.co/auth/v1/authorize?provider=google'), true);
  assert.equal(isEmbeddedOAuthAttempt('https://klmwiivitgbyjbynxwbg.supabase.co/storage/v1/object'), false);
  assert.equal(isEmbeddedOAuthAttempt('https://example.org'), false);
});

test('content exclusion is applied BEFORE a hidden window is displayed or loaded', () => {
  const protect = src.indexOf('win.setContentProtection(true);');
  const load = src.indexOf('showPilot().catch(');
  const show = src.indexOf("win.once('ready-to-show'");
  assert.ok(protect > -1 && load > protect && show > protect);
  assert.match(src, /show: false/);
  assert.match(src, /win\.isContentProtected\(\)/);
  assert.doesNotMatch(src, /setContentProtection\(false\)/);
});

test('remote code remains sandboxed, no new windows, no downloads or OS privileges', () => {
  for (const marker of [
    'sandbox: true','contextIsolation: true','nodeIntegration: false',
    'webviewTag: false','webSecurity: true','allowRunningInsecureContent: false',
    "return {action: 'deny'};","event.preventDefault();","ses.on('will-download'",
    'ses.setPermissionRequestHandler','devTools: false',
  ]) assert.ok(src.includes(marker), marker);
  assert.doesNotMatch(src, /shell\.openExternal|executeJavaScript|nodeIntegration: true|disable-web-security/);
});

test('offline capture test and real LMS modes exist; no actual learner files bundled', () => {
  assert.match(demo, /Windows screen capture test/);
  assert.match(demo, /Video panel/);
  assert.match(demo, /PDF panel/);
  assert.match(demo, /Win \+ Shift \+ S/);
  assert.match(src, /showLms\(\)/);
  assert.match(src, /showPilot\(\)/);
  assert.equal(pkg.build.win.target[0].target, 'portable');
});
