const testScript = {
  1000: {
    metadata: `console.log("Starting with Node 1000"); sleep(1000);
      openNewTab("https://yts.bz/");
      if (true) { 
        "1002"; 
      } else { 
        "1001"; 
      } `,
    next: 1001,
  },
  1001: {
    metadata: `console.log("True and running script Node 1001"); "complete";`,
    next: null,
  },
  1002: {
    metadata: `console.log("False and running script Node 1002")`,
    next: 1001,
  },
};

//  interactwithwebview with the testScript
export const interactWithWebview = async (script) => {
  let tempnext = null;
  // This global state object will persist across all nodes in the script execution
  const globalState = {};
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

      // 3. If metadata is a function, pass it the global state to generate the script string
      const scriptCode =
        typeof node.metadata === "function"
          ? node.metadata(globalState)
          : node.metadata;
      console.log(`Generated script for node ${nodeId}:`, scriptCode);
      // 4. Run the script and extract the evaluation
      const result = await currentWebview.executeJavaScript(scriptCode);
      console.log("Result after executing node:", result);
      // 5. Determine the next node
      let nextNodeId = null;
      // 6. Process returned routing instructions and save state values
      if (result && typeof result === "object") {
        // Save any data returned by the webview into our persistent Host state
        if (result.saveData) {
          Object.assign(globalState, result.saveData);
          console.log("[Host State Updated]:", globalState);
        }
        nextNodeId = result.nextState ? Number(result.nextState) : node.next;
      } else if (result && result !== "complete") {
        nextNodeId = Number(result);
      } else {
        nextNodeId = node.next;
      }
      tempnext = nextNodeId; // Update tempnext to the next node we're going to execute

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

const moviesmod_script = {
  1000: {
    metadata: `
    console.log("Running script Node 1000"); 
    openNewTab("https://moviesmod.farm/download-defendor-2009-hindi-english-480p-720p-1080p/");
    console.log("End of Node 1000");
    globalVars.set("mySharedValue", "New global var set");
    ({
        nextState: "1001",
        saveData: { mySharedValue: "Hello from Tab 1!" }
      });
  `,
    next: 1001,
  },
  1001: {
    metadata: (sharedData) => `
    let open_link_e;
   (async () => { console.log("Running script Node 1001");  
    console.log("Retrieved data from previous tab:", ${JSON.stringify(sharedData.mySharedValue)});
    let store =await globalVars.get("mySharedValue");
 console.log("Global stored vars",store);
    let XpathsCollection = document.querySelectorAll(".maxbutton-download-links");
     
            console.log(XpathsCollection);
            if (XpathsCollection && XpathsCollection.length > 0) {
               open_link_e = Array.from(XpathsCollection).find((element) => {
                let text = element.parentNode.previousElementSibling.innerText;
                if (text != undefined && text.includes("720p")) {
                  return true;
                }
                return false;
              });
            } 
              let open_link_e_xpath = getXpathFromElement(open_link_e); 
              console.log("End of Node 1001"); 
              console.log("open_link_e:", open_link_e);
              ({nextState:"1002",
              saveData:{ open_link_e:  open_link_e_xpath}
              });
              })();`,
    next: 1002,
  },
  1002: {
    metadata: (sharedData) => `console.log("Running script Node 1002");
    console.log("Shared data:", ${JSON.stringify(sharedData)});
    console.log("open_link_e:", ${JSON.stringify(sharedData.open_link_e)});
     console.log("Retrieved data from previous tab:", ${JSON.stringify(sharedData.mySharedValue)});
    function clickElement() {
      while(counter>0){
        if (open_link_e) {
          openNewTab(open_link_e.href);
          counter=0;
          console.log("Element found and link opended in new tab");
          break;
        } else {
          sleep(1000); 
          console.log("Element not found, retrying...");
          counter--;
        }
      }
    }
    clickElement();
    sleep(5000);
    console.log("End of Node 1002");
`,
    next: null,
  },
};

export const executionScript = moviesmod_script; // testScript, moviesmod_script
