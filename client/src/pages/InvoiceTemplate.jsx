// src/pages/InvoiceTemplate.jsx
// template prop: "with_logo" | "without_logo" | "plain"
// Footer (bank + signature) is always pinned to bottom of A4 page.
// QR appears bottom-right next to bank table if upi_qr is present (all templates).

import { imageUrl } from "../api";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(val) {
  if (val == null) return "0";
  return Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Shared: Items table body ───────────────────────────────────────────────
function ItemsTable({ data, plain = false }) {
  const {
    items = [], subtotal, discount, total, total_in_words,
    tax_total, cgst, sgst, igst, is_igst, is_gst_enabled,
  } = data;

  const showDiscount = discount > 0;
  const showTax = is_gst_enabled === 1 && tax_total > 0;
  const showSubtotal = showDiscount || showTax;

  return (
    <table className="w-full border-collapse mt-2">
      <thead>
        {plain ? (
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-2 text-left text-sm font-semibold text-slate-700">Description</th>
            <th className="border border-slate-300 p-2 text-right text-sm font-semibold text-slate-700 w-[25mm]">Qty</th>
            <th className="border border-slate-300 p-2 text-right text-sm font-semibold text-slate-700 w-[30mm]">Rate (₹)</th>
            <th className="border border-slate-300 p-2 text-right text-sm font-semibold text-slate-700 w-[35mm]">Amount (₹)</th>
          </tr>
        ) : (
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-700 p-2 text-left text-sm font-medium">
              Professional Fees for the services rendered as below:
            </th>
            <th className="border border-slate-700 p-2 text-right text-sm font-medium w-[35mm]">Amount (₹)</th>
          </tr>
        )}
      </thead>
      <tbody>
        {items.map((item, i) => (
          plain ? (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="border border-slate-200 p-2 text-sm text-slate-700">{item.description}</td>
              <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{item.quantity}</td>
              <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(item.rate)}</td>
              <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(item.amount)}</td>
            </tr>
          ) : (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="border border-slate-200 p-2 text-sm text-slate-700">{item.description}</td>
              <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(item.amount)}</td>
            </tr>
          )
        ))}

        {showSubtotal && (
          <tr>
            <td colSpan={plain ? 3 : 1} className="border border-slate-200 p-2 text-right text-sm font-medium text-slate-600">Subtotal</td>
            <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(subtotal)}</td>
          </tr>
        )}
        {showDiscount && (
          <tr>
            <td colSpan={plain ? 3 : 1} className="border border-slate-200 p-2 text-right text-sm text-red-600">Discount</td>
            <td className="border border-slate-200 p-2 text-right text-sm text-red-600">− {formatAmount(discount)}</td>
          </tr>
        )}
        {showTax && is_igst === 1 && (
          <tr>
            <td colSpan={plain ? 3 : 1} className="border border-slate-200 p-2 text-right text-sm text-slate-600">IGST</td>
            <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(igst)}</td>
          </tr>
        )}
        {showTax && is_igst === 0 && (
          <>
            <tr>
              <td colSpan={plain ? 3 : 1} className="border border-slate-200 p-2 text-right text-sm text-slate-600">CGST</td>
              <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(cgst)}</td>
            </tr>
            <tr>
              <td colSpan={plain ? 3 : 1} className="border border-slate-200 p-2 text-right text-sm text-slate-600">SGST</td>
              <td className="border border-slate-200 p-2 text-right text-sm text-slate-700">{formatAmount(sgst)}</td>
            </tr>
          </>
        )}
        <tr className="bg-slate-800 text-white">
          <td colSpan={plain ? 3 : 1} className="border border-slate-700 p-2 text-right font-bold">Total</td>
          <td className="border border-slate-700 p-2 text-right font-bold">{formatAmount(total)}</td>
        </tr>
        <tr>
          <td colSpan={plain ? 4 : 2} className="border border-slate-200 p-2 text-sm">
            <span className="font-semibold">In Words: </span>{total_in_words}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
