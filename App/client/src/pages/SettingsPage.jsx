import { useEffect, useState } from "react";
import {
  checkForUpdates,
  getNetworkInfo,
  getSettings,
  updateSettings,
  applyUpdate,
  installUpdate,
} from "../api";

export default function SettingsPage() {
  const [settings, setSettings] = useState({ port: "", backupUrl: "" });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [staged, setStaged] = useState(false);

  async function handleApplyUpdate() {
    setApplying(true);
    setError("");
    setMessage("");
    try {
      await applyUpdate();
      setStaged(true);
      setMessage("Update downloaded. Click 'Install & Restart' when ready.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ?? "Failed to download update.",
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleInstallUpdate() {
    setInstalling(true);
    setError("");
    try {
      await installUpdate();
      setMessage(
        "Restarting to install update... this page will stop responding briefly.",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ?? "Failed to start installer.",
      );
      setInstalling(false);
    }
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const [settingsResponse, networkResponse, updateResponse] =
          await Promise.all([
            getSettings(),
            getNetworkInfo(),
            checkForUpdates(),
          ]);
        setSettings(settingsResponse.data);
        setNetworkInfo(networkResponse.data);
        setUpdateInfo(updateResponse.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.error ?? "Unable to load settings.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await updateSettings({
        ...settings,
        port: Number(settings.port),
      });
      setSettings(response.data);
      setMessage("Settings saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ?? "Unable to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckForUpdates() {
    setChecking(true);
    setError("");

    try {
      const response = await checkForUpdates();
      setUpdateInfo(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ?? "Unable to check for updates.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleCopy() {
    if (!networkInfo?.lanUrl) return;
    await navigator.clipboard.writeText(networkInfo.lanUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-blue-100">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage local app configuration and updates.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl p-6 shadow-sm space-y-5"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Local configuration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              These settings apply to this installation.
            </p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Port</span>
            <input
              type="number"
              min="1"
              max="65535"
              value={settings.port}
              onChange={(event) =>
                setSettings({ ...settings, port: event.target.value })
              }
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Changing the port requires restarting the app to take effect
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Backup path
            </span>
            <input
              type="text"
              value={settings.backupUrl}
              onChange={(event) =>
                setSettings({ ...settings, backupUrl: event.target.value })
              }
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-slate-600">
              LAN URL
            </span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={networkInfo?.lanUrl ?? ""}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>

        <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-800">
              Application updates
            </h2>
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={checking}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {checking ? "Checking..." : "Check for updates"}
            </button>
          </div>

          {updateInfo?.updateAvailable ? (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900">
                Update available: {updateInfo.currentVersion} →{" "}
                {updateInfo.latestVersion}
              </p>
              {updateInfo.releaseNotes && (
                <p className="text-sm text-amber-800 whitespace-pre-wrap mt-2">
                  {updateInfo.releaseNotes}
                </p>
              )}

              {!staged ? (
                <button
                  type="button"
                  onClick={handleApplyUpdate}
                  disabled={applying}
                  className="mt-4 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {applying ? "Downloading update..." : "Download Update"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallUpdate}
                  disabled={installing}
                  className="mt-4 px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {installing ? "Restarting..." : "Install & Restart"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-emerald-700">
              You&apos;re on the latest version (
              {updateInfo?.currentVersion ?? "unknown"})
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
