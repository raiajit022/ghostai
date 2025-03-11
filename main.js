const { app, BrowserWindow, globalShortcut, screen, desktopCapturer, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Initialize remote module
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

// Global window reference
let mainWindow;
const cacheDir = path.join(os.tmpdir(), 'ghost-assistant-cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.6),
    height: Math.floor(height * 0.6),
    backgroundColor: '#33333300',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // Make window always on top
    alwaysOnTop: true,
    // Make window frameless
    frame: false,
    // Make window transparent
    transparent: true,
    // Make window skip taskbar
    skipTaskbar: true,
    // Disable window shadow
    hasShadow: false,
    // Prevent from showing in screen captures
    excludedFromShownOnAllWorkspaces: true,
    // Set window type that most screen capture tools ignore
    type: 'toolbar',
    // Make window ignore mouse events
    focusable: false
  });

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents);

  // Make window permanently unclickable
  mainWindow.setIgnoreMouseEvents(true);

  // Load the HTML file
  mainWindow.loadFile('index.html');

  // Quit app shortcut
  globalShortcut.register('CommandOrControl+W', () => {
    app.quit();
  });

  // Toggle visibility
  globalShortcut.register('CommandOrControl+H', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  // Screenshot capture shortcut
  globalShortcut.register('CommandOrControl+1', () => {
    captureScreenshot();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Set opacity level
  mainWindow.setOpacity(0.8);

  // Create or clear the screenshot cache directory
  clearOldCache();
}

// Function to capture screenshot
async function captureScreenshot() {
  try {
    // Hide the app window temporarily to avoid capturing it
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
      // Give time for the window to hide
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: {
        width: primaryDisplay.size.width,
        height: primaryDisplay.size.height
      }
    });
    
    const primarySource = sources.find(source => 
      source.display_id === primaryDisplay.id.toString() || 
      source.id.includes(primaryDisplay.id.toString()) ||
      source.name.toLowerCase().includes('entire screen') ||
      source.name.toLowerCase().includes('screen 1')
    );
    
    if (!primarySource) {
      throw new Error('Primary display source not found');
    }

    // Save screenshot to cache
    const timestamp = new Date().getTime();
    const screenshotPath = path.join(cacheDir, `screenshot-${timestamp}.png`);
    const screenshotBuffer = primarySource.thumbnail.toPNG();
    fs.writeFileSync(screenshotPath, screenshotBuffer);

    // Show the window again if it was visible before
    if (wasVisible) {
      mainWindow.show();
    }

    // Send the screenshot to renderer process for processing
    mainWindow.webContents.send('process-screenshot', screenshotPath);
    
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    if (mainWindow) {
      mainWindow.webContents.send('screenshot-error', error.message);
    }
  }
}

// Function to clean up old screenshots (older than 3 hours)
function clearOldCache() {
  try {
    const files = fs.readdirSync(cacheDir);
    const now = new Date().getTime();
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > threeHoursInMs) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // Set up a timer to clear old cache every hour
  setInterval(clearOldCache, 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
