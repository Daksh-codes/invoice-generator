// src/pages/BillsDashboard.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  getAllBills,
  getAllIssuers,
  updatePaymentStatus,
  voidBill,
  unvoidBill,
  getPaymentModes,
  createPaymentMode,
} from "../api";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatAmount(val) {
  if (val == null) return "₹0";
  return (
    "₹" +
    Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES = {
  unpaid: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
    label: "Unpaid",
  },
  partial: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    label: "Partial",
  },
  paid: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Paid",
  },
  void: {
    bg: "bg-slate-100",
    text: "text-slate-400",
    dot: "bg-slate-300",
    label: "Void",
  },
};

// ── Shared: Mode dropdown with inline add ─────────────────────────────────
function ModeDropdown({ current, modes, onSelect, onAddMode }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const inputRef = useRef();

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 50);
  }, [adding]);

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    const created = await onAddMode(label);
    if (created) onSelect(created.label);
    setAdding(false);
    setNewLabel("");
    setOpen(false);
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
      >
        {current ?? "Set mode"}
        <svg
          className="w-3 h-3 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setOpen(false);
              setAdding(false);
              setNewLabel("");
            }}
          />
          <div className="absolute z-20 left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => {
                  onSelect(m);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${m === current ? "font-semibold text-slate-800" : "text-slate-600"}`}
              >
                {m}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-1">
              {adding ? (
                <div className="px-2 py-1 flex gap-1">
                  <input
                    ref={inputRef}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                      if (e.key === "Escape") {
                        setAdding(false);
                        setNewLabel("");
                      }
                    }}
                    placeholder="Mode name…"
                    className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <button
                    onClick={handleAdd}
                    className="text-xs text-emerald-600 font-medium px-1"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add new mode
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status?.toLowerCase()] ?? STATUS_STYLES.unpaid;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tracking-tight ${accent ?? "text-slate-800"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Void Confirm Modal ─────────────────────────────────────────────────────
function VoidModal({ bill, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10">
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          Void this bill?
        </h3>
        <p className="text-sm text-slate-500 mb-1">
          <span className="font-mono font-medium text-slate-700">
            {bill.bill_number}
          </span>{" "}
          will be marked as void.
        </p>
        <p className="text-xs text-slate-400 mb-5">This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Void Bill
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Partial Payment Modal ──────────────────────────────────────────────────
function PartialModal({ bill, modes, onAddMode, onConfirm, onCancel }) {
  const [paidAmount, setPaidAmount] = useState(
    bill.paid_amount ? String(bill.paid_amount) : "",
  );
  const [paymentMode, setPaymentMode] = useState(
    bill.payment_mode ?? modes[0] ?? "",
  );
  const [paidDate, setPaidDate] = useState(
    bill.paid_date ?? new Date().toISOString().slice(0, 10),
  );

  const total = Number(bill.total ?? 0);
  const paid = parseFloat(paidAmount) || 0;
  const balance = total - paid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Partial Payment
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {bill.bill_number} · Total {formatAmount(bill.total)}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Amount Paid
            </label>
            <input
              autoFocus
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {paid > 0 && (
            <div className="flex justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Balance remaining</span>
              <span
                className={`font-medium ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}
              >
                {formatAmount(balance)}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Received In
            </label>
            <div className="flex gap-2">
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  const label = window.prompt("New mode name:");
                  if (!label?.trim()) return;
                  const created = await onAddMode(label.trim());
                  if (created) setPaymentMode(created.label);
                }}
                className="px-3 py-2 text-xs rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 transition-colors whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({
                payment_status: "partial",
                paid_amount: paid,
                payment_mode: paymentMode,
                paid_date: paidDate,
              })
            }
            disabled={!paid || paid <= 0}
            className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Paid Modal ─────────────────────────────────────────────────────────────