// ── Shared: Pinned footer — bank table left, QR middle, signature right ───
function PinnedFooter({ data, firmName }) {
  const {
    account_holder_name, bank_name, account_number,
    account_type, ifsc_code, branch, upi_qr,
  } = data;

  const hasBank = !!account_holder_name;
  const hasQR = !!upi_qr;

  return (
    <div className="px-10 pb-8 print:px-6 print:pb-6 print-footer">
      <div className="border-t border-slate-300 pt-4 flex justify-between items-end">

        {/* Bank details — left */}
        {hasBank ? (
          <table className="border border-collapse text-[11px] w-[90mm]">
            <tbody>
              <tr>
                <td colSpan={2} className="border border-slate-200 p-1 text-center font-bold bg-slate-100 text-slate-700">
                  Bank Details (NEFT / RTGS)
                </td>
              </tr>
              {[
                ["Name", account_holder_name],
                ["Bank", bank_name],
                ["IFSC", ifsc_code],
                ["Branch", branch],
                ["Type", account_type],
                ["A/c No.", account_number],
              ].map(([label, value]) =>
                value ? (
                  <tr key={label}>
                    <td className="border border-slate-200 px-2 py-0.5 font-medium text-slate-500 w-16">{label}</td>
                    <td className="border border-slate-200 px-2 py-0.5 text-slate-700">{value}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        ) : (
          <div />
        )}

        {/* QR — center (only if uploaded) */}
        {hasQR && (
          <div className="flex flex-col items-center">
            <img
              src={imageUrl(upi_qr)}
              alt="UPI QR"
              className="w-[28mm] h-[28mm] object-contain border border-slate-200 p-1.5"
            />
            <p className="text-[10px] mt-1 text-slate-400">Scan to Pay</p>
          </div>
        )}

        {/* Signature — right */}
        <div className="flex flex-col items-center">
          {firmName && (
            <p className="text-xs text-slate-600 mb-2">For {firmName}</p>
          )}
          <div className="mt-16 border-t border-slate-400 w-36 text-center">
            <p className="text-[10px] text-slate-400 pt-1">Authorised Signatory</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared: Bill meta (Billed To + Invoice No.) ────────────────────────────
function BillMeta({ data }) {
  const { bill_number, bill_date, doc_type, client_name, client_gstin, is_gst_enabled, payment_terms, due_date } = data;
  return (
    <div className="flex justify-between py-4 border-b border-slate-100">
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
        <p className="font-bold text-base text-slate-800">{client_name}</p>
        {client_gstin && is_gst_enabled === 1 && (
          <p className="text-xs text-slate-500 mt-0.5">GSTIN: {client_gstin}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
          {doc_type === "QUOTATION" ? "Quotation No." : "Invoice No."}
        </p>
        <p className="font-bold text-slate-800">{bill_number}</p>
        <p className="text-sm text-slate-500 mt-0.5">{formatDate(bill_date)}</p>
        {payment_terms && <p className="text-[11px] text-slate-400 mt-0.5">Terms: {payment_terms}</p>}
        {due_date && <p className="text-[11px] text-slate-400">Due: {formatDate(due_date)}</p>}
      </div>
    </div>
  );
}

// ── Template 1: with_logo ─────────────────────────────────────────────────
function WithLogoTemplate({ data }) {
  const { firm_name, sub_heading, logo, phone, email, gstin, is_gst_enabled, pan, firm_address, doc_type, notes } = data;

  return (
    <div className="w-[210mm] bg-white font-sans print:w-full">
      <div className="px-10 pt-8 print:px-6 print:pt-6">
        {/* Header */}
        <div className="flex items-center gap-5 pb-4 border-b-2 border-slate-800">
          {logo && (
            <img src={imageUrl(logo)} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">{firm_name}</h1>
            {sub_heading && <p className="text-sm font-medium text-slate-500 mt-0.5">{sub_heading}</p>}
            {firm_address && <p className="text-xs text-slate-400 mt-0.5">{firm_address}</p>}
            <div className="flex gap-4 text-xs text-slate-400 mt-0.5 flex-wrap">
              {phone && <span>📞 {phone}</span>}
              {email && <span>✉ {email}</span>}
            </div>
            <div className="flex gap-4 text-xs text-slate-400 mt-0.5 flex-wrap">
              {is_gst_enabled === 1 && gstin && <span>GSTIN: {gstin}</span>}
              {pan && <span>PAN: {pan}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold tracking-widest text-slate-700 uppercase">
              {doc_type === "QUOTATION" ? "Quotation" : "Invoice"}
            </p>
          </div>
        </div>

        <BillMeta data={data} />
        <ItemsTable data={data} plain={false} />

        {data.notes && (
          <p className="mt-3 text-xs text-slate-500">
            <span className="font-semibold">Notes: </span>{data.notes}
          </p>
        )}
      </div>

      
      <PinnedFooter data={data} firmName={firm_name} />
    </div>
  );
}

// ── Template 2: without_logo ──────────────────────────────────────────────
function WithoutLogoTemplate({ data }) {
  const { firm_name, sub_heading, phone, email, gstin, is_gst_enabled, pan, firm_address, doc_type } = data;

  return (
    <div className="w-[210mm] bg-white font-sans print:w-full">
      <div className="px-10 pt-8 print:px-6 print:pt-6">
        {/* Header — no logo */}
        <div className="flex items-start justify-between pb-4 border-b-2 border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{firm_name}</h1>
            {sub_heading && <p className="text-sm font-medium text-slate-500 mt-0.5">{sub_heading}</p>}
            {firm_address && <p className="text-xs text-slate-400 mt-0.5">{firm_address}</p>}
            <div className="flex gap-4 text-xs text-slate-400 mt-0.5 flex-wrap">
              {phone && <span>📞 {phone}</span>}
              {email && <span>✉ {email}</span>}
            </div>
            <div className="flex gap-4 text-xs text-slate-400 mt-0.5 flex-wrap">
              {is_gst_enabled === 1 && gstin && <span>GSTIN: {gstin}</span>}
              {pan && <span>PAN: {pan}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold tracking-widest text-slate-700 uppercase">
              {doc_type === "QUOTATION" ? "Quotation" : "Invoice"}
            </p>
          </div>
        </div>

        <BillMeta data={data} />
        <ItemsTable data={data} plain={false} />

        {data.notes && (
          <p className="mt-3 text-xs text-slate-500">
            <span className="font-semibold">Notes: </span>{data.notes}
          </p>
        )}
      </div>

      
      <PinnedFooter data={data} firmName={firm_name} />
    </div>
  );
}

// ── Template 3: plain ─────────────────────────────────────────────────────
function PlainTemplate({ data }) {
  const { doc_type } = data;

  return (
    <div className="w-[210mm] bg-white font-sans print:w-full">
      <div className="px-10 pt-8 print:px-6 print:pt-6">
        {/* Header — just the doc type */}
        <div className="text-center pb-4 border-b-2 border-slate-800">
          <h1 className="text-3xl font-bold tracking-widest text-slate-800 uppercase">
            {doc_type === "QUOTATION" ? "Quotation" : "Invoice"}
          </h1>
        </div>

        <BillMeta data={data} />
        <ItemsTable data={data} plain={true} />

        {data.notes && (
          <p className="mt-3 text-xs text-slate-500">
            <span className="font-semibold">Notes: </span>{data.notes}
          </p>
        )}
      </div>

      
      {/* No firm name in plain template */}
      <PinnedFooter data={data} firmName={null} />
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function InvoiceTemplate({ data, template = "with_logo" }) {
  if (!data) return null;
  if (template === "plain") return <PlainTemplate data={data} />;
  if (template === "without_logo") return <WithoutLogoTemplate data={data} />;
  return <WithLogoTemplate data={data} />;
}