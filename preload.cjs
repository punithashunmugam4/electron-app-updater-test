const { contextBridge, ipcRenderer } = require("electron");

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

function formatArg(arg) {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

function sendRendererLog(level, ...args) {
  const message = args.map(formatArg).join(" ");
  ipcRenderer.send("renderer-log", {
    level,
    message,
    metadata: args.slice(1).map(formatArg),
  });
}

console.log = (...args) => {
  sendRendererLog("info", ...args);
  originalConsole.log(...args);
};
console.info = (...args) => {
  sendRendererLog("info", ...args);
  originalConsole.info(...args);
};
console.warn = (...args) => {
  sendRendererLog("warn", ...args);
  originalConsole.warn(...args);
};
console.error = (...args) => {
  sendRendererLog("error", ...args);
  originalConsole.error(...args);
};
console.debug = (...args) => {
  sendRendererLog("debug", ...args);
  originalConsole.debug(...args);
};

window.addEventListener("error", (event) => {
  ipcRenderer.send("renderer-error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  ipcRenderer.send("renderer-error", {
    message: "UnhandledPromiseRejection",
    reason: formatArg(event.reason),
    stack: event.reason?.stack,
  });
});

console.log("preload.js loading");
global.ipcRenderer = ipcRenderer;
global.msg = "Hello Global";

const electronApi = {
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  maximizeWindow: () => ipcRenderer.send("maximize-window"),
  restoreWindow: () => ipcRenderer.send("restore-window"),
  closeWindow: () => ipcRenderer.send("close-window"),
  showContextMenu: (params) => ipcRenderer.send("show-context-menu", params),
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    console.log(
      `Receiving message on channel: ${channel}, with func: ${func} `,
    );
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  logActivity: (message, metadata) => {
    ipcRenderer.send("renderer-log", { level: "info", message, metadata });
  },
  logError: (message, metadata) => {
    ipcRenderer.send("renderer-error", { message, metadata });
  },
  importWorkflowJSON: (fileName) =>
    (async (fileName) => {
      const git_tree_base_url =
        "https://api.github.com/repos/punithashunmugam4/bot-automation-trees/contents/";
      const headers = {
        Accept: "application/vnd.github.raw",
        "User-Agent": "Electron-App",
      };
      try {
        const res = await fetch(`${git_tree_base_url}${fileName}`, {
          method: "GET",
          headers,
        });
        const text = await res.text();
        return JSON.parse(text);
      } catch (err) {
        console.error("importWorkflowJSON error:", err);
        return { error: err?.message || String(err) };
      }
    })(fileName),
  getAllbotsList: () =>
    (async () => {
      const git_tree_base_url =
        "https://api.github.com/repos/punithashunmugam4/bot-automation-trees/contents/";
      const headers = {
        Accept: "application/vnd.github.raw",
        "User-Agent": "Electron-App",
      };
      try {
        const res = await fetch(`${git_tree_base_url}manifest.json`, {
          method: "GET",
          headers,
        });
        const text = await res.text();
        const parsed = JSON.parse(text);
        const files = parsed?.bot_list?.map((element) => ({ fileName: element })) || [];
        return files;
      } catch (err) {
        console.error("getAllbotsList error:", err);
        return [];
      }
    })(),
  runBotAutomation: (file_details) =>
    ipcRenderer.send("run-bot-automation", file_details),
};

contextBridge.exposeInMainWorld("electron", electronApi);
contextBridge.exposeInMainWorld("e", electronApi);

// Global variables management using IPC
const globalVars = {
  get: (key) => ipcRenderer.invoke("get-global-var", key),
  set: (key, value) => ipcRenderer.send("set-global-var", key, value),
  reset: () => ipcRenderer.send("reset-global-var"),
};
contextBridge.exposeInMainWorld("globalVars", globalVars);

// Added to use repeatingly in the actions object, so defined it outside to avoid duplication
const getElementByXpath= (path) => {
    return document.evaluate(
      path,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
  };
const sleep= (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

// Actiosn object to expose functions to the renderer process
const actions = {
  getElementByXpath: (path) => {
    return document.evaluate(
      path,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
  },
  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  getXpathFromElement: function getXpathFromElement(element) {
    if (element && element.id) {
      // If the element has a unique ID, we can instantly form a reliable relative XPath
      return `//*[@id="${element.id}"]`;
    }

    if (element === document.body) {
      return "/html/body";
    }

    let siblingCount = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];

    // Loop through siblings to find the element's exact index position
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        // Recurse up to the parent element and append current element's tag name and index
        return (
          getXpathFromElement(element.parentNode) +
          "/" +
          element.tagName.toLowerCase() +
          "[" +
          (siblingCount + 1) +
          "]"
        );
      }
      // Only count siblings of the exact same HTML tag type
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        siblingCount++;
      }
    }
  },
  openNewTab: (url, script) => {
    console.log("Sending message to open new tab with URL:", url, script);
    // Use the context-bridge exposed API in the page context

    ipcRenderer.send("open-new-tab", { url: url, script: script });
  },
  write_value_to_xpath: (xpath, value,elem=undefined) => {
    var element=getElementByXpath(xpath);
     if(!element && !elem)  console.warn(`Element not found for XPath: ${xpath}`);
     else if(!element && elem) element=elem;
      element.value = value;
      const event = new Event("input", { bubbles: true });
      element.dispatchEvent(event);
     
},
write_to_xpath: (xpath, value,elem=undefined) => {
  var element=getElementByXpath(xpath);
  if(!element && !elem)  console.warn(`Element not found for XPath: ${xpath}`);
  else if(!element && elem) element=elem;
    element.focus();
    element.innerText = value;
    const event = new Event("input", { bubbles: true });
    element.dispatchEvent(event);
  
},
clickwait_onload: (xpath,element=undefined) => {
  var element=getElementByXpath(xpath);
  if(!element && !elem)  console.warn(`Element not found for XPath: ${xpath}`);
  else if(!element && elem) element=elem;
  element.focus();
  sleep(1000);
  element.click();

}
};
contextBridge.exposeInMainWorld("actions", actions);
console.log(actions);
