// Ailas renderer process communication setup

var webview = document.querySelector(".tab-content-frame.active");
const context_listener = (event) => {
  webview = document.querySelector(".tab-content-frame.active");
  event.preventDefault();
  const bounds = webview.getBoundingClientRect();
  const params = {
    x: event.params.x,
    y: event.params.y,
  };
  e.showContextMenu(params);
};
webview.addEventListener("context-menu", context_listener);

let actions = "";
e.getWebviewActions()
  .then((data) => {
    actions = data || "";
    eval(actions);
    console.log("Webview actions loaded in renderer", data);

    api_call();
  })
  .catch((err) => {
    console.error(
      "Error loading webviewActions.cjs via getWebviewActions:",
      err,
    );
  });

var url = document.getElementById("url-bar").value;
var activeWebview = webview;

document.getElementById("url-form").addEventListener("submit", (event) => {
  event.preventDefault();
  url = document.getElementById("url-bar").value;
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
  document.getElementById("url-bar").value = url;
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
      document.getElementById("url-bar").value =
        newActiveTab?.getAttribute("data-url");
    }
  } else {
    document.getElementById("url-bar").value = "";
  }
};

const addTab = (url = "https://moviesmod.farm/", script = "") => {
  url = url === "" ? "https://moviesmod.farm/" : url;

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
  newElement.innerHTML = `${tabName} <button class="close-tab">&times;</button>`;

  newElement.addEventListener("click", tabclicked);
  newElement.querySelector(".close-tab").addEventListener("click", closeTab);
  document
    .querySelector(".tabs")
    .insertBefore(newElement, document.getElementById("add-tab"));

  let newWebview = document.createElement("webview");
  newWebview.classList.add("tab-content-frame");
  newWebview.classList.add("active");
  newWebview.setAttribute("id", `frame-${newTabId}`);
  newWebview.setAttribute("src", url);
  newWebview.preload = "preload.cjs";
  document.body.appendChild(newWebview);

  // Inject common functions into the new webview
  newWebview.addEventListener("dom-ready", () => {
    if (actions) newWebview.executeJavaScript(actions);
  });

  // Add event listeners for the new webview
  newWebview.addEventListener("did-start-loading", () => {
    console.log("Webview started loading");
    document.getElementById("url-bar").style.backgroundSize = "0% 100%";
  });

  newWebview.addEventListener("did-stop-loading", () => {
    console.log("Webview stopped loading");
    document.getElementById("url-bar").style.backgroundSize = "100% 100%";
    setTimeout(() => {
      document.getElementById("url-bar").style.backgroundSize = "0% 100%";
    }, 500);
    url = document.getElementById("url-bar").value;
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
    document.getElementById("url-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-navigate-in-page", (event) => {
    console.log("Webview navigated in page to:", event.url);
    document.getElementById("url-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-frame-finish-load", (event) => {
    if (!event.isMainFrame) return;
    newWebview.executeJavaScript("window.location.href").then((url) => {
      console.log("Webview frame finished loading:", url);
      document.getElementById("url-bar").value = url;
      newElement.setAttribute("data-url", url);
    });
  });

  newWebview.addEventListener("did-fail-load", (event) => {
    console.log("Failed to load:", event.errorDescription);
    document.getElementById("url-bar").value =
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
document.getElementById("add-tab").addEventListener("click", () => {
  const url = document.getElementById("url-bar").value;
  addTab(url);
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", tabclicked);
  tab.querySelector(".close-tab").addEventListener("click", closeTab);
});

// Add event listeners for the initial webview
const initialWebview = webview;
initialWebview.addEventListener("dom-ready", () => {
  initialWebview.executeJavaScript(actions);
});

initialWebview.addEventListener("did-start-loading", () => {
  console.log("Initial webview started loading");
  document.getElementById("url-bar").style.backgroundSize = "0% 100%";
});

initialWebview.addEventListener("did-stop-loading", () => {
  console.log("Initial webview stopped loading");
  document.getElementById("url-bar").style.backgroundSize = "100% 100%";
  setTimeout(() => {
    document.getElementById("url-bar").style.backgroundSize = "0% 100%";
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
  document.getElementById("url-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-navigate-in-page", (event) => {
  console.log("Initial webview navigated in page to:", event.url);
  document.getElementById("url-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-frame-finish-load", (event) => {
  if (!event.isMainFrame) return;
  initialWebview.executeJavaScript("window.location.href").then((url) => {
    console.log("Initial webview frame finished loading:", url);
    document.getElementById("url-bar").value = url;
    document.querySelector(".tab.active").setAttribute("data-url", url);
  });
});

initialWebview.addEventListener("did-fail-load", (event) => {
  console.log("Failed to load:", event.errorDescription);
  document.getElementById("url-bar").value = `Error: ${event.errorDescription}`;
});

activeWebview.addEventListener("beforeunload", (event) => {
  console.log("do not close");
  event.preventDefault();
  event.returnValue = "";
});

// Interact with webview content
// const interactwithwebview = async (webview, script) => {
//   async function runScriptNode(nodeId) {
//     const node = script[nodeId];
//     if (!node) {
//       console.error(`Node with ID ${nodeId} not found in script.`);
//       return;
//     }
//     try {
//       webview = document.querySelector(".tab-content-frame.active");
//       console.log("interact with webview");
//       const tempNext = e.getNext();
//       await webview.executeJavaScript(node.metadata);
//       const updatedNext = e.getNext();

//       if (updatedNext !== null && updatedNext !== tempNext) {
//         await runScriptNode(updatedNext);
//       } else if (node.next !== null) {
//         await runScriptNode(node.next);
//       } else {
//         console.log("Script execution completed at node", nodeId);
//       }
//     } catch (error) {
//       console.error(`Error executing node ${nodeId}:`, error);
//     }
//   }
//   await runScriptNode(1000);
// };

const interactwithwebview = async (script) => {
  // Removed static 'webview' parameter
  let tempnext = null;
  // Helper to wait for a webview to finish loading its DOM
  const domReady = (wv) =>
    new Promise((resolve) => {
      if (!wv.isLoading()) return resolve();
      wv.addEventListener("dom-ready", () => resolve(), { once: true });
    });

  async function runScriptNode(nodeId) {
    const node = script[nodeId];
    if (!node) {
      console.error(`Node with ID ${nodeId} not found in script.`);
      return;
    }

    try {
      // 1. Always grab whichever webview is currently active AT THIS MOMENT
      const currentWebview = document.querySelector(
        ".tab-content-frame.active",
      );

      if (!currentWebview) {
        console.error("No active webview found for node:", nodeId);
        return;
      }

      // 2. Wait for the active webview to be fully ready if it just changed
      await domReady(currentWebview);

      console.log(`Executing node ${nodeId} on current active webview.`);

      // 3. Run the script
      const updatedNext = await currentWebview.executeJavaScript(node.metadata);
      // const updatedNext = e.getNext();
      console.log("Updated next after executing node:", updatedNext);
      // 4. Determine the next node
      let nextNodeId = null;
      if (updatedNext && updatedNext !== tempnext) {
        nextNodeId = updatedNext;
      } else if (node.next !== null) {
        nextNodeId = node.next;
      }
      tempnext = nextNodeId; // Update tempnext to the next node we're going to execute
      console.log("Next node ID to execute:", nextNodeId);
      if (nextNodeId !== null) {
        // Give Electron a microscopic breath to process tab switches/navigating

        setTimeout(() => runScriptNode(nextNodeId), 100);
      } else {
        console.log("Script execution completed at node", nodeId);
      }
    } catch (error) {
      console.error(`Error executing node ${nodeId}:`, error);
    }
  }

  // Start with the initial node
  await runScriptNode(1000);
};

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded");
  document.getElementById("interact-webview").addEventListener("click", () => {
    url = document.getElementById("url-bar").value;
    console.log("Interact with webview clicked", url);
    let webview = document.querySelector(".tab-content-frame.active");
    interactwithwebview(e.testScript).catch((error) => {
      console.error("Error interacting with webview:", error);
    });
  });
});

// Function to reload the active webview
const reloadWebview = () => {
  activeWebview = document.querySelector(".tab-content-frame.active");
  if (activeWebview) {
    activeWebview.reload();
  }
};

document
  .getElementById("reload-webview")
  .addEventListener("click", reloadWebview);

// Listen for the 'open-webview-devtools' event from the main process
e.receive("open-webview-devtools", () => {
  let activeWebview = document.querySelector(".tab-content-frame.active");
  activeWebview?.openDevTools();
});

e.receive("create-new-tab", (data) => {
  console.log("Creating new tab from webview action:", data.url, data.script);
  addTab(data.url, data.script || "");
});

e.receive("inspect-element", (event) => {
  webview = document.querySelector(".tab-content-frame.active");
  webview?.inspectElement(event.x, event.y);
});
