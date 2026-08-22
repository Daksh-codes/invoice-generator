const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../config.json");
const exampleConfigPath = path.join(__dirname, "../config.example.json");
const defaults = {
  port: 3000,
  backupUrl: "%USERPROFILE%\\Desktop\\InvoiceBackups",
};

function readConfigFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

module.exports = {
  ...defaults,
  ...readConfigFile(fs.existsSync(configPath) ? configPath : exampleConfigPath),
};
