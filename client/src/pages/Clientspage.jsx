// src/pages/ClientsPage.jsx
// Route: /clients
// Inline add/edit with name + address fields

import { useState, useEffect, useRef } from "react";
import { getAllClients, createClient, updateClient, deleteClient } from "../api";

function InlineInput({ value, onChange, placeholder, autoFocus }) {
  const ref = useRef();
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
    />
  );
}

const EMPTY_ROW = { name: "", address: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null); // client id or "new"
  const [editValues, setEditValues] = useState(EMPTY_ROW);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getAllClients()
      .then(res => setClients(res.data ?? []))
      .catch(() => setError("Failed to load clients."))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(client) {
    setEditingId(client.id);
    setEditValues({ name: client.name ?? "", address: client.address ?? "" });
    setRowError(null);
  }

  function startAdd() {
    setEditingId("new");
    setEditValues(EMPTY_ROW);
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues(EMPTY_ROW);
    setRowError(null);
  }

  async function handleSave() {
    if (!editValues.name.trim()) { setRowError("Client name is required."); return; }
    setSaving(true);
    setRowError(null);
    try {
      if (editingId === "new") {
        const res = await createClient({ name: editValues.name.trim(), address: editValues.address.trim() || null });
        setClients(c => [...c, { id: res.data.id, name: editValues.name.trim(), address: editValues.address.trim() || null }]);
      } else {
        await updateClient(editingId, { name: editValues.name.trim(), address: editValues.address.trim() || null });
        setClients(c => c.map(cl => cl.id === editingId
          ? { ...cl, name: editValues.name.trim(), address: editValues.address.trim() || null }
          : cl));
      }
      cancelEdit();
    } catch (err) {
      setRowError(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteClient(id);
      setClients(c => c.filter(cl => cl.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete client.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") cancelEdit();
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 shadow text-red-600 text-sm">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Clients</h1>
            <p className="text-xs text-slate-400 mt-0.5">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={startAdd} disabled={editingId !== null}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</th>
                <th className="px-4 py-3 w-36" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {editingId === "new" && (
                <tr className="bg-blue-50">
                  <td className="px-4 py-2 text-slate-300 text-xs">new</td>
                  <td className="px-4 py-2" onKeyDown={handleKeyDown}>
                    <InlineInput value={editValues.name} onChange={v => setEditValues(e => ({ ...e, name: v }))}
                      placeholder="Client name" autoFocus />
                    {rowError && <p className="text-xs text-red-500 mt-1">{rowError}</p>}
                  </td>
                  <td className="px-4 py-2" onKeyDown={handleKeyDown}>
                    <InlineInput value={editValues.address} onChange={v => setEditValues(e => ({ ...e, address: v }))}
                      placeholder="Address (optional)" />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={handleSave} disabled={saving}
                        className="px-3 py-1 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
                        {saving ? "…" : "Save"}
                      </button>
                      <button onClick={cancelEdit}
                        className="px-3 py-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {clients.length === 0 && editingId !== "new" && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No clients yet. Click "Add Client" to get started.
                  </td>
                </tr>
              )}

              {clients.map((client, i) => (
                <tr key={client.id} className={`transition-colors ${editingId === client.id ? "bg-amber-50" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-2 text-xs text-slate-300">{i + 1}</td>

                  {editingId === client.id ? (
                    <>
                      <td className="px-4 py-2" onKeyDown={handleKeyDown}>
                        <InlineInput value={editValues.name} onChange={v => setEditValues(e => ({ ...e, name: v }))}
                          placeholder="Client name" autoFocus />
                        {rowError && <p className="text-xs text-red-500 mt-1">{rowError}</p>}
                      </td>
                      <td className="px-4 py-2" onKeyDown={handleKeyDown}>
                        <InlineInput value={editValues.address} onChange={v => setEditValues(e => ({ ...e, address: v }))}
                          placeholder="Address (optional)" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-700">{client.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{client.address ?? "—"}</td>
                    </>
                  )}

                  <td className="px-4 py-2">
                    {editingId === client.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={handleSave} disabled={saving}
                          className="px-3 py-1 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
                          {saving ? "…" : "Save"}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-3 py-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => startEdit(client)} disabled={editingId !== null}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(client.id, client.name)}
                          disabled={deletingId === client.id || editingId !== null}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          {deletingId === client.id ? "…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">Enter</kbd> to save · <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">Esc</kbd> to cancel
        </p>
      </div>
    </div>
  );
}