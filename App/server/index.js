const cors = require("cors");
const express = require("express");
const db = require("./db.js");
const runMigrations = require("./scripts/migrate.js");
const fs = require('fs');
const path = require("path");
const config = require("./config.js");
const https = require('https');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');

// Run migrations FIRST before any controller is required
runMigrations(db);

const issuerRoute = require("./routes/issuerRoutes.js");
const clientRoute = require("./routes/clientRoutes.js");
const bankRoute = require("./routes/bankRoutes.js");
const billRoutes = require("./routes/billRoute.js");
const appRoutes = require("./routes/appRoutes.js");
const paymentModeRoutes = require("./routes/paymentModeRoutes.js");
const paymentRoutes = require("./routes/paymentRoutes.js");

const app = express();

const versionPath = path.join(__dirname, "..", "version.json");
const configPath = path.join(__dirname, "..", "config.json");

function localOnly(req, res, next) {
  const localAddresses = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

  if (!localAddresses.includes(req.socket.remoteAddress)) {
    return res
      .status(403)
      .json({ error: "Settings only accessible on the host machine" });
  }

  next();
}

app.use(express.json());
app.use(cors({}));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use("/api/issuers", issuerRoute);
app.use("/api/clients", clientRoute);
app.use("/api/bank", bankRoute);
app.use("/api/bills", billRoutes);
app.use("/api/app", appRoutes);
app.use("/api/payment-modes", paymentModeRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/api/version", (req, res) => {
  const versionData = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
  res.json(versionData);
});

async function getLatestRelease() {
  const response = await fetch(
    "https://api.github.com/repos/Daksh-codes/invoice-generator/releases/latest",
  );
  if (!response.ok) {
    throw new Error("Failed to fetch latest release");
  }
  const data = await response.json();
  return {
    version: data.tag_name,
    downloadUrl: data.assets[0]?.browser_download_url,
    releaseNotes: data.body,
  };
}

app.get("/api/check-update", localOnly, async (req, res) => {
  try {
    const localVersion = JSON.parse(
      fs.readFileSync(versionPath, "utf-8"),
    ).version;

    const latest = await getLatestRelease();

    res.json({
      currentVersion: localVersion,
      latestVersion: latest.version,
      updateAvailable: localVersion !== latest.version,
      downloadUrl: latest.downloadUrl,
      releaseNotes: latest.releaseNotes,
    });
  } catch (err) {
    console.error("Update check failed:", err);
    res.status(500).json({ error: "Could not check for updates" });
  }
});

app.get("/api/network-info", localOnly, (req, res) => {
  const { port } = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const hostname = require("os").hostname();
  res.json({ hostname, port, lanUrl: `http://${hostname}:${port}` });
});

app.get("/api/settings", localOnly, (req, res) => {
  res.json(JSON.parse(fs.readFileSync(configPath, "utf-8")));
});

app.put("/api/settings", localOnly, (req, res) => {
  const existingConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const updatedConfig = { ...existingConfig, ...req.body };
  fs.writeFileSync(configPath, `${JSON.stringify(updatedConfig, null, 2)}\n`);
  res.json(updatedConfig);
});

// Step 1: download the update and extract it to a staging folder
app.post('/api/apply-update', localOnly, async (req, res) => {
  const rootDir = path.join(__dirname, '..', '..');
  const zipPath = path.join(rootDir, 'update-temp.zip');
  const stagingDir = path.join(rootDir, 'staging');

  try {
    const latest = await getLatestRelease();
    const appAsset = latest.assets?.find(a => a.name.startsWith('InvoiceApp-Update-'));

    if (!appAsset) {
      return res.status(500).json({ error: 'Update package not found in latest release.' });
    }

    // Clean up any leftover staging folder from a previous failed attempt
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }

    await downloadFile(appAsset.browser_download_url, zipPath);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(stagingDir, true);

    fs.unlinkSync(zipPath);

    // Sanity check: make sure the extracted folder actually has an App folder in it
    const stagedAppPath = path.join(stagingDir, 'App');
    if (!fs.existsSync(stagedAppPath)) {
      return res.status(500).json({ error: 'Downloaded update package looks invalid (no App folder found).' });
    }

    res.json({ staged: true, message: 'Update downloaded and ready to install.' });
  } catch (err) {
    console.error('Update staging failed:', err);
    // Clean up partial downloads/extracts on failure
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
    res.status(500).json({ error: 'Failed to download and prepare update.' });
  }
});

// Step 2: hand off to update.bat, then exit so it can safely swap files
app.post('/api/install-update', localOnly, (req, res) => {
  const rootDir = path.join(__dirname, '..', '..');
  const stagingAppPath = path.join(rootDir, 'staging', 'App');
  const updateBatPath = path.join(rootDir, 'update.bat');

  if (!fs.existsSync(stagingAppPath)) {
    return res.status(400).json({ error: 'No staged update found. Download the update first.' });
  }

  res.json({ started: true, message: 'Restarting to apply update...' });

  // Give the response time to actually reach the browser before we exit
  setTimeout(() => {
    const child = spawn('cmd.exe', ['/c', updateBatPath], {
      cwd: rootDir,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    process.exit(0);
  }, 500);
});

// helper function
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    function request(currentUrl) {
      https.get(currentUrl, { headers: { 'User-Agent': 'InvoiceApp-Updater' } }, (response) => {
        // Follow redirect (GitHub release assets redirect to a signed URL)
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    request(url);
  });
}

app.get("/health", (req, res) => {
  res.send("OK");
});


console.log("Static path:", path.join(__dirname, "../client/dist"));
app.use(express.static(path.join(__dirname, "../client/dist")));
//app.use(express.static(path.join(__dirname, "../client/dist")));
// app.get(/^(?!\/api|\/images).*$/, (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.get(/^\/(?!api\/|images\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running on port ${config.port}`);
});
