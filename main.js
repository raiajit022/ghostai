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

// Function to center window on screen
function centerWindow(window) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowBounds = window.getBounds();
  
  const x = Math.floor((width - windowBounds.width) / 2);
  const y = Math.floor((height - windowBounds.height) / 2);
  
  window.setPosition(x, y);
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Calculate initial size (50% of screen width, 40% of screen height)
  const initialWidth = Math.floor(width * 0.5);
  const initialHeight = Math.floor(height * 0.4);

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    backgroundColor: '#00000000', // Fully transparent background
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
    // Make window work in fullscreen mode
    fullscreenable: true,
    // Remove window type to make it work in fullscreen
    type: undefined,
    // Make window ignore mouse events
    focusable: false,
    // Start at the center of the screen
    center: true
  });

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents);

  // Make window permanently unclickable
  mainWindow.setIgnoreMouseEvents(true);

  // Center window explicitly after creation
  centerWindow(mainWindow);

  // Load the HTML file
  mainWindow.loadFile('index.html');

  // Listen to resize events to keep window centered
  mainWindow.on('resize', () => {
    centerWindow(mainWindow);
  });

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
      // Re-center when showing
      centerWindow(mainWindow);
    }
  });

  // Screenshot capture shortcut - CMD+1
  globalShortcut.register('CommandOrControl+1', () => {
    captureScreenshot();
  });
  
  // Clear screen shortcut - CMD+2
  globalShortcut.register('CommandOrControl+2', () => {
    mainWindow.webContents.send('clear-screen');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Set opacity level - make it slightly less opaque
  mainWindow.setOpacity(0.7);

  // Stay visible in fullscreen
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, "floating", 1);

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
      // Re-center the window
      centerWindow(mainWindow);
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

// Expose the centerWindow function to renderer process
ipcMain.handle('center-window', () => {
  if (mainWindow) {
    centerWindow(mainWindow);
    return true;
  }
  return false;
});
