'use strict';

// P68: exact allowlist for the current test deployment. Change deliberately
// when the LMS moves to its permanent origin; never accept arbitrary URLs.
const LMS_ORIGIN = 'https://technica-lms.minamilad939.workers.dev';
const MIN_WINDOWS_BUILD = 19041; // Windows 10 2004; WDA_EXCLUDEFROMCAPTURE

function supportedCaptureExclusionOS(platform, release) {
  if (platform !== 'win32') return false;
  const parts = /^10\.0\.(\d+)(?:\.|$)/.exec(String(release ?? ''));
  return Boolean(parts && Number(parts[1]) >= MIN_WINDOWS_BUILD);
}

function isTrustedLmsNavigation(target) {
  try {
    const url = new URL(target);
    return url.origin === LMS_ORIGIN &&
      url.protocol === 'https:' &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

function isEmbeddedOAuthAttempt(target) {
  try {
    const url = new URL(target);
    return url.origin === 'https://accounts.google.com' ||
      (url.origin === 'https://klmwiivitgbyjbynxwbg.supabase.co' &&
       url.pathname.startsWith('/auth/v1/authorize'));
  } catch { return false; }
}

module.exports = {
  LMS_ORIGIN,
  MIN_WINDOWS_BUILD,
  supportedCaptureExclusionOS,
  isTrustedLmsNavigation,
  isEmbeddedOAuthAttempt,
};
