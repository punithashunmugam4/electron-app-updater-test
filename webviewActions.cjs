console.log("Webview actions loaded");
var counter = 5;
console.log(counter);

function getElementByXpath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openNewTab(url, script) {
  console.log("Sending message to open new tab with URL:", url, script);
  // Use the context-bridge exposed API in the page context
  if (window?.electron?.send) {
    window.electron.send("open-new-tab", { url: url, script: script });
  } else {
    console.warn("window.electron.send not available, cannot open new tab");
  }
}

var api_call = () => {
  console.log("API call executed");
};
