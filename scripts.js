const importedScript = await electron.importWorkflowJSON("test_tree.json");

export const interactWithWebview = async (script = importedScript) => {
  // Helper to wait for a webview to finish loading its DOM
  const domReady = (wv) =>
    new Promise((resolve) => {
      if (!wv.isLoading()) return resolve();
      wv.addEventListener("dom-ready", () => resolve(), { once: true });
    });

  async function runScriptNode(nodeId) {
    globalVars.set("next", null);
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

      console.log(`Generated script for node ${nodeId}:`, node.metadata);

      // 4. Run the script
      globalVars.set("currentNode", nodeId);
      await currentWebview.executeJavaScript(node.metadata);
      // 5. Determine the next node
      let nextNode = await globalVars.get("next");
      let nextNodeId = null;
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
    }
  }

  // Start with the initial node
  await runScriptNode(1000);
};

export const executionScript = importedScript; // testScript, moviesmod_script
