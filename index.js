// Ailas renderer process communication setup
import { executionScript, interactWithWebview } from "./scripts.js";

//Theme
const toggleBtn = document.getElementById("theme-toggle");

toggleBtn.addEventListener("click", () => {
  // Check current theme state on the <html> tag
  const currentTheme = document.documentElement.getAttribute("data-theme");

  if (currentTheme === "light") {
    document.documentElement.setAttribute("data-theme", "dark");
    toggleBtn.innerHTML =
      '<span class="material-symbols-outlined">light_mode</span>';
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    toggleBtn.innerHTML =
      '<span class="material-symbols-outlined">dark_mode</span>';
  }
});

//Window controls
document.getElementById("min-btn").addEventListener("click", () => {
  window.e.minimizeWindow();
});
document.getElementById("max-btn").addEventListener("click", () => {
  if (
    document.getElementById("max-btn").getAttribute("data-state") ===
    "maximized"
  ) {
    window.e.restoreWindow();
    document.getElementById("max-btn").setAttribute("data-state", "restored");
  } else {
    window.e.maximizeWindow();
    document.getElementById("max-btn").setAttribute("data-state", "maximized");
  }
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.e.closeWindow();
});

var webview = document.querySelector(".tab-content-frame.active");
const context_listener = (event) => {
  webview = document.querySelector(".tab-content-frame.active");
  event.preventDefault();
  const bounds = webview.getBoundingClientRect();
  const params = {
    x: event.params.x,
    y: event.params.y,
  };
  console.log("Context menu event at:", params);
  e.showContextMenu(params);
};
webview.addEventListener("context-menu", context_listener);

let actions = "";
try {
  (async function () {
    actions = await e.getWebviewActions();
    eval(actions);
    console.log("Webview actions loaded in renderer", actions);
  })();
} catch (err) {
  console.error("Error loading webviewActions.cjs via getWebviewActions:", err);
}

var url = document.querySelector(".address-bar").value;
var activeWebview = webview;

document.querySelector(".address-bar").addEventListener("change", (event) => {
  event.preventDefault();
  url = document.querySelector(".address-bar").value;
  console.log("URL submitted:", url);
  if (document.querySelectorAll(".tab").length > 0) {
    const activeTab = document.querySelector(".tab.active");
    activeTab.setAttribute("data-url", url);
    activeWebview = document.querySelector(".tab-content-frame.active");
    activeWebview.loadURL(url);
  } else addTab(url);
});

const tabclicked = (event) => {
  console.log("tab clicked");
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  event.currentTarget.classList.add("active");

  document.querySelectorAll(".tab-content-frame").forEach((tabContent) => {
    tabContent.classList.remove("active");
    tabContent.classList.add("hidden");
  });

  const tabId = event.currentTarget.getAttribute("data-tab-id");
  var url = event.currentTarget.getAttribute("data-url");
  document.getElementById(`frame-${tabId}`).classList.remove("hidden");
  document.getElementById(`frame-${tabId}`).classList.add("active");
  document.querySelector(".address-bar").value = url;
};

const closeTab = (event) => {
  event.stopPropagation();
  const tab = event.currentTarget.parentElement;
  const tabId = parseInt(tab.getAttribute("data-tab-id"));
  const webview = document.getElementById(`frame-${tabId}`);
  const isactive = tab.classList.contains("active");
  console.log(isactive);
  tab.remove();
  webview.remove();

  // Activate the previous tab if there are any remaining tabs
  const remainingTabs = document.querySelectorAll(".tab");
  let newActiveTabId;
  if (remainingTabs.length > 0) {
    if (isactive) {
      remainingTabs.forEach((tab) => tab.classList.remove("active"));
      for (let i = remainingTabs.length - 1; i >= 0; i--) {
        console.log("looping: ", remainingTabs[i].getAttribute("data-tab-id"));
        if (parseInt(remainingTabs[i].getAttribute("data-tab-id")) < tabId) {
          newActiveTabId = parseInt(
            remainingTabs[i].getAttribute("data-tab-id"),
          );
          console.log("New active Tab id: ", newActiveTabId);
          break;
        }
      }

      const newActiveTab = document.querySelector(
        `.tab[data-tab-id="${newActiveTabId}"]`,
      );
      newActiveTab?.classList?.add("active");

      const newActiveWebview = document.getElementById(
        `frame-${newActiveTabId}`,
      );
      newActiveWebview?.classList?.remove("hidden");
      newActiveWebview?.classList?.add("active");
      console.log("New active Tab id: ", newActiveTabId);
      document.querySelector(".address-bar").value =
        newActiveTab?.getAttribute("data-url");
    }
  } else {
    document.querySelector(".address-bar").value = "";
  }
};

