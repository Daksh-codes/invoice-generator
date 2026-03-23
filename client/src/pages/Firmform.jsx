// src/pages/FirmForm.jsx
// Routes:
//   Create: /firms/new
//   Edit:   /firms/:id/edit
//
// mode is inferred from the route — if :id param exists, it's edit mode.
// On create: calls createIssuer (multipart) then createBank (multipart) if bank fields filled.
// On edit:   calls updateIssuer, uploadLogo if new logo, updateBank/createBank for bank.

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createIssuer,
  updateIssuer,
  getIssuer,
  uploadLogo,
  createBank,
  updateBank,
  getBankByIssuer,
  uploadQr,
  imageUrl,
} from "../api";

// ── Helpers ────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
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
        error
          ? "border-red-300 focus:ring-red-200"
          : "border-slate-200 focus:ring-slate-300"
      } disabled:bg-slate-50 disabled:text-slate-400`}
    />
  );
}

function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition ${
        error
          ? "border-red-300 focus:ring-red-200"
          : "border-slate-200 focus:ring-slate-300"
      }`}
    >
      {children}
    </select>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="pb-3 border-b border-slate-200 mb-4">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ImageUploadBox({ label, preview, onChange, onClear }) {
  const ref = useRef();
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <div
        onClick={() => ref.current.click()}
        className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-slate-400 transition bg-slate-50 overflow-hidden"
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-contain p-1"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[10px]">Upload</span>
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────
export default function FirmForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Firm fields
  const [firm, setFirm] = useState({
    firm_name: "",
    sub_heading: "",
    address: "",
    phone: "",
    email: "",
    pan: "",
    gstin: "",
    is_gst_enabled: false,
    invoice_prefix: "INV-",
    quotation_prefix: "QT-",
  });

  // Logo state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [existingLogo, setExistingLogo] = useState(null);

  // Bank fields
  const [bank, setBank] = useState({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    account_type: "Current",
    ifsc_code: "",
    branch: "",
  });
  const [existingBankId, setExistingBankId] = useState(null);

  // QR state
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [existingQr, setExistingQr] = useState(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [submitError, setSubmitError] = useState(null);

  // Load existing data in edit mode
  useEffect(() => {
    if (!isEdit) return;
    async function load() {
      try {
        const issuerRes = await getIssuer(id);
        const d = issuerRes.data;
        setFirm({
          firm_name: d.firm_name ?? "",
          sub_heading: d.sub_heading ?? "",
          address: d.address ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          pan: d.pan ?? "",
          gstin: d.gstin ?? "",
          is_gst_enabled: d.is_gst_enabled === 1,
          invoice_prefix: d.invoice_prefix ?? "INV-",
          quotation_prefix: d.quotation_prefix ?? "QT-",
        });
        if (d.logo) {
          setExistingLogo(d.logo);
          setLogoPreview(imageUrl(d.logo));
        }

        try {
          const bankRes = await getBankByIssuer(id);
          const b = bankRes.data;
          setExistingBankId(b.id);
          setBank({
            account_holder_name: b.account_holder_name ?? "",
            bank_name: b.bank_name ?? "",
            account_number: b.account_number ?? "",
            account_type: b.account_type ?? "Current",
            ifsc_code: b.ifsc_code ?? "",
            branch: b.branch ?? "",
          });
          if (b.upi_qr) {
            setExistingQr(b.upi_qr);
            setQrPreview(imageUrl(b.upi_qr));
          }
        } catch {
          // No bank yet — fine
        }
      } catch {
        setSubmitError("Failed to load firm details.");
      } finally {
        setFetchLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  function setFirmField(key, value) {
    setFirm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function setBankField(key, value) {
    setBank((b) => ({ ...b, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleQrChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
  }

  function validate() {
    const errs = {};
    if (!firm.firm_name.trim()) errs.firm_name = "Firm name is required";
    if (!firm.invoice_prefix.trim()) errs.invoice_prefix = "Required";
    if (!firm.quotation_prefix.trim()) errs.quotation_prefix = "Required";
    if (
      firm.gstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        firm.gstin,
      )
    )
      errs.gstin = "Invalid GSTIN format";
    if (firm.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(firm.pan))
      errs.pan = "Invalid PAN format";
    if (firm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firm.email))
      errs.email = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const hasBankData = Object.values(bank).some(
    (v) => v.trim?.() !== "" && v !== "Current",
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitError(null);

    try {
      let issuerId = id;

      if (isEdit) {
        // Update firm fields
        await updateIssuer(id, {
          ...firm,
          is_gst_enabled: firm.is_gst_enabled ? 1 : 0,
        });
        // Upload new logo if changed
        if (logoFile) {
          const fd = new FormData();
          fd.append("firm_logo", logoFile);
          await uploadLogo(id, fd);
        }
      } else {
        // Create firm with logo in one multipart call
        const fd = new FormData();
        Object.entries(firm).forEach(([k, v]) => {
          if (k === "is_gst_enabled") fd.append(k, v ? "1" : "0");
          else fd.append(k, v);
        });
        if (logoFile) fd.append("firm_logo", logoFile);
        const res = await createIssuer(fd);
        issuerId = res.data.id;
      }

      // Handle bank
      if (hasBankData) {
        if (isEdit && existingBankId) {
          // Update existing bank
          await updateBank(existingBankId, bank);
          // Upload new QR if changed
          if (qrFile) {
            const fd = new FormData();
            fd.append("bank_qr", qrFile);
            await uploadQr(existingBankId, fd);
          }
        } else {
          // Create new bank with QR in one multipart call
          const fd = new FormData();
          fd.append("issuer_id", issuerId);
          Object.entries(bank).forEach(([k, v]) => fd.append(k, v));
          if (qrFile) fd.append("bank_qr", qrFile);
          await createBank(fd);
        }
      }

      navigate("/firms");
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800">
            {isEdit ? "Edit Firm" : "New Firm"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEdit
              ? "Update firm and bank details"
              : "Set up a new firm and bank account"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto px-6 py-8 space-y-8"
      >
        {/* ── Firm Details ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader
            title="Firm Details"
            subtitle="This information appears on all invoices and quotations"
          />

          {/* Logo upload */}
          <div className="mb-6 flex items-start gap-6">
            <ImageUploadBox
              label="Firm Logo"
              preview={logoPreview}
              onChange={handleLogoChange}
              onClear={() => {
                setLogoFile(null);
                setLogoPreview(null);
                setExistingLogo(null);
              }}
            />
            <div className="flex-1 grid grid-cols-1 gap-4">
              <Field label="Firm Name" required error={errors.firm_name}>
                <Input
                  value={firm.firm_name}
                  onChange={(e) => setFirmField("firm_name", e.target.value)}
                  placeholder="e.g. Sharma & Associates"
                  error={errors.firm_name}
                />
              </Field>
              <Field label="Sub-heading / Tagline" error={errors.sub_heading}>
                <Input
                  value={firm.sub_heading}
                  onChange={(e) => setFirmField("sub_heading", e.target.value)}
                  placeholder="e.g. Chartered Accountants"
                  error={errors.sub_heading}
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Address" error={errors.address}>
              <Input
                value={firm.address}
                onChange={(e) => setFirmField("address", e.target.value)}
                placeholder="Full address"
                error={errors.address}
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input
                value={firm.phone}
                onChange={(e) => setFirmField("phone", e.target.value)}
                placeholder="e.g. 9876543210"
                error={errors.phone}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={firm.email}
                onChange={(e) => setFirmField("email", e.target.value)}
                placeholder="firm@example.com"
                error={errors.email}
              />
            </Field>
            <Field label="PAN" error={errors.pan}>
              <Input
                value={firm.pan}
                onChange={(e) =>
                  setFirmField("pan", e.target.value.toUpperCase())
                }
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                error={errors.pan}
              />
            </Field>
          </div>

          {/* GST toggle + GSTIN */}
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setFirmField("is_gst_enabled", !firm.is_gst_enabled)
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  firm.is_gst_enabled ? "bg-slate-800" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    firm.is_gst_enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-700">GST Registered</span>
            </div>

            {firm.is_gst_enabled && (
              <Field label="GSTIN" error={errors.gstin}>
                <Input
                  value={firm.gstin}
                  onChange={(e) =>
                    setFirmField("gstin", e.target.value.toUpperCase())
                  }
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  maxLength={15}
                  error={errors.gstin}
                />
              </Field>
            )}
          </div>
        </div>

        {/* ── Invoice Prefixes ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Invoice Numbering
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit
                  ? "Prefixes are locked after bills are created"
                  : "Set the starting prefix for invoices and quotations"}
              </p>
            </div>
            {isEdit && (
              <button
                type="button"
                onClick={() => navigate(`/firms/${id}/prefix-history`)}
                className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Prefix History →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Invoice Prefix"
              required
              error={errors.invoice_prefix}
            >
              <Input
                value={firm.invoice_prefix}
                onChange={(e) => setFirmField("invoice_prefix", e.target.value)}
                placeholder="INV-"
                error={errors.invoice_prefix}
                disabled={isEdit}
              />
            </Field>
            <Field
              label="Quotation Prefix"
              required
              error={errors.quotation_prefix}
            >
              <Input
                value={firm.quotation_prefix}
                onChange={(e) =>
                  setFirmField("quotation_prefix", e.target.value)
                }
                placeholder="QT-"
                error={errors.quotation_prefix}
                disabled={isEdit}
              />
            </Field>
          </div>
        </div>

        {/* ── Bank Details ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionHeader
            title="Bank Details"
            subtitle="Shown at the bottom of invoices for payment. Optional but recommended."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Account Holder Name"
              error={errors.account_holder_name}
            >
              <Input
                value={bank.account_holder_name}
                onChange={(e) =>
                  setBankField("account_holder_name", e.target.value)
                }
                placeholder="Name on bank account"
                error={errors.account_holder_name}
              />
            </Field>
            <Field label="Bank Name" error={errors.bank_name}>
              <Input
                value={bank.bank_name}
                onChange={(e) => setBankField("bank_name", e.target.value)}
                placeholder="e.g. HDFC Bank"
                error={errors.bank_name}
              />
            </Field>
            <Field label="Account Number" error={errors.account_number}>
              <Input
                value={bank.account_number}
                onChange={(e) => setBankField("account_number", e.target.value)}
                placeholder="Account number"
                error={errors.account_number}
              />
            </Field>
            <Field label="Account Type" error={errors.account_type}>
              <Select
                value={bank.account_type}
                onChange={(e) => setBankField("account_type", e.target.value)}
                error={errors.account_type}
              >
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
              </Select>
            </Field>
            <Field label="IFSC Code" error={errors.ifsc_code}>
              <Input
                value={bank.ifsc_code}
                onChange={(e) =>
                  setBankField("ifsc_code", e.target.value.toUpperCase())
                }
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                error={errors.ifsc_code}
              />
            </Field>
            <Field label="Branch" error={errors.branch}>
              <Input
                value={bank.branch}
                onChange={(e) => setBankField("branch", e.target.value)}
                placeholder="e.g. Mumbai Main"
                error={errors.branch}
              />
            </Field>
          </div>

          {/* QR Upload */}
          <div className="mt-6">
            <ImageUploadBox
              label="UPI QR Code (optional)"
              preview={qrPreview}
              onChange={handleQrChange}
              onClear={() => {
                setQrFile(null);
                setQrPreview(null);
                setExistingQr(null);
              }}
            />
            <p className="text-xs text-slate-400 mt-1">
              Shown on invoice for scan-to-pay
            </p>
          </div>
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
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Firm"}
          </button>
        </div>
      </form>
    </div>
  );
}
