/**
 * Renderer Process UI Controller
 * Manages UI interactions and communicates with Main Process via IPC
 */

// DOM Elements
const deviceList = document.getElementById("device-list");
const deviceCount = document.getElementById("device-count");
const refreshBtn = document.getElementById("refresh-btn");
const startStopBtn = document.getElementById("start-stop-btn");
const clearLogBtn = document.getElementById("clear-log-btn");
const logOutput = document.getElementById("log-output");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// Get loading spinner elements
let refreshBtnText = null;
let refreshSpinner = null;

// Application State
let currentDevices = [];
let isRunning = false;
let logEntryCount = 0;
const MAX_LOG_ENTRIES = 1000;

// Debouncing state
let refreshDebounceTimer = null;
const REFRESH_DEBOUNCE_MS = 500;

/**
 * Initialize the application
 */
async function init() {
  // Get loading spinner elements
  refreshBtnText = refreshBtn.querySelector(".btn-text");
  refreshSpinner = refreshBtn.querySelector(".loading-spinner");

  // Setup event listeners
  refreshBtn.addEventListener("click", refreshDevices);
  startStopBtn.addEventListener("click", handleStartStop);
  clearLogBtn.addEventListener("click", clearLog);

  // Setup IPC listeners
  window.electronAPI.onLogUpdate((logEntry) => {
    addLogEntry(logEntry);
  });

  window.electronAPI.onStatusUpdate((status) => {
    updateStatus(status);
  });

  window.electronAPI.onDevicesUpdated((devices) => {
    currentDevices = devices;
    updateDeviceList(devices);
  });

  // Check ADB availability
  await checkADBAvailability();

  // Initial device refresh
  await refreshDevices();
}

/**
 * Check if ADB is available
 */
async function checkADBAvailability() {
  try {
    const isAvailable = await window.electronAPI.checkADB();
    if (!isAvailable) {
      showErrorDialog(
        "ADB Not Found",
        "Android Debug Bridge (ADB) is not available. Please ensure ADB is installed and configured correctly."
      );
    }
  } catch (error) {
    console.error("Failed to check ADB:", error);
  }
}

/**
 * Show error dialog
 */
