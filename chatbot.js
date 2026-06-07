// Simulated local folder JSON profiles
let mockJsonDatabase = null;

const widgetToggle = document.getElementById("widget-toggle");
const chatWindow = document.getElementById("chat-window");
const closeChat = document.getElementById("close-chat");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const activeTargetName = document.getElementById("active-target-name");
const globalStatusDot = document.getElementById("global-status-dot");
const canvasView = document.getElementById("canvas-view");
const chatForm = document.getElementById("chat-form");

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleMessageSubmit();
});

widgetToggle.addEventListener("click", () => {
  chatWindow.classList.add("open");
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

closeChat.addEventListener("click", () => {
  chatWindow.classList.remove("open");
});

function handleMessageSubmit() {
  const query = userInput.value.trim();
  if (!query) return;

  const timeString = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1. Post user input to chat stream
  appendMessageRow("user", query, timeString);
  userInput.value = "";

  // 2. Query processing Suggestion Evaluation Loop
  setTimeout(async () => {
    // Look for fuzzy keyword matches from database properties
    mockJsonDatabase = await electron.getAllbotsList();
    const matches = mockJsonDatabase.filter((item) =>
      item.fileName.toLowerCase().includes(query.toLowerCase()),
    );

    if (matches.length > 0) {
      // Build container block for suggestion elements
      const botResponseContainer = document.createElement("div");
      botResponseContainer.className = "message-row bot";

      let suggestionsHTML = `<div class="recommendation-container">
                        <div class="recommendation-title">Matched Local Workflow Profiles:</div>`;

      matches.forEach((match) => {
        let botName = match.fileName.split(".")[0];
        console.log("Looping through all matches", match);
        suggestionsHTML += `
                            <button class="suggestion-chip" onclick="selectBotProfile('${botName}','${match.fileName}','${match.path}')">
                                <div>
                                    <strong style="display:block; font-size:0.85rem;">${botName} </strong>
                                    <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${match.fileName}</span>
                                </div>
                                <span class="chip-action-label">Mount Target</span>
                            </button>
                        `;
      });
      suggestionsHTML += `</div>`;

      botResponseContainer.innerHTML = `
                        <div>
                            <div class="bubble">I found matching workflow profiles inside your tracking directory. Select a module below to link it to your active workspace:</div>
                            ${suggestionsHTML}
                            <span class="timestamp">${timeString}</span>
                        </div>
                    `;
      chatMessages.appendChild(botResponseContainer);
    } else {
      // Fallback response block
      appendMessageRow(
        "bot",
        `No matching file entries found for "${query}". Try searching alternative keys like "routine", "step", or "logger".`,
        timeString,
      );
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 600);
}

// Action when a recommended layout is clicked
function selectBotProfile(botName, fileName, path) {
  console.log("Selected Bot profile: ", botName, fileName, path);
  const timeString = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Update Canvas UI Banner indicators
  activeTargetName.textContent = fileName;
  globalStatusDot.classList.add("active");

  // Update main window layout presentation state
  canvasView.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--primary-hover); margin-bottom: 16px; text-shadow: 0 0 20px var(--primary-accent);">sync_saved_locally</span>
                <h2 style="color:#ffffff;">${botName} Active</h2>
                <p style="color: var(--text-muted); font-family: monospace; font-size:0.85rem; background: rgba(0,0,0,0.2); padding: 6px 12px; border-radius:6px; display:inline-block; margin-top:8px;">Linked file: ${fileName}</p>
            `;

  // Confirm selection inside conversational log bubble
  appendMessageRow(
    "bot",
    `Successfully mounted <strong>${botName}e</strong> into the active execution pipeline context. Grid coordinates have reset.`,
    timeString,
  );
  chatMessages.scrollTop = chatMessages.scrollHeight;

  electron.runBotAutomation({
    botName: botName,
    fileName: fileName,
    path: path,
  });
}

function appendMessageRow(sender, text, timestamp) {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;
  row.innerHTML = `
                <div>
                    <div class="bubble">${text}</div>
                    <span class="timestamp">${timestamp}</span>
                </div>
            `;
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
