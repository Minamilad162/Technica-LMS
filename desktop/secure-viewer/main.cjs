'use strict';

const path = require('node:path');
const os = require('node:os');
const {app, BrowserWindow, Menu, dialog} = require('electron');
const {LMS_ORIGIN, supportedCaptureExclusionOS, isTrustedLmsNavigation, isEmbeddedOAuthAttempt} = require('./policy.cjs');

// P68 proof-of-concept ONLY, not a DRM license server. This is Windows display
// affinity applied by Electron's native BrowserWindow.setContentProtection.
// It is installed BEFORE any content is loaded or the window is shown.
let viewer = null;
let oauthHintShown = false;

function warnIfGoogleAuthAttempt() {
  if (oauthHintShown) return;
  oauthHintShown = true;
  dialog.showMessageBox(viewer, {
    type: 'info',
    title: 'Technica Secure Viewer — Pilot',
    message: 'Google sign-in requires a separate native OAuth flow.',
    detail: 'Google blocks OAuth inside embedded browsers. For this Windows capture-protection pilot, use an existing email/password LMS login. Google login and app-to-app sign-in will be implemented separately if this pilot is approved.',
    buttons: ['Understood'],
  });
}

function installNavigationPolicy(win) {
  const contents = win.webContents;
  contents.setWindowOpenHandler(({url}) => {
    // Never create an unprotected child window, even for a trusted site.
    if (isEmbeddedOAuthAttempt(url)) warnIfGoogleAuthAttempt();
    // Other new-window requests are intentionally denied in this pilot.
    return {action: 'deny'};
  });
  contents.on('will-navigate', (event, url) => {
    if (isTrustedLmsNavigation(url)) return;
    event.preventDefault();
    if (isEmbeddedOAuthAttempt(url)) warnIfGoogleAuthAttempt();
  });
  contents.on('context-menu', event => event.preventDefault());
  contents.on('before-input-event', (event, input) => {
    const k = String(input.key || '').toLowerCase();
    const debug = k === 'f12' || (input.control && input.shift && (k === 'i' || k === 'j'));
    const print = input.control && k === 'p';
    if (debug || print) event.preventDefault();
  });
  const ses = contents.session;
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.on('will-download', event => {
    // Electron cancels and destroys the DownloadItem when prevented here.
    event.preventDefault();
  });
}

async function showPilot() {
  if (!viewer || viewer.isDestroyed()) return;
  await viewer.loadFile(path.join(__dirname, 'demo.html'));
}
async function showLms() {
  if (!viewer || viewer.isDestroyed()) return;
  await viewer.loadURL(LMS_ORIGIN + '/');
}

function createViewer() {
  // Fail closed on unsupported OS. A blank page is safer than a false claim.
  if (!supportedCaptureExclusionOS(process.platform, os.release())) {
    dialog.showErrorBox('Capture exclusion not available',
      'This pilot requires Windows 10 version 2004 (build 19041) or newer, or Windows 11. No protected content will be opened.');
    app.quit();
    return;
  }

  const win = new BrowserWindow({
    title: 'Technica Secure Viewer — Windows Pilot',
    width: 1280, height: 840, minWidth: 860, minHeight: 630,
    show: false,
    backgroundColor: '#082f38',
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: false,
      plugins: true, // Chromium's built-in PDF viewer (inside protected window)
    },
  });
  viewer = win;

  // Windows: WDA_EXCLUDEFROMCAPTURE. Must be set while window is hidden,
  // BEFORE loadFile/loadURL and BEFORE first show, not after screenshot keypress.
  win.setContentProtection(true);
  if (!win.isContentProtected()) {
    win.destroy();
    viewer = null;
    dialog.showErrorBox('Protection unavailable', 'Unable to enable native capture exclusion. No learning content was displayed.');
    app.quit();
    return;
  }

  installNavigationPolicy(win);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label: 'Technica', submenu: [
      {label: 'Capture protection demo', accelerator: 'CmdOrCtrl+1', click: () => {showPilot().catch(() => {});}},
      {label: 'Open Technica LMS', accelerator: 'CmdOrCtrl+2', click: () => {showLms().catch(() => {});}},
      {type: 'separator'},
      {label: 'Reload protected page', accelerator: 'CmdOrCtrl+R', click: () => {
        if (viewer && !viewer.isDestroyed()) viewer.webContents.reload();
      }},
      {type: 'separator'},
      {role: 'quit'},
    ]},
  ]));
  win.once('ready-to-show', () => {
    if (!win.isDestroyed() && win.isContentProtected()) win.show();
    else if (!win.isDestroyed()) {win.destroy(); app.quit();}
  });
  win.on('closed', () => {viewer = null;});
  // No real user data is loaded during the initial offline demo.
  showPilot().catch(() => {
    if (!win.isDestroyed()) win.destroy();
    app.quit();
  });
}

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    if (viewer && !viewer.isDestroyed()) {
      if (viewer.isMinimized()) viewer.restore();
      viewer.focus();
    }
  });
  app.whenReady().then(createViewer);
  app.on('window-all-closed', () => app.quit());
} else app.quit();
