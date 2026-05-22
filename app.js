import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  session,
  Menu,
} from "electron";
import path from "path";
import { fileURLToPath } from "url";
import contextMenu from "electron-context-menu";
import electron from "electron";
import fs from "fs";
import util from "util";
import { createRequire } from "module";
const requireC = createRequire(import.meta.url);

let logger = null;
try {
  logger = requireC(path.join(app.getAppPath(), "logger.cjs"));
} catch (err) {
  console.error("Failed to load logger module:", err);
}

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
import http from "http";

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

function formatLogArgs(args) {
  return args
    .map((arg) =>
      typeof arg === "string" ? arg : util.inspect(arg, { depth: 2 }),
    )
    .join(" ");
}

function writeLog(level, ...args) {
  const message = formatLogArgs(args);
  if (logger) {
    if (typeof logger[level] === "function") {
      logger[level](message);
    } else if (typeof logger.log === "function") {
      logger.log(level, message);
    }
  }
  if (typeof originalConsole[level] === "function") {
    originalConsole[level](...args);
  }
}

console.log = (...args) => writeLog("info", ...args);
console.info = (...args) => writeLog("info", ...args);
console.warn = (...args) => writeLog("warn", ...args);
console.error = (...args) => writeLog("error", ...args);
console.debug = (...args) => writeLog("debug", ...args);

process.on("uncaughtException", (error) => {
  console.error("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection", reason);
});

const dirname = app.getAppPath();
var preload_path = path.join(dirname, "preload.cjs");
let mainWindow;
app.commandLine.appendSwitch("log-level", "3"); // supression of dev tools warning in terminal

// Handle single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

ipcMain.handle("get-webview-actions", async () => {
  try {
    const { readFile } = await import("fs/promises");
    const pathModule = (await import("path")).default;
    const actionsPath = pathModule.join(app.getAppPath(), "webviewActions.cjs");
    const content = await readFile(actionsPath, "utf8");
    return content;
  } catch (err) {
    console.error("Failed to read webviewActions.cjs in main:", err);
    return "";
  }
});

function getExecutablePath() {
  // Always use the app installation directory for loading app.js
  return path.join(app.getAppPath(), "app.js");
}

function createWindow() {
  console.log("Browser APP initializing...");
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.cjs"),
      enableRemoteModule: false,
      webviewTag: true,
      nodeIntegration: true,
      backgroundThrottling: false,
      nativeWindowOpen: true,
      contextIsolation: true,
      // sandbox: false,
      webSecurity: true,
    },
  });

  contextMenu({
    window: mainWindow,
    showInspectElement: true,
  });
  mainWindow.loadFile("index.html");
  mainWindow.maximize();
  ipcMain.on("show-context-menu", (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Inspect Element",
        click: () => {
          event.reply("inspect-element", params);
        },
      },
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });
}

app.whenReady().then(() => {
  const startScript = getExecutablePath();

  // Dynamic require of your app entry point (use createRequire in ESM)
  try {
    // Avoid requiring the renderer `index.js` from the main process
    if (path.basename(startScript) !== "index.js") {
      requireC(startScript);
    } else {
      console.log("Skipping require of renderer index.js from main process");
    }
  } catch (err) {
    console.error("Failed to require start script:", err);
  }

  // Trigger your custom file-check logic only in packaged app mode
  if (app.isPackaged) {
    try {
      const updaterPath = path.join(app.getAppPath(), "updater.cjs");
      if (fs.existsSync(updaterPath)) {
        const updater = requireC(updaterPath);
        if (updater && typeof updater.checkForFileUpdates === "function") {
          updater
            .checkForFileUpdates()
            .catch((err) => console.error("Updater error:", err));
        } else {
          console.log("No checkForFileUpdates export; skipping updater");
        }
      } else {
        console.log("No updater.cjs found; skipping updates");
      }
    } catch (err) {
      console.error("Failed to run updater:", err);
    }
  } else {
    console.log("Development mode detected; skipping update check.");
  }

  ipcMain.handle("ping", () => "pong");

  ipcMain.on("renderer-log", (event, payload) => {
    if (!payload || !payload.level || !payload.message) return;
    if (logger) {
      const message = payload.message;
      const metadata = payload.metadata || "";
      if (typeof logger[payload.level] === "function") {
        logger[payload.level](message, metadata);
      } else if (typeof logger.log === "function") {
        logger.log(payload.level, message, metadata);
      }
    }
  });

  ipcMain.on("renderer-error", (event, payload) => {
    if (!payload) return;
    const message = payload.message || "Renderer error";
    const metadata = payload;
    if (logger) {
      logger.error(message, metadata);
    }
    originalConsole.error("Renderer error:", payload);
  });

  createWindow();

  // Register a global shortcut to open DevTools for the active webview
  globalShortcut.register("CommandOrControl+I", () => {
    mainWindow.openDevTools();
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    mainWindow.webContents.send("open-webview-devtools");
  });

  // Handle download events
  session.defaultSession.on("will-download", (event, item, webContents) => {
    // Set the save path for the download
    item.setSavePath(app.getPath("downloads") + "/" + item.getFilename());

    // Monitor the download progress
    item.on("updated", (event, state) => {
      if (state === "interrupted") {
        console.log("Download is interrupted but can be resumed");
      } else if (state === "progressing") {
        if (item.isPaused()) {
          console.log("Download is paused");
        } else {
          console.log(`Received bytes: ${item.getReceivedBytes()}`);
          console.log(`Total bytes: ${item.getTotalBytes()}`);
          const progress =
            (item.getReceivedBytes() / item.getTotalBytes()) * 100;
          console.log(`Download progress: ${progress.toFixed(2)}%`);
          console.log(item.getURL());
          // Send download progress to renderer process
          mainWindow.webContents.send("download-progress", {
            url: item.getURL(),
            progress: progress.toFixed(2),
          });
        }
      }
    });

    item.once("done", (event, state) => {
      if (state === "completed") {
        console.log("Download successfully completed");
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });

  // Handle open-new-tab event
  ipcMain.on("open-new-tab", (event, url) => {
    console.log("Received open-new-tab message with URL:", url);
    mainWindow.webContents.send("create-new-tab", url);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});
