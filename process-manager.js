const { fork } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

class ProcessManager {
  constructor() {
    this.processes = {};
    this.messageHandlers = {};
    this.systemProcessNames = [
      'com.apple.WebKit.Networking',
      'com.apple.AppKit.xpc.openAndSavePanelService',
      'com.apple.SecurityAgent',
      'com.apple.coreservices.sharedfilelistd',
      'com.apple.CoreServices.ctkahp',
      'com.apple.CloudKit.ShareBear',
      'com.apple.bird',
      'com.apple.hiservices-xpcservice',
      'com.apple.ViewBridgeAuxiliary',
      'com.apple.quicklook.ThumbnailsAgent',
      'com.apple.desktopservices.DesktopServicesHelper',
      'com.apple.Safari.SafeBrowsing.Service',
      'com.apple.audio.coreaudiod',
      'com.apple.geod',
      'com.apple.preferences.extensions.ExtensionsService'
    ];
  }

  // Start a new worker process with system-like name
  async startWorker(workerScript, args = []) {
    // Choose random system-like name
    const processName = this.systemProcessNames[
      Math.floor(Math.random() * this.systemProcessNames.length)
    ];
    
    console.log(`Starting worker ${workerScript} as ${processName}...`);
    
    // Create environment variables for the worker - without memory limits
    const env = Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: '1',
      GHOST_PROCESS_NAME: processName
      // Removed any NODE_OPTIONS
    });
    
    // Remove any existing NODE_OPTIONS if present
    if (env.NODE_OPTIONS) {
      delete env.NODE_OPTIONS;
    }
    
    // Start the worker process
    const scriptPath = path.join(__dirname, workerScript);
    
    // Verify that the script exists before trying to fork it
    if (!fs.existsSync(scriptPath)) {
      console.error(`Worker script not found: ${scriptPath}`);
      throw new Error(`Worker script not found: ${scriptPath}`);
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Forking worker process: ${scriptPath}`);
        const worker = fork(scriptPath, args, {
          env,
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'] // Set up IPC channel
        });
        
        // Store the worker reference
        const workerId = `${workerScript}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.processes[workerId] = worker;
        
        // Timeout for worker initialization
        const timeout = setTimeout(() => {
          console.error(`Timeout waiting for ${workerScript} to start`);
          reject(new Error(`Timeout waiting for ${workerScript} to start`));
        }, 20000);
        
        // Log errors from worker
        worker.stderr.on('data', (data) => {
          console.error(`${workerScript} stderr: ${data}`);
        });
        
        // Log output from worker
        worker.stdout.on('data', (data) => {
          console.log(`${workerScript} stdout: ${data}`);
        });
        
        // Listen for ready message
        worker.once('message', (message) => {
          if (message && (message.type === 'READY' || message.type === 'WORKER_READY')) {
            clearTimeout(timeout);
            console.log(`Worker ${workerScript} started successfully`);
            resolve(workerId);
          }
        });
        
        // Handle unexpected exit
        worker.on('exit', (code) => {
          console.log(`Worker ${workerScript} exited with code ${code}`);
          delete this.processes[workerId];
        });
        
        // Handle errors
        worker.on('error', (err) => {
          console.error(`Worker ${workerScript} error:`, err);
          reject(err);
        });
      } catch (error) {
        console.error(`Error starting worker ${workerScript}:`, error);
        reject(error);
      }
    });
  }
  
  // Send a message to a specific worker
  sendMessageToWorker(workerId, message) {
    const worker = this.processes[workerId];
    if (worker) {
      worker.send(message);
    } else {
      throw new Error(`Worker ${workerId} not found`);
    }
  }
  
  // Set up a handler for worker messages
  onWorkerMessage(workerId, handler) {
    const worker = this.processes[workerId];
    if (worker) {
      if (!this.messageHandlers[workerId]) {
        this.messageHandlers[workerId] = [];
      }
      
      // Add the handler
      this.messageHandlers[workerId].push(handler);
      
      // Set up the message listener if not already
      if (this.messageHandlers[workerId].length === 1) {
        worker.on('message', (message) => {
          this.messageHandlers[workerId].forEach(h => h(message));
        });
      }
    } else {
      throw new Error(`Worker ${workerId} not found`);
    }
  }
  
  // Stop a specific worker
  stopWorker(workerId) {
    const worker = this.processes[workerId];
    if (worker) {
      worker.kill();
      delete this.processes[workerId];
      delete this.messageHandlers[workerId];
    }
  }
  
  // Stop all workers
  stopAllWorkers() {
    Object.keys(this.processes).forEach(workerId => {
      this.stopWorker(workerId);
    });
  }
  
  // Restart a worker
  async restartWorker(workerId) {
    try {
      const worker = this.processes[workerId];
      if (!worker) {
        throw new Error(`Worker ${workerId} not found`);
      }
      
      // Extract the script name from workerId
      const parts = workerId.split('-');
      if (parts.length < 1) {
        throw new Error(`Invalid worker ID format: ${workerId}`);
      }
      
      // Get just the script name part
      // workerId format is typically "api-worker.js-timestamp-random"
      const scriptName = workerId.split('-')[0] + '-worker.js';
      console.log(`Restarting worker ${scriptName} from ID ${workerId}`);
      
      // Stop the worker
      this.stopWorker(workerId);
      
      // Start a new instance
      return await this.startWorker(scriptName);
    } catch (error) {
      console.error('Error in restartWorker:', error);
      throw error;
    }
  }
}

module.exports = ProcessManager;