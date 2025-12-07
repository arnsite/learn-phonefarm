import { EventEmitter } from "events";
import { getADBManager } from "./adb-manager.js";

/**
 * Bot status enum
 */
export const BotStatus = {
  IDLE: "idle",
  RUNNING: "running",
  COMPLETED: "completed",
  ERROR: "error",
};

/**
 * Helper: delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper: wait until YouTube is foreground or process alive
 */
async function waitForYouTube(adbManager, device, retry = 5) {
  for (let i = 0; i < retry; i++) {
    const focus = await adbManager.executeCommand(
      device,
      "shell dumpsys window | grep mCurrentFocus"
    );

    if (focus && focus.toLowerCase().includes("youtube")) {
      return true;
    }

    await sleep(700);
  }

  // fallback: check process
  const pid = await adbManager.executeCommand(
    device,
    "shell pidof com.google.android.youtube"
  );
  return pid.trim().length > 0;
}

/**
 * Bot Controller - Manages bot execution across multiple devices
 */
class BotController extends EventEmitter {
  constructor() {
    super();
    this.status = BotStatus.IDLE;
    this.runningProcesses = new Map();
    this.shouldStop = false;
    this.adbManager = getADBManager();
  }

  /**
   * Get current bot status
   */
  getStatus() {
    return this.status;
  }

  /**
   * Set status and emit update
   */
  setStatus(newStatus) {
    this.status = newStatus;
    this.emit("status-update", newStatus);
  }

  /**
   * Emit log entry
   */
  log(message, level = "info", device = null) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      device,
    };
    this.emit("log-update", logEntry);
  }

  /**
   * Run bot for a single device
   */
  async runBotForDevice(device) {
    try {
      this.log(`bot start`, "info", device);

      // 1. Wake device (SAFE, not toggle)
      await this.adbManager.executeCommand(device, "shell input keyevent 224");
      await sleep(500);

      // Check if we should stop
      if (this.shouldStop) {
        this.log(`bot stopped by user`, "info", device);
        return;
      }

      // 2. Go HOME (reset state)
      await this.adbManager.executeCommand(device, "shell input keyevent 3");
      await sleep(500);

      if (this.shouldStop) {
        this.log(`bot stopped by user`, "info", device);
        return;
      }

      // 3. Open YouTube app
      await this.adbManager.executeCommand(
        device,
        "shell monkey -p com.google.android.youtube 1"
      );

      const ytReady = await waitForYouTube(this.adbManager, device);
      if (!ytReady) {
        throw new Error("YouTube failed to launch");
      }

      this.log(`YouTube active`, "info", device);

      if (this.shouldStop) {
        this.log(`bot stopped by user`, "info", device);
        return;
      }

      // 4. Open Muse Indonesia channel (FORCE YouTube app)
      await this.adbManager.executeCommand(
        device,
        'shell am start -a android.intent.action.VIEW -d "https://www.youtube.com/@MuseIndonesia" -p com.google.android.youtube'
      );

      // optional wait after navigation
      await sleep(1500);

      this.log(`Muse Indonesia opened`, "info", device);
      this.log(`bot end`, "info", device);
    } catch (error) {
      this.log(`Error: ${error.message}`, "error", device);
      throw error;
    }
  }

  /**
   * Start bot for multiple devices
   */
  async startBot(devices) {
    if (this.status === BotStatus.RUNNING) {
      throw new Error("Bot is already running");
    }

    if (!devices || devices.length === 0) {
      throw new Error("No devices provided");
    }

    this.shouldStop = false;
    this.setStatus(BotStatus.RUNNING);
    this.log(`Starting bot for ${devices.length} device(s)`, "info");

    try {
      // Run bot for all devices in parallel
      const promises = devices.map((device) => {
        const promise = this.runBotForDevice(device);
        this.runningProcesses.set(device, promise);
        return promise;
      });

      await Promise.all(promises);

      // Clear running processes
      this.runningProcesses.clear();

      if (this.shouldStop) {
        this.setStatus(BotStatus.IDLE);
        this.log("Bot stopped", "info");
      } else {
        this.setStatus(BotStatus.COMPLETED);
        this.log("Bot completed successfully", "info");
      }
    } catch (error) {
      this.runningProcesses.clear();
      this.setStatus(BotStatus.ERROR);
      this.log(`Bot error: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Stop bot execution
   */
  stopBot() {
    if (this.status !== BotStatus.RUNNING) {
      return;
    }

    this.shouldStop = true;
    this.log("Stopping bot...", "info");

    // Clear running processes
    this.runningProcesses.clear();

    // Set status to idle
    this.setStatus(BotStatus.IDLE);
  }
}

// Singleton instance
let botControllerInstance = null;

/**
 * Get Bot Controller singleton instance
 */
export function getBotController() {
  if (!botControllerInstance) {
    botControllerInstance = new BotController();
  }
  return botControllerInstance;
}

export { BotController };
