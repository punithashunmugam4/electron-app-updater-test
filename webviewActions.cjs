console.log("Webview actions loaded");
var counter = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getElementByXpath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
}

function getXpathFromElement(element) {
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
