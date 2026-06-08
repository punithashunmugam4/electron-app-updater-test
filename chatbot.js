// Simulated local folder JSON profiles
let mockJsonDatabase = null;

const widgetToggle = document.getElementById("widget-toggle");
const chatWindow = document.getElementById("chat-window");
const closeChat = document.getElementById("close-chat");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const globalStatusDot = document.getElementById("bot-status");
const chatForm = document.getElementById("chat-form");

window.addEventListener("DOMContentLoaded", () => {
  chatWindow.classList.add("open");
  userInput.focus();
});
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
                                <span class="chip-action-label">Select Bot</span>
                            </button>
                        `;
      });
      suggestionsHTML += `</div>`;

      botResponseContainer.innerHTML = `
                        <div>
                            <div class="bubble">I found matching bots inside your repo. Select a module below to link it to run your automation</div>
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

  globalStatusDot.classList.add("active");
  globalStatusDot.textContent = botName;

  // Confirm selection inside conversational log bubble
  appendMessageRow(
    "bot",
    `Successfully started the <strong>${botName}</strong> bot.`,
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
