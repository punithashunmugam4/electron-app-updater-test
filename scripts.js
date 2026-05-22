let script = {
  1000: { metadata: `if(true){next="1001"} else{next="1002"}`, next: 1001 },
  1001: {
    metadata: `console.log("True and running script Node 1001")`,
    next: null,
  },
  1002: {
    metadata: `console.log("False and running script Node 1002")`,
    next: null,
  },
};

function runScriptNode(nodeId) {
  const node = script[nodeId];
  if (!node) {
    console.error(`Node with ID ${nodeId} not found in script.`);
    return;
  }
  try {
    const func = new Function(node.metadata);
    func();
    if (node.next !== null) {
      runScriptNode(node.next);
    }
  } catch (error) {
    console.error(`Error executing node ${nodeId}:`, error);
  }
}
runScriptNode(1000);
