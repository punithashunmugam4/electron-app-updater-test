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
import { createRequire } from "module";
const requireC = createRequire(import.meta.url);

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
import http from "http";

const dirname = app.getAppPath();
var preload_path = path.join(dirname, "preload.cjs");
let mainWindow;
app.commandLine.appendSwitch("log-level", "3"); // supression of dev tools warning in terminal
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
  const userDataPath = app.getPath("userData");
  const customIndex = path.join(userDataPath, "app_files", "index.js");

  // If hot-updated files exist in userData, run them. Otherwise, run bundled files.
  if (fs.existsSync(customIndex)) {
    return customIndex;
  }
  return path.join(app.getAppPath(), "index.js"); // Fallback to root index.js
}

function createWindow() {
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
