// src/pages/FirmsList.jsx
// Route: /firms

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllIssuers, deleteIssuer } from "../api";

export default function FirmsList() {
  const navigate = useNavigate();
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getAllIssuers()
      .then(res => setFirms(res.data ?? []))
      .catch(() => setError("Failed to load firms."))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteIssuer(id);
      setFirms(f => f.filter(firm => firm.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete firm.");
    } finally {
      setDeletingId(null);
    }
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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Firms</h1>
            <p className="text-xs text-slate-400 mt-0.5">{firms.length} firm{firms.length !== 1 ? "s" : ""} registered</p>
          </div>
          <button
            onClick={() => navigate("/firms/new")}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Firm
          </button>
        </div>

        {/* List */}
        {firms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm shadow-sm">
            No firms yet.{" "}
            <button onClick={() => navigate("/firms/new")} className="text-slate-600 underline">
              Create your first firm
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Firm</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">GSTIN / PAN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Prefix</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {firms.map(firm => (
                  <tr key={firm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {firm.logo ? (
                          <img
                            src={`http://localhost:3000${firm.logo}`}
                            alt="logo"
                            className="w-8 h-8 object-contain rounded border border-slate-100"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                            {firm.firm_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{firm.firm_name}</p>
                          {firm.sub_heading && <p className="text-xs text-slate-400">{firm.sub_heading}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        {firm.phone && <span>{firm.phone}</span>}
                        {firm.email && <span className="text-xs">{firm.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex flex-col gap-0.5 font-mono text-xs">
                        {firm.gstin && <span>{firm.gstin}</span>}
                        {firm.pan && <span>{firm.pan}</span>}
                        {!firm.gstin && !firm.pan && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span>INV: {firm.invoice_prefix}</span>
                        <span>QT: {firm.quotation_prefix}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/firms/${firm.id}/edit`)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(firm.id, firm.firm_name)}
                          disabled={deletingId === firm.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === firm.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}