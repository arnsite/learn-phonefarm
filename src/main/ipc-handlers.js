import { ipcMain, BrowserWindow } from "electron";
import { getADBManager } from "./adb-manager.js";
import { getBotController } from "./bot-controller.js";

/**
 * Setup all IPC handlers for communication between Main and Renderer processes
 */
export function setupIPCHandlers() {
  const adbManager = getADBManager();
  const botController = getBotController();

  /**
   * Handler: Get connected devices
   */
  ipcMain.handle("get-devices", async () => {
    try {
      const devices = await adbManager.getDevices();
      return devices;
    } catch (error) {
      console.error("Error getting devices:", error);
      throw error;
    }
  });

  /**
   * Handler: Refresh device list
   */
  ipcMain.handle("refresh-devices", async () => {
    try {
      console.log("[IPC] Refreshing devices...");
      const devices = await adbManager.getDevices();
      console.log("[IPC] Devices found:", devices);

      // Send updated devices to renderer
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send("devices-updated", devices);
      }

      return devices;
    } catch (error) {
      console.error("[IPC] Error refreshing devices:", error);
      throw error;
    }
  });

  /**
   * Handler: Start bot
   */
  ipcMain.handle("start-bot", async () => {
    try {
      const devices = await adbManager.getDevices();

      if (devices.length === 0) {
        throw new Error("No devices detected");
      }

      // Start bot asynchronously (don't wait for completion)
      botController.startBot(devices).catch((error) => {
        console.error("Bot execution error:", error);
      });

      return { success: true };
    } catch (error) {
      console.error("Error starting bot:", error);
      throw error;
    }
  });

  /**
   * Handler: Stop bot
   */
  ipcMain.handle("stop-bot", async () => {
    try {
      botController.stopBot();
      return { success: true };
    } catch (error) {
      console.error("Error stopping bot:", error);
      throw error;
    }
  });

  /**
   * Handler: Check ADB availability
   */
  ipcMain.handle("check-adb", async () => {
    try {
      const isAvailable = adbManager.validateADBPath();
      return isAvailable;
    } catch (error) {
      console.error("Error checking ADB:", error);
      return false;
    }
  });

  /**
   * Setup bot controller event listeners to forward to renderer
   */
  setupBotControllerListeners(botController);
}

/**
 * Setup listeners for bot controller events and forward to renderer
 */
function setupBotControllerListeners(botController) {
  // Forward log updates to renderer
  botController.on("log-update", (logEntry) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("log-update", logEntry);
    }
  });

  // Forward status updates to renderer
  botController.on("status-update", (status) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("status-update", status);
    }
  });
}
