'use strict';

// Predict 360 desktop app.
//
// This is a dedicated window for the Predict 360 check-in. It loads the live app
// and you do a check-in by typing your two sentences INTO the window, exactly as
// on the website. It does NOT run in the background and does NOT record anything
// you type in other apps — only the timing of the keys you press in the check-in
// box, while that box is focused, the same as the web version.

const { app, BrowserWindow, Menu, shell } = require('electron');

// Point at the deployed app by default; override for local testing, e.g.
//   set PREDICT360_URL=http://localhost:3000 && npm start
const APP_URL = process.env.PREDICT360_URL || 'https://predict360.vercel.app';
const appOrigin = new URL(APP_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 880,
    minHeight: 600,
    title: 'Predict 360',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(APP_URL);

  // Plain external links (the repo, docs) open in the real browser. Same-origin
  // popups and the sign-in provider's popup open as a normal window so sign-in works.
  win.webContents.setWindowOpenHandler(({ url }) => {
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      return { action: 'deny' };
    }
    const isAuth = /(^https:\/\/([a-z0-9-]+\.)*clerk\.|accounts\.google\.com)/i.test(url);
    if (origin === appOrigin || isAuth) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