const addTab = (url = "https://moviesmod.money/", script = "") => {
  url = url === "" ? "https://moviesmod.money/" : url;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-content-frame").forEach((tabContent) => {
    tabContent.classList.remove("active");
    tabContent.classList.add("hidden");
  });

  // const newTabId = document.querySelectorAll(".tab").length + 1;
  const allTabs = document.querySelectorAll(".tab");
  const newTabId =
    (parseInt(allTabs[allTabs.length - 1]?.getAttribute("data-tab-id")) || 0) +
    1;

  let newElement = document.createElement("div");
  newElement.classList.add("tab");
  newElement.classList.add("active");
  newElement.setAttribute("data-tab-id", newTabId);
  newElement.setAttribute("data-url", url);

  // Extract hostname from URL to use as tab name
  const urlObj = new URL(url);
  const tabName = urlObj.hostname.replace("www.", "");
  newElement.innerHTML = `<span class="tab-title">${tabName} </span><button class="close-tab-btn">
            <span class="material-symbols-outlined">close</span>
          </button>`;

  newElement.addEventListener("click", tabclicked);
  newElement
    .querySelector(".close-tab-btn")
    .addEventListener("click", closeTab);
  document
    .querySelector(".tab-bar")
    .insertBefore(newElement, document.querySelector(".add-tab-btn"));

  let newWebview = document.createElement("webview");
  newWebview.classList.add("tab-content-frame");
  newWebview.classList.add("active");
  newWebview.setAttribute("id", `frame-${newTabId}`);
  newWebview.setAttribute("src", url);
  newWebview.preload = "preload.cjs";
  let webview_wrapper = document.querySelector(".web-view-wrapper");
  webview_wrapper.appendChild(newWebview);
  // document.body.appendChild(newWebview);

  // Inject common functions into the new webview
  newWebview.addEventListener("dom-ready", () => {
    if (actions) newWebview.executeJavaScript(actions);
  });

  // Add event listeners for the new webview
  newWebview.addEventListener("did-start-loading", () => {
    console.log("Webview started loading");
    document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
  });

  newWebview.addEventListener("did-stop-loading", () => {
    console.log("Webview stopped loading");
    document.querySelector(".address-bar").style.backgroundSize = "100% 100%";
    setTimeout(() => {
      document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
    }, 500);
    url = document.querySelector(".address-bar").value;
    newWebview.executeJavaScript(script);
    newWebview.addEventListener("did-navigate-in-page", (event) => {
      newWebview.executeJavaScript(e.continue_verification_script);
    });
    newWebview.addEventListener("beforeunload", (event) => {
      event.preventDefault();
      event.returnValue = "";
    });
    newWebview.executeJavaScript(`
      window.addEventListener('beforeunload', (event) => {
        event.preventDefault();
        event.returnValue = '';
      });
    `);
  });

  newWebview.addEventListener("did-navigate", (event) => {
    console.log("Webview navigated to:", event.url);
    document.querySelector(".address-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-navigate-in-page", (event) => {
    console.log("Webview navigated in page to:", event.url);
    document.querySelector(".address-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-frame-finish-load", (event) => {
    if (!event.isMainFrame) return;
    newWebview.executeJavaScript("window.location.href").then((url) => {
      console.log("Webview frame finished loading:", url);
      document.querySelector(".address-bar").value = url;
      newElement.setAttribute("data-url", url);
    });
  });

  newWebview.addEventListener("did-fail-load", (event) => {
    console.log("Failed to load:", event.errorDescription);
    document.querySelector(".address-bar").value =
      `Error: ${event.errorDescription}`;
  });
  newWebview.addEventListener("context-menu", context_listener);
  return newWebview;
};

const waitForWebviewLoad = (
  webview = document.querySelector(".tab-content-frame.active"),
  callback,
) => {
  webview.addEventListener("did-finish-load", () => {
    callback();
  });
};
document.querySelector(".add-tab-btn").addEventListener("click", () => {
  const url = document.querySelector(".address-bar").value;
  addTab(url);
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", tabclicked);
  tab.querySelector(".close-tab-btn").addEventListener("click", closeTab);
});

// Add event listeners for the initial webview
const initialWebview = webview;
initialWebview.addEventListener("dom-ready", () => {
  initialWebview.executeJavaScript(actions);
});

initialWebview.addEventListener("did-start-loading", () => {
  console.log("Initial webview started loading");
  document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
});

initialWebview.addEventListener("did-stop-loading", () => {
  console.log("Initial webview stopped loading");
  document.querySelector(".address-bar").style.backgroundSize = "100% 100%";
  setTimeout(() => {
    document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
  }, 500);

  // Prevent page refresh, navigate and window.location.href functions
  // initialWebview.executeJavaScript(`
  //   window.addEventListener('beforeunload', (event) => {
  //     event.preventDefault();
  //     event.returnValue = '';
  //   });
  // `);
});

initialWebview.addEventListener("did-navigate", (event) => {
  console.log("Initial webview navigated to:", event.url);
  document.querySelector(".address-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-navigate-in-page", (event) => {
  console.log("Initial webview navigated in page to:", event.url);
  document.querySelector(".address-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-frame-finish-load", (event) => {
  if (!event.isMainFrame) return;
  initialWebview.executeJavaScript("window.location.href").then((url) => {
    console.log("Initial webview frame finished loading:", url);
    document.querySelector(".address-bar").value = url;
    document.querySelector(".tab.active").setAttribute("data-url", url);
  });
});

initialWebview.addEventListener("did-fail-load", (event) => {
  console.log("Failed to load:", event.errorDescription);
  document.querySelector(".address-bar").value =
    `Error: ${event.errorDescription}`;
});

activeWebview.addEventListener("beforeunload", (event) => {
  console.log("do not close");
  event.preventDefault();
  event.returnValue = "";
});

// listen for the 'interact-webview' event on click
window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded");
  document
    .getElementById("interact-webview")
    .addEventListener("click", async () => {
      url = document.querySelector(".address-bar").value;
      console.log("Interact with webview clicked", url);
      await interactWithWebview(executionScript);
    });
});

// Function to reload the active webview
const reloadWebview = () => {
  activeWebview = document.querySelector(".tab-content-frame.active");
  if (activeWebview) {
    activeWebview.reload();
  }
};

document.getElementById("refresh-btn").addEventListener("click", reloadWebview);

// Listen for the 'open-webview-devtools' event from the main process
window.e.receive("open-webview-devtools", () => {
  const activeWebview = document.querySelector(".tab-content-frame.active");
  if (activeWebview) {
    activeWebview.openDevTools();
    console.log("Opened devtools for active webview");
  } else {
    console.warn("No active webview available to open devtools");
  }
});

window.e.receive("inspect-webview-element", (params) => {
  const activeWebview = document.querySelector(".tab-content-frame.active");
  if (activeWebview) {
    activeWebview.inspectElement(params.x, params.y);
    console.log("Inspecting webview element at", params.x, params.y);
  } else {
    console.warn("No active webview available to inspect element");
  }
});

window.e.receive("create-new-tab", (data) => {
  console.log("Creating new tab from webview action:", data.url, data.script);
  addTab(data.url, data.script || "");
});
