// const axios = require("axios");
// const path = require("path");
// const fs = require("fs");
// const exec = require("child_process").exec;
// const { app } = require("electron");

import axios from "axios";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { app } from "electron";

async function checkForFileUpdates() {
  const currentVersion = "1.0.0"; // Your current local app version

  // Replace with your actual GitHub Username and Repository Name
  const GITHUB_USER = "punithashunmugam4";
  const GITHUB_REPO = "electron-app-updater-test";
  const BRANCH = "main";

  // Base URL pointing to your update folder on GitHub
  const baseUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}`;

  try {
    // 1. Fetch the manifest file from GitHub
    const response = await axios.get(`${baseUrl}/manifest.json`);
    const manifest = response.data;

    if (manifest?.version !== currentVersion) {
      const targetDir = path.join(app.getPath("userData"), "app_files");

      // 2. Loop through and download EVERY changed file listed in the manifest
      for (const filePath of manifest.changedFiles) {
        const fileUrl = `${baseUrl}/${filePath}`;
        const fileData = await axios.get(fileUrl, { responseType: "text" });

        // Define local destination path inside userData
        const destPath = path.join(targetDir, filePath);

        // Ensure folder structure (like targetDir/src/) exists before writing
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, fileData.data);
      }

      // 3. Handle Node Modules if they exist in the manifest
      if (
        manifest.newDependencies &&
        Object.keys(manifest.newDependencies).length > 0
      ) {
        const localPkg = { dependencies: manifest.newDependencies };
        fs.writeFileSync(
          path.join(targetDir, "package.json"),
          JSON.stringify(localPkg),
        );

        exec("npm install --production", { cwd: targetDir }, (err) => {
          if (!err) restartApp();
        });
      } else {
        restartApp();
      }
    }
  } catch (error) {
    console.error("GitHub update sync failed:", error);
  }
}

function restartApp() {
  app.relaunch();
  app.exit(0);
}

module.exports = { checkForFileUpdates };