function PaidModal({ bill, modes, onAddMode, onConfirm, onCancel }) {
  const [paymentMode, setPaymentMode] = useState(
    bill.payment_mode ?? modes[0] ?? "",
  );
  const [paidDate, setPaidDate] = useState(
    bill.paid_date ?? new Date().toISOString().slice(0, 10),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Mark as Paid
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {bill.bill_number} · {formatAmount(bill.total)}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Received In
            </label>
            <div className="flex gap-2">
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  const label = window.prompt("New mode name:");
                  if (!label?.trim()) return;
                  const created = await onAddMode(label.trim());
                  if (created) setPaymentMode(created.label);
                }}
                className="px-3 py-2 text-xs rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 transition-colors whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({
                payment_status: "paid",
                paid_amount: Number(bill.total),
                payment_mode: paymentMode,
                paid_date: paidDate,
              })
            }
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Dropdown ────────────────────────────────────────────────────────
function StatusDropdown({
  bill,
  onUpdated,
  onVoidRequest,
  onUnvoidRequest,
  onPartialRequest,
  onPaidRequest,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const current = bill.payment_status ?? "unpaid";

  async function handleUpdateStatus(payload) {
    setLoading(true);
    try {
      await updatePaymentStatus(bill.id, payload);
      onUpdated(bill.id, payload);
    } catch (err) {
      console.error("Status update failed", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(e, status) {
    e.stopPropagation();
    setOpen(false);
    if (status === "void") {
      onVoidRequest(bill);
      return;
    }
    if (status === "unvoid") {
      onUnvoidRequest(bill);
      return;
    }
    if (status === "partial") {
      onPartialRequest(bill);
      return;
    }
    if (status === "paid") {
      onPaidRequest(bill);
      return;
    }
    handleUpdateStatus({
      payment_status: "unpaid",
      paid_amount: 0,
      payment_mode: null,
      paid_date: null,
    });
  }

  // Void bills show a special dropdown with only Unvoid option
  if (bill.status === "void") {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 focus:outline-none"
        >
          <StatusBadge status="void" />
          <svg
            className="w-3 h-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute z-20 left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[130px]">
              <button
                onClick={(e) => handleSelect(e, "unvoid")}
                className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Unvoid Bill
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-1 focus:outline-none"
      >
        <StatusBadge status={current} />
        <svg
          className="w-3 h-3 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[130px]">
            {["unpaid", "partial", "paid"].map((s) => (
              <button
                key={s}
                onClick={(e) => handleSelect(e, s)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${s === current ? "font-semibold" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[s].dot}`}
                />
                {STATUS_STYLES[s].label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={(e) => handleSelect(e, "void")}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                Void Bill
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Payment Mode Cell ──────────────────────────────────────────────────────
function PaymentModeCell({ bill, modes, onAddMode, onUpdated }) {
  const [loading, setLoading] = useState(false);

  if (bill.status === "void" || bill.payment_status === "unpaid") {
    return <span className="text-slate-300 text-xs">—</span>;
  }

  async function handleSelect(mode) {
    if (mode === bill.payment_mode) return;
    setLoading(true);
    try {
      await updatePaymentStatus(bill.id, { payment_mode: mode });
      onUpdated(bill.id, { payment_mode: mode });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModeDropdown
      current={bill.payment_mode}
      modes={modes}
      onSelect={handleSelect}
      onAddMode={onAddMode}
    />
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function BillsDashboard() {
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [issuers, setIssuers] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [unvoidTarget, setUnvoidTarget] = useState(null);
  const [partialTarget, setPartialTarget] = useState(null);
  const [paidTarget, setPaidTarget] = useState(null);

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState("INVOICE");
  const [filterFirm, setFilterFirm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [invRes, quoRes, issuersRes, modesRes] = await Promise.all([
          getAllBills({ doc_type: "INVOICE" }),
          getAllBills({ doc_type: "QUOTATION" }),
          getAllIssuers(),
          getPaymentModes(),
        ]);
        setBills([...(invRes.data ?? []), ...(quoRes.data ?? [])]);
        setIssuers(issuersRes.data ?? []);
        setPaymentModes(modesRes.data ?? []);
      } catch (e) {
        setError("Failed to load bills.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUpdated = useCallback((billId, payload) => {
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, ...payload } : b)),
    );
  }, []);

  async function handleVoidConfirm() {
    if (!voidTarget) return;
    try {
      await voidBill(voidTarget.id);
      setBills((prev) =>
        prev.map((b) =>
          b.id === voidTarget.id ? { ...b, status: "void" } : b,
        ),
      );
    } catch (err) {
      console.error("Void failed", err);
    } finally {
      setVoidTarget(null);
    }
  }

  async function handleUnvoidConfirm() {
    if (!unvoidTarget) return;
    try {
      await unvoidBill(unvoidTarget.id);
      setBills((prev) =>
        prev.map((b) =>
          b.id === unvoidTarget.id ? { ...b, status: "active" } : b,
        ),
      );
    } catch (err) {
      console.error("Unvoid failed", err);
    } finally {
      setUnvoidTarget(null);
    }
  }

  async function handleStatusConfirm(payload) {
    const bill = partialTarget ?? paidTarget;
    if (!bill) return;
    try {
      await updatePaymentStatus(bill.id, payload);
      handleUpdated(bill.id, payload);
    } catch (err) {
      console.error("Status update failed", err);
    } finally {
      setPartialTarget(null);
      setPaidTarget(null);
    }
  }

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      if (b.doc_type !== docTypeFilter) return false;
      if (filterFirm && b.issuer_id !== Number(filterFirm)) return false;
      if (filterStatus && b.payment_status?.toLowerCase() !== filterStatus)
        return false;
      if (filterTemplate && (b.template ?? "with_logo") !== filterTemplate)
        return false;
      if (filterDateFrom || filterDateTo) {
        const d = b.bill_date?.slice(0, 10);
        if (!d) return false;
        if (filterDateFrom && d < filterDateFrom) return false;
        if (filterDateTo && d > filterDateTo) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const firmName =
          issuers.find((i) => i.id === b.issuer_id)?.firm_name ?? "";
        if (
          !b.bill_number?.toLowerCase().includes(q) &&
          !b.client_name?.toLowerCase().includes(q) &&
          !firmName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [
    bills,
    issuers,
    docTypeFilter,
    filterFirm,
    filterStatus,
    filterTemplate,
    filterDateFrom,
    filterDateTo,
    search,
  ]);

  const stats = useMemo(() => {
    const nonVoid = filtered.filter((b) => b.status !== "void");
    const total = nonVoid.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const paid = nonVoid
      .filter((b) => b.payment_status === "paid")
      .reduce((s, b) => s + Number(b.total ?? 0), 0);
    const pending = nonVoid
      .filter((b) => b.payment_status !== "paid")
      .reduce((s, b) => s + Number(b.total ?? 0), 0);
    return { count: filtered.length, total, paid, pending };
  }, [filtered]);

  async function handleAddMode(label) {
    try {
      const res = await createPaymentMode({ label });
      const newMode = res.data.label;
      setPaymentModes((prev) => [...prev, newMode]);
      return res.data;
    } catch (err) {
      console.error("Failed to add mode", err);
      return null;
    }
  }

  function exportToExcel() {
    const rows = filtered.map((bill) => ({
      "Bill No.": bill.bill_number ?? "",
      Type: bill.doc_type ?? "",
      Client: bill.client_name ?? "",
      Firm: issuers.find((i) => i.id === bill.issuer_id)?.firm_name ?? "",
      "Bill Date": bill.bill_date?.slice(0, 10) ?? "",
      "Paid Date": bill.paid_date?.slice(0, 10) ?? "",
      "Amount (₹)": Number(bill.total ?? 0),
      "Paid (₹)": Number(bill.paid_amount ?? 0),
      "Balance (₹)": Number(bill.total ?? 0) - Number(bill.paid_amount ?? 0),
      Status: bill.payment_status ?? "",
      "Payment Mode": bill.payment_mode ?? "",
      Template: bill.template ?? "",
      "Bill Status": bill.status ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 10 },
      { wch: 22 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `bills-export-${date}.xlsx`);
  }
  //   function exportToExcel() {
  //     import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs").then(
  //       (XLSX) => {
  //         const rows = filtered.map((bill) => ({
  //           "Bill No.": bill.bill_number ?? "",
  //           Type: bill.doc_type ?? "",
  //           Client: bill.client_name ?? "",
  //           Firm: issuers.find((i) => i.id === bill.issuer_id)?.firm_name ?? "",
  //           "Bill Date": bill.bill_date?.slice(0, 10) ?? "",
  //           "Paid Date": bill.paid_date?.slice(0, 10) ?? "",
  //           "Amount (₹)": Number(bill.total ?? 0),
  //           "Paid (₹)": Number(bill.paid_amount ?? 0),
  //           "Balance (₹)":
  //             Number(bill.total ?? 0) - Number(bill.paid_amount ?? 0),
  //           Status: bill.payment_status ?? "",
  //           "Payment Mode": bill.payment_mode ?? "",
  //           Template: bill.template ?? "",
  //           "Bill Status": bill.status ?? "",
  //         }));

  //         const ws = XLSX.utils.json_to_sheet(rows);
  //         // Column widths
  //         ws["!cols"] = [
  //           { wch: 16 },
  //           { wch: 10 },
  //           { wch: 22 },
  //           { wch: 22 },
  //           { wch: 12 },
  //           { wch: 12 },
  //           { wch: 14 },
  //           { wch: 12 },
  //           { wch: 14 },
  //           { wch: 10 },
  //           { wch: 14 },
  //           { wch: 14 },
  //           { wch: 12 },
  //         ];
  //         const wb = XLSX.utils.book_new();
  //         XLSX.utils.book_append_sheet(wb, ws, "Bills");
  //         const date = new Date().toISOString().slice(0, 10);
  //         XLSX.writeFile(wb, `bills-export-${date}.xlsx`);
  //       },
  //     );
  //   }

  function clearFilters() {
    setFilterFirm("");
    setFilterStatus("");
    setFilterTemplate("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearch("");
  }

  const hasFilters =
    filterFirm ||
    filterStatus ||
    filterTemplate ||
    filterDateFrom ||
    filterDateTo ||
    search;

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading bills…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow text-red-600 text-sm">
          {error}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-blue-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex justify-between">
          {/* Doc type toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 w-fit">
            {["INVOICE", "QUOTATION"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDocTypeFilter(type)}
                className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  docTypeFilter === type
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {type === "INVOICE" ? "Invoices" : "Quotations"}
              </button>
            ))}
          </div>

          {/* Excel export button */}
          <button
            onClick={exportToExcel}
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            Export Excel
          </button>
        </div>

        {/* Summary Cards */}
        <div className="flex items-center justify-between gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <SummaryCard
              label="Total Bills"
              value={stats.count}
              sub={hasFilters ? "filtered" : "all time"}
            />
            <SummaryCard
              label="Total Billed"
              value={formatAmount(stats.total)}
              sub={hasFilters ? "filtered" : "all time"}
            />
            <SummaryCard
              label="Amount Paid"
              value={formatAmount(stats.paid)}
              accent="text-emerald-600"
            />
            <SummaryCard
              label="Amount Pending"
              value={formatAmount(stats.pending)}
              accent="text-amber-600"
            />
          </div>
          {/* <button
            onClick={exportToExcel}
            className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            Export Excel
          </button> */}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Search
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Bill no., client, firm…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Firm
              </label>
              <select
                value={filterFirm}
                onChange={(e) => setFilterFirm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              >
                <option value="">All Firms</option>
                {issuers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.firm_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              >
                <option value="">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Template
              </label>
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              >
                <option value="">All Templates</option>
                <option value="with_logo">Logo + Firm</option>
                <option value="without_logo">Firm Only</option>
                <option value="plain">Plain</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                To
              </label>
              <input
                type="date"
                value={filterDateTo}
                min={filterDateFrom}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasFilters}
                className={`w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  hasFilters
                    ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer"
                    : "text-slate-300 border-slate-200 bg-white cursor-not-allowed"
                }`}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {hasFilters
                ? "No bills match your filters."
                : "No bills yet. Create your first bill."}
            </div>
          ) : (
            <div className="">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bill No.
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Firm
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bill Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Paid Date
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((bill) => {
                    const firmName =
                      issuers.find((iss) => iss.id === bill.issuer_id)
                        ?.firm_name ?? "—";
                    const isVoid = bill.status === "void";
                    return (
                      <tr
                        key={bill.id}
                        className={`transition-colors ${isVoid ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          <button
                            onClick={() =>
                              navigate(`/bills/${bill.id}/preview`)
                            }
                            className="font-mono font-medium text-slate-800 hover:text-blue-600 hover:underline transition-colors"
                          >
                            {bill.bill_number ?? "—"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[140px] truncate">
                          {bill.client_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">
                          {firmName}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(bill.bill_date)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(bill.paid_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                          {formatAmount(bill.total)}
                          {bill.payment_status === "partial" &&
                            bill.paid_amount > 0 && (
                              <div className="text-xs text-amber-500 font-normal">
                                Bal{" "}
                                {formatAmount(
                                  Number(bill.total) - Number(bill.paid_amount),
                                )}
                              </div>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentModeCell
                            bill={bill}
                            modes={paymentModes}
                            onAddMode={handleAddMode}
                            onUpdated={handleUpdated}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusDropdown
                            bill={bill}
                            onUpdated={handleUpdated}
                            onVoidRequest={setVoidTarget}
                            onUnvoidRequest={setUnvoidTarget}
                            onPartialRequest={setPartialTarget}
                            onPaidRequest={setPaidTarget}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {voidTarget && (
        <VoidModal
          bill={voidTarget}
          onConfirm={handleVoidConfirm}
          onCancel={() => setVoidTarget(null)}
        />
      )}
      {unvoidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setUnvoidTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm z-10">
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Unvoid this bill?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-mono font-medium text-slate-700">
                {unvoidTarget.bill_number}
              </span>{" "}
              will be restored to active.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUnvoidTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnvoidConfirm}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Unvoid Bill
              </button>
            </div>
          </div>
        </div>
      )}
      {partialTarget && (
        <PartialModal
          bill={partialTarget}
          modes={paymentModes}
          onAddMode={handleAddMode}
          onConfirm={handleStatusConfirm}
          onCancel={() => setPartialTarget(null)}
        />
      )}
      {paidTarget && (
        <PaidModal
          bill={paidTarget}
          modes={paymentModes}
          onAddMode={handleAddMode}
          onConfirm={handleStatusConfirm}
          onCancel={() => setPaidTarget(null)}
        />
      )}
    </div>
  );
}
