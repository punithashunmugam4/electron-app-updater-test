const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "logger.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT,
    metadata TEXT
  )
`).run();

const insertLog = db.prepare(
  "INSERT INTO logs (timestamp, level, message, metadata) VALUES (?, ?, ?, ?)"
);

function serializeMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return "";
  }
  if (typeof metadata === "string") {
    return metadata;
  }
  try {
    return JSON.stringify(metadata);
  } catch (err) {
    return String(metadata);
  }
}

function write(level, message, metadata = "") {
  insertLog.run(new Date().toISOString(), level, String(message), serializeMetadata(metadata));
}

function info(message, metadata) {
  write("info", message, metadata);
}

function warn(message, metadata) {
  write("warn", message, metadata);
}

function error(message, metadata) {
  write("error", message, metadata);
}

function debug(message, metadata) {
  write("debug", message, metadata);
}

module.exports = {
  log: write,
  info,
  warn,
  error,
  debug,
  dbPath,
};
