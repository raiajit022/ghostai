const fs = require('fs');
const path = require('path');
const { desktopCapturer } = require('electron');
const MemoryOptimizer = require('./memory-optimizer');

// Process name camouflage
process.title = process.env.GHOST_PROCESS_NAME || 'com.apple.CoreGraphics.ImageIO';

// Initialize memory optimizer
const memoryOptimizer = new MemoryOptimizer({
  maxHeapSize: 25 * 1024 * 1024, // 25MB max for image worker
  gcInterval: 15000 // More frequent GC for image processing
});

// Start the memory optimizer
memoryOptimizer.startOptimizers();

// Handle messages from parent process
process.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'CAPTURE_SCREENSHOT':
        await captureScreenshot(message.cacheDir, message.display);
        break;
        
      case 'PROCESS_SCREENSHOT':
        const imageData = await processScreenshot(message.screenshotPath);
        process.send({ 
          type: 'SCREENSHOT_PROCESSED', 
          imageData,
          requestId: message.requestId 
        });
        break;
        
      case 'MEMORY_CHECK':
        const memoryUsage = process.memoryUsage();
        process.send({ type: 'MEMORY_USAGE', rss: memoryUsage.rss });
        break;
        
      case 'CLEANUP':
        cleanup();
        break;
    }
  } catch (error) {
    console.error('Error in worker processing:', error);
    process.send({ 
      type: 'ERROR', 
      error: { message: error.message, stack: error.stack },
      requestId: message.requestId 
    });
    
    if (message.type === 'CAPTURE_SCREENSHOT') {
      process.send({
        type: 'SCREENSHOT_ERROR',
        error: error.message
      });
    }
  }
});

// Function to capture screenshot
async function captureScreenshot(cacheDir, displayInfo) {
  try {
    // Get the screen sources
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: {
        width: displayInfo.width,
        height: displayInfo.height
      }
    });
    
    // Find the primary display source
    const primarySource = sources.find(source => 
      source.display_id === displayInfo.id.toString() || 
      source.id.includes(displayInfo.id.toString()) ||
      source.name.toLowerCase().includes('entire screen') ||
      source.name.toLowerCase().includes('screen 1')
    );
    
    if (!primarySource) {
      throw new Error('Primary display source not found');
    }

    // Save screenshot to cache
    const timestamp = new Date().getTime();
    const screenshotPath = path.join(cacheDir, `screenshot-${timestamp}.png`);
    
    // Get the PNG data from the thumbnail
    const pngData = primarySource.thumbnail.toPNG();
    
    // Write the file
    fs.writeFileSync(screenshotPath, pngData);
    
    // Send success message
    process.send({
      type: 'SCREENSHOT_TAKEN',
      screenshotPath: screenshotPath
    });
    
    // Force GC after screenshot is taken
    memoryOptimizer.forceGarbageCollection();
    
  } catch (error) {
    console.error('Error in screenshot capture:', error);
    process.send({
      type: 'SCREENSHOT_ERROR',
      error: error.message
    });
  }
}

// Process screenshot image - simplified without canvas
async function processScreenshot(screenshotPath) {
  try {
    // Check if the file exists
    if (!fs.existsSync(screenshotPath)) {
      throw new Error(`Screenshot file not found: ${screenshotPath}`);
    }
    
    // Read screenshot file - directly use the file without optimization
    const imageBuffer = fs.readFileSync(screenshotPath);
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Clean up memory
    memoryOptimizer.forceGarbageCollection();
    
    return base64Image;
  } catch (error) {
    console.error('Error processing screenshot:', error);
    throw error;
  }
}

// Clean up when process shuts down
function cleanup() {
  memoryOptimizer.cleanup();
  process.exit(0);
}

// Handle process termination signals
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Send ready signal immediately when worker starts
process.send({ type: 'READY', pid: process.pid });
console.log('Image worker initialized and ready');