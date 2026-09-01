const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const MemoryOptimizer = require('./memory-optimizer');
require('dotenv').config();

// Process name camouflage
process.title = process.env.GHOST_PROCESS_NAME || 'com.apple.WebKit.Networking';

// Initialize minimal memory optimizer
const memoryOptimizer = new MemoryOptimizer();

// Start minimal memory logging
memoryOptimizer.startOptimizers();

// Initialize Gemini API
let apiKey = process.env.GEMINI_API_KEY;
let genAI;
let activeModels = new Map();

try {
  // Initialize the API client
  if (!apiKey) {
    // Log error for missing API key
    console.error('Missing GEMINI_API_KEY in environment variables');
    // Try to read it from .env file directly
    try {
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match && match[1]) {
          apiKey = match[1].trim();
          console.log('Loaded API key from .env file');
        }
      }
    } catch (e) {
      console.error('Error reading .env file:', e);
    }
  }
  
  if (!apiKey) {
    throw new Error('Gemini API key not found');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('Gemini API client initialized successfully');
  
} catch (error) {
  console.error('Error initializing Gemini API:', error);
}

// Handle messages from parent process
process.on('message', async (message) => {
  try {
    switch (message.type) {
      case 'PROCESS_IMAGE':
        if (!genAI) {
          throw new Error('Gemini API client not initialized');
        }
        const result = await processImage(message.imageData, message.prompt);
        process.send({ 
          type: 'API_RESPONSE', 
          result: { text: result }, 
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
    console.error('Error in API worker:', error);
    process.send({ 
      type: 'API_ERROR', 
      error: error.message,
      requestId: message.requestId
    });
  }
});

// Process image with Gemini Vision API
async function processImage(imageData, prompt) {
  try {
    // Release memory before API call
    memoryOptimizer.releaseMemory();
    
    // Get or create model instance
    let model;
    if (!activeModels.has('gemini-1.5-flash')) {
      model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,        
          topK: 40,
          maxOutputTokens: 2048
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      });
      activeModels.set('gemini-1.5-flash', model);
    } else {
      model = activeModels.get('gemini-1.5-flash');
    }

    // Split processing to allow memory release between steps
    
    // Step 1: Prepare image data
    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: "image/png"
      }
    };
    
    // Clear reference to original image data
    imageData = null;
    
    // Try to release memory
    memoryOptimizer.releaseMemory();
    
    // Step 2: Call the Gemini API
    const result = await model.generateContent([prompt, imagePart]);
    
    // Clear reference to image part
    imagePart.inlineData.data = null;
    
    // Release memory after API call
    memoryOptimizer.releaseMemory();
    
    // Step 3: Process response
    const response = await result.response;
    const text = response.text();
    
    // Release memory after processing
    memoryOptimizer.releaseMemory();
    
    // Return just what we need
    return text;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  } finally {
    // Always release memory at the end
    memoryOptimizer.releaseMemory();
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

// Report ready status
process.send({ type: 'READY', pid: process.pid });