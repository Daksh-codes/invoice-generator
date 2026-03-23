// src/pages/PrefixHistoryPage.jsx
// Route: /firms/:id/prefix-history
// Shows invoice and quotation prefix history, allows changing prefix

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getIssuer, getPrefixHistory, changePrefix } from "../api";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PrefixHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [firm, setFirm] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Change prefix form state
  const [changing, setChanging] = useState(null); // "INVOICE" | "QUOTATION" | null
  const [newPrefix, setNewPrefix] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    Promise.all([getIssuer(id), getPrefixHistory(id)])
      .then(([firmRes, histRes]) => {
        setFirm(firmRes.data);
        setHistory(histRes.data ?? []);
      })
      .catch(() => setError("Failed to load prefix history."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleChange() {
    if (!newPrefix.trim()) { setSaveError("Prefix is required."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await changePrefix(id, { doc_type: changing, new_prefix: newPrefix.trim() });
      // Refresh
      const [firmRes, histRes] = await Promise.all([getIssuer(id), getPrefixHistory(id)]);
      setFirm(firmRes.data);
      setHistory(histRes.data ?? []);
      setChanging(null);
      setNewPrefix("");
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to change prefix.");
    } finally {
      setSaving(false);
    }
  }

  const invoiceHistory = history.filter(h => h.doc_type === "INVOICE");
  const quotationHistory = history.filter(h => h.doc_type === "QUOTATION");

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
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button type="button" onClick={() => navigate(`/firms/${id}/edit`)}
          className="text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800">Prefix History</h1>
          <p className="text-xs text-slate-400 mt-0.5">{firm?.firm_name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Current prefixes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Current Prefixes</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: "INVOICE", label: "Invoice Prefix", current: firm?.invoice_prefix, counter: firm?.invoice_counter },
              { type: "QUOTATION", label: "Quotation Prefix", current: firm?.quotation_prefix, counter: firm?.quotation_counter },
            ].map(({ type, label, current, counter }) => (
              <div key={type} className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="font-mono text-lg font-bold text-slate-800">{current}</p>
                <p className="text-xs text-slate-400 mt-1">Next: {current}{counter}</p>
                <button
                  onClick={() => { setChanging(type); setNewPrefix(current ?? ""); setSaveError(null); }}
                  className="mt-3 text-xs text-blue-600 hover:underline"
                >
                  Change prefix →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Change prefix form */}
        {changing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Change {changing === "INVOICE" ? "Invoice" : "Quotation"} Prefix</h2>
              <p className="text-xs text-amber-700 mt-1">Counter will reset to 1. Old bills keep their numbers.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={newPrefix}
                onChange={e => setNewPrefix(e.target.value)}
                placeholder="e.g. INV/26-27/"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleChange(); if (e.key === "Escape") setChanging(null); }}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono"
              />
              <button onClick={handleChange} disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
                {saving ? "…" : "Confirm"}
              </button>
              <button onClick={() => { setChanging(null); setNewPrefix(""); setSaveError(null); }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          </div>
        )}

        {/* Invoice history */}
        <PrefixTable title="Invoice Prefix History" rows={invoiceHistory} />

        {/* Quotation history */}
        <PrefixTable title="Quotation Prefix History" rows={quotationHistory} />

      </div>
    </div>
  );
}

function PrefixTable({ title, rows }) {
  if (!rows.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Prefix</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">From #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">To #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Changed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className={`hover:bg-slate-50 ${i === rows.length - 1 ? "font-medium" : ""}`}>
              <td className="px-4 py-3 font-mono text-slate-800">{row.prefix}</td>
              <td className="px-4 py-3 text-slate-600">{row.counter_start}</td>
              <td className="px-4 py-3 text-slate-600">{row.counter_end ?? <span className="text-emerald-600 text-xs">active</span>}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(row.changed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}