function showErrorDialog(title, message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<strong>${title}</strong>${message}`;

  // Insert at the top of the container
  const container = document.querySelector(".container");
  const header = document.querySelector(".header");
  container.insertBefore(errorDiv, header.nextSibling);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 10000);
}

/**
 * Refresh device list from ADB (with debouncing)
 */
async function refreshDevices() {
  // Clear any existing debounce timer
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer);
  }

  // Debounce the refresh operation
  refreshDebounceTimer = setTimeout(async () => {
    try {
      // Show loading indicator
      refreshBtn.disabled = true;
      if (refreshBtnText && refreshSpinner) {
        refreshBtnText.style.display = "none";
        refreshSpinner.style.display = "inline-block";
      }

      const devices = await window.electronAPI.refreshDevices();
      currentDevices = devices;
      updateDeviceList(devices);
    } catch (error) {
      console.error("Failed to refresh devices:", error);
      showErrorDialog(
        "Device Detection Failed",
        `Unable to detect devices: ${error.message}`
      );
      addLogEntry({
        timestamp: new Date(),
        level: "error",
        message: `Failed to refresh devices: ${error.message}`,
      });
    } finally {
      // Hide loading indicator
      refreshBtn.disabled = false;
      if (refreshBtnText && refreshSpinner) {
        refreshBtnText.style.display = "inline";
        refreshSpinner.style.display = "none";
      }
      refreshDebounceTimer = null;
    }
  }, REFRESH_DEBOUNCE_MS);
}

/**
 * Update device list display
 * @param {string[]} devices - Array of device IDs
 */
function updateDeviceList(devices) {
  // Update device count
  deviceCount.textContent = `(${devices.length})`;

  // Clear existing list
  deviceList.innerHTML = "";

  if (devices.length === 0) {
    // Show "no devices" message
    const noDevicesMsg = document.createElement("p");
    noDevicesMsg.className = "no-devices";
    noDevicesMsg.textContent = "No devices detected";
    deviceList.appendChild(noDevicesMsg);

    // Disable start button
    startStopBtn.disabled = true;
  } else {
    // Display device items
    devices.forEach((deviceId) => {
      const deviceItem = document.createElement("div");
      deviceItem.className = "device-item";

      const deviceIdSpan = document.createElement("span");
      deviceIdSpan.className = "device-id";
      deviceIdSpan.textContent = `• ${deviceId}`;

      deviceItem.appendChild(deviceIdSpan);
      deviceList.appendChild(deviceItem);
    });

    // Enable start button if not running
    if (!isRunning) {
      startStopBtn.disabled = false;
    }
  }
}

/**
 * Handle Start/Stop button click
 */
async function handleStartStop() {
  if (isRunning) {
    await stopBot();
  } else {
    await startBot();
  }
}

/**
 * Start bot execution
 */
async function startBot() {
  try {
    startStopBtn.disabled = true;
    await window.electronAPI.startBot();
    isRunning = true;
    startStopBtn.textContent = "Stop Bot";
    startStopBtn.classList.add("stop");
    startStopBtn.disabled = false;
  } catch (error) {
    console.error("Failed to start bot:", error);
    showErrorDialog(
      "Bot Execution Failed",
      `Unable to start bot: ${error.message}`
    );
    addLogEntry({
      timestamp: new Date(),
      level: "error",
      message: `Failed to start bot: ${error.message}`,
    });
    startStopBtn.disabled = false;
  }
}

/**
 * Stop bot execution
 */
async function stopBot() {
  try {
    startStopBtn.disabled = true;
    await window.electronAPI.stopBot();
    isRunning = false;
    startStopBtn.textContent = "Start Bot";
    startStopBtn.classList.remove("stop");
    startStopBtn.disabled = currentDevices.length === 0;
  } catch (error) {
    console.error("Failed to stop bot:", error);
    addLogEntry({
      timestamp: new Date(),
      level: "error",
      message: `Failed to stop bot: ${error.message}`,
    });
    startStopBtn.disabled = false;
  }
}

/**
 * Update status indicator
 * @param {string} status - Bot status (idle, running, completed, error)
 */
function updateStatus(status) {
  // Remove all status classes
  statusDot.classList.remove(
    "status-idle",
    "status-running",
    "status-completed",
    "status-error"
  );

  // Add appropriate status class and update text
  switch (status) {
    case "idle":
      statusDot.classList.add("status-idle");
      statusText.textContent = "Idle";
      isRunning = false;
      startStopBtn.textContent = "Start Bot";
      startStopBtn.classList.remove("stop");
      startStopBtn.disabled = currentDevices.length === 0;
      break;
    case "running":
      statusDot.classList.add("status-running");
      statusText.textContent = "Running";
      isRunning = true;
      startStopBtn.textContent = "Stop Bot";
      startStopBtn.classList.add("stop");
      startStopBtn.disabled = false;
      break;
    case "completed":
      statusDot.classList.add("status-completed");
      statusText.textContent = "Completed";
      isRunning = false;
      startStopBtn.textContent = "Start Bot";
      startStopBtn.classList.remove("stop");
      startStopBtn.disabled = currentDevices.length === 0;
      break;
    case "error":
      statusDot.classList.add("status-error");
      statusText.textContent = "Error";
      isRunning = false;
      startStopBtn.textContent = "Start Bot";
      startStopBtn.classList.remove("stop");
      startStopBtn.disabled = currentDevices.length === 0;
      break;
    default:
      console.warn("Unknown status:", status);
  }
}

/**
 * Add log entry to display
 * @param {Object} logEntry - Log entry object
 * @param {Date} logEntry.timestamp - Log timestamp
 * @param {string} logEntry.level - Log level (info, error)
 * @param {string} logEntry.message - Log message
 * @param {string} [logEntry.device] - Device ID (optional)
 */
function addLogEntry(logEntry) {
  // Limit log entries to prevent memory issues
  if (logEntryCount >= MAX_LOG_ENTRIES) {
    // Remove oldest entries (first 100 entries)
    const entriesToRemove = 100;
    const children = logOutput.children;
    for (let i = 0; i < entriesToRemove && children.length > 0; i++) {
      logOutput.removeChild(children[0]);
      logEntryCount--;
    }
  }

  const logDiv = document.createElement("div");
  logDiv.className = `log-entry ${logEntry.level}`;

  // Format timestamp
  const timestamp = new Date(logEntry.timestamp);
  const timeStr = timestamp.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Build log entry HTML
  let logHTML = `<span class="log-timestamp">[${timeStr}]</span>`;

  if (logEntry.device) {
    logHTML += `<span class="log-device">[${logEntry.device}]</span>`;
  }

  logHTML += `<span class="log-message">${logEntry.message}</span>`;

  logDiv.innerHTML = logHTML;
  logOutput.appendChild(logDiv);
  logEntryCount++;

  // Auto-scroll to bottom
  logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * Clear log display
 */
function clearLog() {
  logOutput.innerHTML = "";
  logEntryCount = 0;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
