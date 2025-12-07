import { exec, execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { app } from "electron";

/**
 * ADB Manager - Handles Android Debug Bridge operations
 */
class ADBManager {
  constructor() {
    this.adbPath = this.resolveADBPath();
  }

  /**
   * Resolve ADB path for development and production
   */
  resolveADBPath() {
    // Production: Check bundled resources
    if (app.isPackaged) {
      const bundledPath = path.join(process.resourcesPath, "adb", "adb.exe");
      if (existsSync(bundledPath)) {
        return bundledPath;
      }
    }

    // Development: Use hardcoded path
    const devPath = "C:\\adb\\adb.exe";
    if (existsSync(devPath)) {
      return devPath;
    }

    // Fallback: Try system PATH
    return "adb";
  }

  /**
   * Validate that ADB is available
   */
  validateADBPath() {
    try {
      execSync(`"${this.adbPath}" version`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of connected Android devices
   * @returns {Promise<string[]>} Array of device IDs
   */
  async getDevices() {
    return new Promise((resolve, reject) => {
      console.log(`[ADB] Executing: "${this.adbPath}" devices`);
      exec(`"${this.adbPath}" devices`, (error, stdout, stderr) => {
        if (error) {
          console.error("[ADB] Execution error:", error);
          reject(new Error(`ADB error: ${error.message}`));
          return;
        }

        if (stderr) {
          console.error("[ADB] stderr:", stderr);
          reject(new Error(`ADB stderr: ${stderr}`));
          return;
        }

        console.log("[ADB] Raw output:", stdout);

        // Parse device list
        const devices = stdout
          .split("\n")
          .filter((line) => line.includes("\tdevice"))
          .map((line) => line.split("\t")[0].trim())
          .filter((id) => id.length > 0);

        console.log("[ADB] Parsed devices:", devices);
        resolve(devices);
      });
    });
  }

  /**
   * Execute ADB command on specific device
   * @param {string} device - Device ID
   * @param {string} command - ADB command to execute
   * @returns {Promise<string>} Command output
   */
  async executeCommand(device, command) {
    return new Promise((resolve, reject) => {
      exec(
        `"${this.adbPath}" -s ${device} ${command}`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout.trim());
        }
      );
    });
  }
}

// Singleton instance
let adbManagerInstance = null;

/**
 * Get ADB Manager singleton instance
 */
export function getADBManager() {
  if (!adbManagerInstance) {
    adbManagerInstance = new ADBManager();
  }
  return adbManagerInstance;
}

export { ADBManager };
