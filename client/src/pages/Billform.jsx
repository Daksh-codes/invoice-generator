// src/pages/BillForm.jsx
// Route: /bills/new
// Features:
//   - Invoice or Quotation toggle
//   - Firm dropdown (required)
//   - Client dropdown + inline "create new" if typed name doesn't exist
//   - Line items (description + amount, CA style)
//   - Single GST % on whole bill, toggle IGST vs CGST+SGST
//   - Discount toggle (% or flat)
//   - Auto-calculates subtotal, GST, total, total_in_words
//   - Submits as draft or active

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllIssuers, getAllClients, createClient,
  getNextNumber, createInvoice, createQuotation, getDescriptions,
} from "../api";

// ── Number to words (Indian system) ───────────────────────────────────────
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWords(n) {
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
  return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
}

function toWords(amount) {
  if (!amount || isNaN(amount)) return "";
  const n = Math.round(Number(amount));
  const paise = Math.round((Number(amount) - n) * 100);
  let result = numToWords(n) + " Rupees";
  if (paise > 0) result += " and " + numToWords(paise) + " Paise";
  return result + " Only";
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n) return "0.00";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Combobox: select existing or type new ─────────────────────────────────
function Combobox({ options, value, onChange, onCreateNew, placeholder, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef();

  const selected = options.find(o => o.value === value);
  const displayQuery = focused ? query : (selected?.label ?? value ?? "");

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const exactMatch = options.some(o => o.label.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    function handler(e) {
      if (!ref.current?.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        value={displayQuery}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(null); }}
        onFocus={() => { setFocused(true); setQuery(selected?.label ?? ""); setOpen(true); }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition ${
          error ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-slate-300"
        }`}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !query.trim() && (
            <div className="px-3 py-2 text-xs text-slate-400">No options</div>
          )}
          {filtered.map(o => (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setQuery(""); setOpen(false); setFocused(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition ${
                o.value === value ? "font-medium text-slate-800" : "text-slate-600"
              }`}
            >
              {o.label}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={() => { onCreateNew(query.trim()); setQuery(""); setOpen(false); setFocused(false); }}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-slate-100 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({ label, required, error, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition ${
        error ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-slate-300"
      }`}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-slate-800" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="pb-2 border-b border-slate-200 mb-4">
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────
const EMPTY_ITEM = { description: "", amount: "" };

export default function BillForm() {
  const navigate = useNavigate();

  // Meta
  const [docType, setDocType] = useState("INVOICE");
  const [template, setTemplate] = useState("with_logo");
  const [issuerId, setIssuerId] = useState("");
  const [clientId, setClientId] = useState("");
  const [billDate, setBillDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [nextNumber, setNextNumber] = useState("");

  // Items
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // GST
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercent, setGstPercent] = useState("18");
  const [isIgst, setIsIgst] = useState(false);

  // Discount
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState("percent"); // "percent" | "flat"
  const [discountValue, setDiscountValue] = useState("");

  // Data
  const [issuers, setIssuers] = useState([]);
  const [clients, setClients] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Load issuers + clients + descriptions
  useEffect(() => {
    Promise.all([getAllIssuers(), getAllClients(), getDescriptions()])
      .then(([iRes, cRes, dRes]) => {
        setIssuers(iRes.data ?? []);
        setClients(cRes.data ?? []);
        setDescriptions(dRes.data ?? []);
      })
      .finally(() => setDataLoading(false));
  }, []);

  // Fetch next bill number when issuer or docType changes
  useEffect(() => {
    if (!issuerId) { setNextNumber(""); return; }
    getNextNumber(issuerId, docType)
      .then(res => setNextNumber(res.data.nextNumber ?? ""))
      .catch(() => setNextNumber(""));
  }, [issuerId, docType]);

  // Auto-set GST enabled based on issuer's is_gst_enabled
  useEffect(() => {
    if (!issuerId) return;
    const issuer = issuers.find(i => i.id === Number(issuerId));
    if (issuer) setGstEnabled(issuer.is_gst_enabled === 1);
  }, [issuerId, issuers]);

  // ── Calculations ──────────────────────────────────────────────────────
  const subtotal = items.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);

  const discountAmt = (() => {
    if (!discountEnabled || !discountValue) return 0;
    const v = parseFloat(discountValue) || 0;
    if (discountType === "percent") return (subtotal * v) / 100;
    return v;
  })();

  const taxableAmount = subtotal - discountAmt;

  const gstRate = parseFloat(gstPercent) || 0;
  const taxTotal = gstEnabled ? (taxableAmount * gstRate) / 100 : 0;
  const cgst = isIgst ? 0 : taxTotal / 2;
  const sgst = isIgst ? 0 : taxTotal / 2;
  const igst = isIgst ? taxTotal : 0;

  const total = taxableAmount + taxTotal;
  const totalInWords = toWords(total);

  // ── Combobox options ──────────────────────────────────────────────────
  const issuerOptions = issuers.map(i => ({ value: String(i.id), label: i.firm_name }));
  const clientOptions = clients.map(c => ({ value: String(c.id), label: c.name }));

  // Create client inline
  async function handleCreateClient(name) {
    try {
      const res = await createClient({ name });
      const newClient = { id: res.data.id, name };
      setClients(c => [...c, newClient]);
      setClientId(String(res.data.id));
    } catch (err) {
      setSubmitError("Failed to create client: " + (err.response?.data?.message ?? err.message));
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────
  function addItem() {
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  }

  function updateItem(index, key, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
    setErrors(e => ({ ...e, [`item_${index}_${key}`]: null }));
  }

  function removeItem(index) {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  // ── Validation ────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!issuerId) errs.issuerId = "Select a firm";
    if (!clientId) errs.clientId = "Select or create a client";
    if (!billDate) errs.billDate = "Bill date is required";

    items.forEach((item, i) => {
      if (!item.description.trim()) errs[`item_${i}_description`] = "Required";
      if (!item.amount || isNaN(item.amount) || Number(item.amount) < 0)
        errs[`item_${i}_amount`] = "Valid amount required";
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(status) {
    if (!validate()) return;
    setLoading(true);
    setSubmitError(null);

    const payload = {
      issuer_id: Number(issuerId),
      client_id: Number(clientId),
      bill_date: billDate,
      due_date: dueDate || null,
      payment_terms: paymentTerms || null,
      notes: notes || null,
      template,
      subtotal,
      discount: discountAmt,
      tax_total: taxTotal,
      cgst,
      sgst,
      igst,
      is_igst: isIgst ? 1 : 0,
      total,
      total_in_words: totalInWords,
      status,
      items: items.map(item => ({
        description: item.description.trim(),
        quantity: 1,
        rate: parseFloat(item.amount) || 0,
        amount: parseFloat(item.amount) || 0,
      })),
    };

    try {
      const fn = docType === "INVOICE" ? createInvoice : createQuotation;
      const res = await fn(payload);
      navigate(`/bills/${res.data.bill_id}/preview`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to create bill.");
    } finally {
      setLoading(false);
    }
  }

  if (dataLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Doc type toggle */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm p-1.5">
            {["INVOICE", "QUOTATION"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setDocType(type)}
                className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  docType === type ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {type === "INVOICE" ? "Invoice" : "Quotation"}
              </button>
            ))}
          </div>

          {/* Template selector */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm p-1.5">
            {[
              { value: "with_logo", label: "Logo + Firm" },
              { value: "without_logo", label: "Firm Only" },
              { value: "plain", label: "Plain" },
            ].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  template === t.value ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bill details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <SectionHeader title="Bill Details" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Firm */}
            <Field label="Firm" required error={errors.issuerId}>
              <Combobox
                options={issuerOptions}
                value={issuerId}
                onChange={v => { setIssuerId(v ?? ""); setErrors(e => ({ ...e, issuerId: null })); }}
                onCreateNew={() => {}}
                placeholder="Select firm…"
                error={errors.issuerId}
              />
            </Field>

            {/* Client */}
            <Field label="Client" required error={errors.clientId}>
              <Combobox
                options={clientOptions}
                value={clientId}
                onChange={v => { setClientId(v ?? ""); setErrors(e => ({ ...e, clientId: null })); }}
                onCreateNew={handleCreateClient}
                placeholder="Select or type to create…"
                error={errors.clientId}
              />
              {clientId && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {clients.find(c => String(c.id) === clientId)?.name}
                </p>
              )}
            </Field>

            {/* Bill number preview */}
            <Field label={docType === "INVOICE" ? "Invoice No." : "Quotation No."}>
              <input
                value={nextNumber || "— select a firm —"}
                disabled
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-400 font-mono"
              />
            </Field>

            {/* Bill date */}
            <Field label="Bill Date" required error={errors.billDate}>
              <Input
                type="date"
                value={billDate}
                onChange={e => { setBillDate(e.target.value); setErrors(er => ({ ...er, billDate: null })); }}
                error={errors.billDate}
              />
            </Field>

            {/* Due date */}
            <Field label="Due Date">
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={billDate}
              />
            </Field>

            {/* Payment terms */}
            <Field label="Payment Terms">
              <Input
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
              />
            </Field>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader title="Line Items" />

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_36px] gap-2 px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Amount (₹)</span>
              <span />
            </div>

            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px_36px] gap-2 items-start">
                <div>
                  <Combobox
                    options={descriptions.map(d => ({ value: d, label: d }))}
                    value={item.description}
                    onChange={v => updateItem(i, "description", v ?? "")}
                    onCreateNew={v => updateItem(i, "description", v)}
                    placeholder="Service description…"
                    error={errors[`item_${i}_description`]}
                  />
                  {errors[`item_${i}_description`] && (
                    <p className="text-xs text-red-500 mt-0.5">{errors[`item_${i}_description`]}</p>
                  )}
                </div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={e => updateItem(i, "amount", e.target.value)}
                    placeholder="0.00"
                    error={errors[`item_${i}_amount`]}
                  />
                  {errors[`item_${i}_amount`] && (
                    <p className="text-xs text-red-500 mt-0.5">{errors[`item_${i}_amount`]}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-400 transition disabled:opacity-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add item
            </button>
          </div>
        </div>

        {/* Totals + GST + Discount */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <SectionHeader title="Totals" />

          <div className="space-y-3">
            {/* Discount toggle */}
            <Toggle
              checked={discountEnabled}
              onChange={setDiscountEnabled}
              label="Apply Discount"
            />

            {discountEnabled && (
              <div className="flex items-center gap-2 ml-1">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  {["percent", "flat"].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDiscountType(t)}
                      className={`px-3 py-1.5 transition-colors ${
                        discountType === t ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {t === "percent" ? "%" : "₹ Flat"}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "e.g. 5" : "e.g. 500"}
                  className="w-36"
                />
              </div>
            )}

            {/* GST toggle */}
            <Toggle
              checked={gstEnabled}
              onChange={setGstEnabled}
              label="Apply GST"
            />

            {gstEnabled && (
              <div className="ml-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={gstPercent}
                    onChange={e => setGstPercent(e.target.value)}
                    placeholder="18"
                    className="w-28"
                  />
                  <span className="text-sm text-slate-500">%</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs ml-2">
                    {[false, true].map(igst => (
                      <button
                        key={String(igst)}
                        type="button"
                        onClick={() => setIsIgst(igst)}
                        className={`px-3 py-1.5 transition-colors ${
                          isIgst === igst ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {igst ? "IGST" : "CGST + SGST"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="border-t border-slate-100 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">₹{fmt(subtotal)}</span>
            </div>
            {discountEnabled && discountAmt > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Discount {discountType === "percent" ? `(${discountValue}%)` : ""}</span>
                <span className="font-mono">− ₹{fmt(discountAmt)}</span>
              </div>
            )}
            {gstEnabled && taxTotal > 0 && (
              isIgst ? (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>IGST ({gstPercent}%)</span>
                  <span className="font-mono">₹{fmt(igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>CGST ({parseFloat(gstPercent) / 2}%)</span>
                    <span className="font-mono">₹{fmt(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>SGST ({parseFloat(gstPercent) / 2}%)</span>
                    <span className="font-mono">₹{fmt(sgst)}</span>
                  </div>
                </>
              )
            )}
            <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-2 mt-1">
              <span>Total</span>
              <span className="font-mono">₹{fmt(total)}</span>
            </div>
            {totalInWords && (
              <p className="text-xs text-slate-400 italic">{totalInWords}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader title="Notes" />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes for this bill…"
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit("draft")}
            className="px-5 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit("active")}
            className="px-6 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Creating…" : `Create ${docType === "INVOICE" ? "Invoice" : "Quotation"}`}
          </button>
        </div>
      </div>
    </div>
  );
}