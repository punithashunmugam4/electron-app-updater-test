// const { ipcRenderer } = require("electron");

const showDownloadModal = () => {
  const modal = document.getElementById("download-modal");
  modal.style.display = "block";
};

const closeDownloadModal = () => {
  const modal = document.getElementById("download-modal");
  modal.style.display = "none";
};

document
  .getElementById("show-downloads")
  .addEventListener("click", showDownloadModal);
document.querySelector(".close").addEventListener("click", closeDownloadModal);

window.addEventListener("click", (event) => {
  const modal = document.getElementById("download-modal");
  if (event.target == modal) {
    modal.style.display = "none";
  }
});

const updateDownloadProgress = (url, progress) => {
  const downloadList = document.getElementById("download-list");
  let listItem = document.querySelector(`li[data-url="${url}"]`);

  if (!listItem) {
    listItem = document.createElement("li");
    listItem.setAttribute("data-url", url);
    downloadList.appendChild(listItem);
  }

  listItem.innerHTML = `<i class="fas fa-download"></i> ${url}: ${progress}%`;
};

// Listen for download progress messages from the main process
window.electron.receive("download-progress", (message) => {
  console.log("Received download progress:", message.url, message.progress);
  updateDownloadProgress(message.url, message.progress);
});
