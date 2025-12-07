import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { setupIPCHandlers } from "./ipc-handlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    title: "PhoneFarm Bot Controller",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer HTML
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * App ready handler
 */
app.whenReady().then(() => {
  createWindow();
  setupIPCHandlers();

  // On macOS, re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * Graceful shutdown - stop all bot processes before quitting
 */
app.on("before-quit", async (event) => {
  // Import bot controller to stop any running processes
  const { getBotController } = await import("./bot-controller.js");
  const botController = getBotController();

  if (botController.getStatus() === "running") {
    event.preventDefault();
    botController.stopBot();

    // Wait a bit for cleanup, then quit
    setTimeout(() => {
      app.quit();
    }, 500);
  }
});

export { mainWindow };
