import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  session,
  Menu,
  webContents,
} from "electron";
import path from "path";
import { fileURLToPath } from "url";
import contextMenu from "electron-context-menu";
import electron from "electron";
import fs from "fs";
import util from "util";
import { createRequire } from "module";
const requireC = createRequire(import.meta.url);
import store from "electron-store";
var fsPromises = fs.promises;

global.stored_vars = {};

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
    title: `Browser App - v${app.getVersion()}`,
    autoHideMenuBar: true,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.cjs"),
      // enableRemoteModule: false,
      webviewTag: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      backgroundThrottling: false,
      nativeWindowOpen: true,
      contextIsolation: true,
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
          mainWindow.webContents.send("inspect-webview-element", params);
        },
      },
      {
        label: "Open New Tab",
        click: () => {
          mainWindow.webContents.send("create-new-tab", params);
        },
      },
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });
}

ipcMain.on("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow) mainWindow.maximize();
});
ipcMain.on("restore-window", () => {
  if (mainWindow) mainWindow.restore();
});

ipcMain.on("close-window", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("import-workflow", async (event, fileName) => {
  const json_filepath = path.join(
    app.getAppPath(),
    "bot-script-tree",
    fileName,
  );

  try {
    if (!fs.existsSync(json_filepath)) {
      return { error: `File not found at specified path: ${json_filepath}` };
    }
    const rawData = fs.readFileSync(json_filepath, "utf-8");
    return JSON.parse(rawData); // Safely parsed server-side
  } catch (error) {
    console.error("Failed to parse JSON file:", error);
    return { error: "Invalid JSON structure" };
  }
});

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
  ipcMain.handle("get-app-version", () => app.getVersion());

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
  createWindow();

  // Register a global shortcut to open DevTools for the active webview
  globalShortcut.register("CommandOrControl+I", () => {
    mainWindow.openDevTools();
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    mainWindow.webContents.send("open-webview-devtools");
  });
});

// Handle open-new-tab event
ipcMain.on("open-new-tab", (event, data) => {
  console.log(
    "Received open-new-tab message with URL:",
    data.url,
    "script:",
    data.script,
  );
  mainWindow.webContents.send("create-new-tab", data);
});

ipcMain.handle("get-global-var", (event, key) => {
  return global.stored_vars[key];
});

ipcMain.on("set-global-var", (event, key, value) => {
  global.stored_vars = { ...global.stored_vars, [key]: value };
});

ipcMain.on("reset-global-var", () => {
  global.stored_vars = {};
});

ipcMain.handle("get-bot-list", async () => {
  const fileFormat = /\.(json)$/i;
  const results = [];

  async function get_file_list(dir) {
    let entries;
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error("Failed to read directory:", dir, err);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && fileFormat.test(entry.name)) {
        console.log("filename: ", entry.name);
        results.push({
          fileName: entry.name,
          path: fullPath,
        });
      }
    }
  }
  let files_path = path.join(app.getAppPath(), "bot-script-tree");
  await get_file_list(files_path);
  console.log("file list fetched: ", results);
  return results;
});

ipcMain.on("run-bot-automation", (event, file_details) => {
  console.log("Run-Bot-Automation", file_details);
  mainWindow.webContents.send("execute-bot-automation", file_details);
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
