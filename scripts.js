const importedScript = await electron.importWorkflowJSON("test_tree.json");

export const interactWithWebview = async (script = importedScript) => {
  // Helper to wait for a webview to finish loading its DOM.
  // Electron throws if isLoading() is called before the webview is attached
  // and the DOM-ready event has fired, so we guard the check and wait for
  // the actual ready event instead of assuming the instance is ready.
  const domReady = (wv) =>
    new Promise((resolve) => {
      if (!wv) return resolve();

      const finish = () => {
        wv.removeEventListener("dom-ready", finish);
        wv.removeEventListener("did-finish-load", finish);
        resolve();
      };

      try {
        if (typeof wv.isLoading === "function" && !wv.isLoading()) {
          finish();
          return;
        }
      } catch (error) {
        // Webview is not ready yet; wait for the actual DOM-ready event.
      }

      wv.addEventListener("dom-ready", finish, { once: true });
      wv.addEventListener("did-finish-load", finish, { once: true });
    });

  const chatMessages = document.getElementById("chat-messages");
  function display_bot_loader() {
    const bot_loader = `<div class="bot-loader">
  <span></span>
  <span></span>
  <span></span>
  </div>`;
    const row = document.createElement("div");
    row.className = `message-row bot`;
    row.innerHTML = bot_loader;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function remove_bot_loader() {
    document.querySelector(".bot-loader").parentElement.remove();
  }

  function display_node_message(node_id, node_name) {
    const timeString = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const row = document.createElement("div");
    row.className = `message-row bot`;
    row.innerHTML = `
                <div>
                    <div class="bubble">${node_id}: ${node_name}</div>
                    <span class="timestamp">${timeString}</span>
                </div>
            `;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  async function runScriptNode(nodeId) {
    globalVars.set("next", null);
    const node = script[nodeId];
    display_node_message(nodeId, node.name);
    display_bot_loader();
    if (!node) {
      console.error(`Node with ID ${nodeId} not found in script.`);
      return;
    }
 let nextNodeId = null;
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

      console.log(`Generated script for node ${nodeId}:`, node.metadata);

      // 4. Run the script
      globalVars.set("currentNode", nodeId);
      await currentWebview.executeJavaScript(node.metadata);
      remove_bot_loader();
      // 5. Determine the next node
      let nextNode = await globalVars.get("next");
     
      // 6. Process returned routing instructions and save state values
      if (nextNode && node.conditionalRoutes[`${nextNode}`] != null) {
        nextNodeId = Number(node.conditionalRoutes[`${nextNode}`]);
        console.log(
          `Routing to next node ${nextNodeId} based on condition "${nextNode}"`,
        );
      } else if (Object.keys(node.conditionalRoutes).length > 0) {
        let key = Object.keys(node.conditionalRoutes)[0];
        nextNodeId = Number(node.conditionalRoutes[key]);
        console.log(
          `No condition met, defaulting to node ${nextNodeId} based on key "${key}"`,
        );
      }

      if (nextNodeId !== null) {
        // Give Electron a microscopic breath to process tab switches/navigating
        console.log("Next node ID to execute:", nextNodeId);
        setTimeout(() => runScriptNode(nextNodeId), 100);
      } else {
        console.log("Script execution completed at node", nodeId);
      }
    } catch (error) {
      console.error(`Error executing node ${nodeId}:`, error);
      nextNodeId = null;
      console.log("Script execution halted due to error at node", nodeId);
        remove_bot_loader();
    }
  }

  // Start with the initial node
  await runScriptNode(1000);
};

export const executionScript = importedScript; // testScript, moviesmod_script
