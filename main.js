const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');
const { getRandomPrompt } = require('./prompts');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const ANALYSIS_TIMEOUT_MS = 90_000;
const SHORTCUTS = {
  analyse: 'CommandOrControl+1',
  clear: 'CommandOrControl+2',
  visibility: 'CommandOrControl+Shift+H',
  quit: 'CommandOrControl+Shift+W'
};

let mainWindow = null;
let aiClient = null;
let analysisInProgress = false;
let activeAnalysis = null;
let nextAnalysisId = 0;

function centerWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const display = screen.getDisplayMatching(mainWindow.getBounds());
  const { x, y, width, height } = display.workArea;
  const bounds = mainWindow.getBounds();
  mainWindow.setPosition(Math.round(x + (width - bounds.width) / 2), Math.round(y + (height - bounds.height) / 2));
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(Math.round(width * 0.55), 900),
    height: Math.min(Math.round(height * 0.5), 650),
    minWidth: 480,
    minHeight: 280,
    center: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    fullscreenable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.loadFile('index.html');
}

async function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Add it to a .env file and restart SimpleGhost.');
  }
  if (!aiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

function sendAnalysisEvent(type, detail = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('analysis:event', { type, ...detail });
}

function cancelAnalysis({ clear = false } = {}) {
  const analysis = activeAnalysis;
  activeAnalysis = null;
  analysisInProgress = false;
  if (analysis) analysis.controller.abort();
  if (clear) sendAnalysisEvent('clear', { requestId: analysis?.requestId ?? null });
}

async function capturePrimaryDisplay() {
  const display = screen.getPrimaryDisplay();
  const scaleFactor = display.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.size.width * scaleFactor),
      height: Math.round(display.size.height * scaleFactor)
    }
  });
  const displayId = String(display.id);
  const source = sources.find((item) => item.display_id === displayId)
    || sources.find((item) => item.id.includes(displayId))
    || sources[0];
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Screen capture failed. Check the operating system screen-recording permission.');
  }
  return source.thumbnail.toPNG();
}

async function analyseScreen() {
  if (analysisInProgress) return;
  analysisInProgress = true;
  const requestId = ++nextAnalysisId;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Analysis timed out after 90 seconds.')), ANALYSIS_TIMEOUT_MS);
  activeAnalysis = { requestId, controller };
  sendAnalysisEvent('start', { model: MODEL, requestId });
  const wasVisible = Boolean(mainWindow?.isVisible());

  try {
    if (wasVisible) {
      mainWindow.hide();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const png = await capturePrimaryDisplay();
    if (wasVisible) {
      mainWindow.showInactive();
      centerWindow();
    }

    const client = await getAiClient();
    const stream = await client.models.generateContentStream({
      model: MODEL,
      contents: [{
        role: 'user',
        parts: [
          { text: getRandomPrompt() },
          { inlineData: { data: png.toString('base64'), mimeType: 'image/png' } }
        ]
      }],
      config: {
        abortSignal: controller.signal,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingLevel: 'LOW' }
      }
    });

    for await (const chunk of stream) {
      if (activeAnalysis?.requestId !== requestId) return;
      if (chunk.text) sendAnalysisEvent('chunk', { text: chunk.text, requestId });
    }
    if (activeAnalysis?.requestId === requestId) sendAnalysisEvent('complete', { requestId });
  } catch (error) {
    if (wasVisible && mainWindow && !mainWindow.isVisible()) mainWindow.showInactive();
    if (activeAnalysis?.requestId === requestId) {
      const message = controller.signal.aborted
        ? controller.signal.reason?.message || 'Analysis was cancelled.'
        : error?.message || 'Unexpected analysis error.';
      sendAnalysisEvent('error', { message, requestId });
    }
  } finally {
    clearTimeout(timeout);
    if (activeAnalysis?.requestId === requestId) {
      activeAnalysis = null;
      analysisInProgress = false;
    }
  }
}

function registerShortcut(accelerator, handler) {
  if (!globalShortcut.register(accelerator, handler)) console.warn(`Could not register global shortcut: ${accelerator}`);
}

function registerShortcuts() {
  registerShortcut(SHORTCUTS.analyse, analyseScreen);
  registerShortcut(SHORTCUTS.clear, () => cancelAnalysis({ clear: true }));
  registerShortcut(SHORTCUTS.visibility, () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.showInactive();
      centerWindow();
    }
  });
  registerShortcut(SHORTCUTS.quit, () => app.quit());
}

function isTrustedSender(event) {
  return Boolean(mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents);
}

ipcMain.handle('window:resize', (event, requested) => {
  if (!isTrustedSender(event)) return false;
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const display = screen.getDisplayMatching(mainWindow.getBounds());
  const width = Math.max(480, Math.min(Number(requested?.width) || 700, Math.round(display.workAreaSize.width * 0.8)));
  const height = Math.max(280, Math.min(Number(requested?.height) || 420, Math.round(display.workAreaSize.height * 0.8)));
  mainWindow.setSize(Math.round(width), Math.round(height), true);
  centerWindow();
  return true;
});

ipcMain.handle('app:action', (event, action) => {
  if (!isTrustedSender(event)) return false;
  if (action === 'analyse') analyseScreen();
  else if (action === 'clear') cancelAnalysis({ clear: true });
  else if (action === 'hide') mainWindow?.hide();
  else if (action === 'quit') app.quit();
  else return false;
  return true;
});

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  cancelAnalysis();
  globalShortcut.unregisterAll();
});
