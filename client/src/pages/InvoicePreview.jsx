// src/pages/InvoicePreview.jsx
// Reads template from data.template saved at bill creation — no toggle needed.

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useNavigate } from "react-router-dom";
import { getBill } from "../api";
import InvoicePDF from "./InvoicePDF";
import InvoiceTemplate from "./InvoiceTemplate";

export default function InvoicePreview({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getBill(id)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || "Failed to load bill"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <div className="bg-white rounded p-6 text-red-600 text-sm shadow">{error}</div>
    </div>
  );

  const template = data?.template ?? "with_logo";

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-200 py-6 gap-4 print:bg-white">

      {/* Buttons hidden in print */}
      <div className="flex gap-2 print:hidden">
        <button
          onClick={() => navigate(`/`)}
          className="px-3 py-1 text-sm rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
        >
          Dashboard
        </button>
        <button
          onClick={() => navigate(`/bills/${id}/edit`)}
          className="px-3 py-1 text-sm rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
        >
          Edit
        </button>
        <button
          onClick={() => window.print()}
          className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Print / Save PDF
        </button>
        <PDFDownloadLink
          document={<InvoicePDF data={data} />}
          fileName={`invoice-${data?.bill_number ?? id}.pdf`}
          className="px-3 py-1 text-sm rounded bg-slate-800 text-white hover:bg-slate-900 transition"
        >
          {({ loading }) => (loading ? "Generating..." : "Download PDF")}
        </PDFDownloadLink>
      </div>

      {/* Invoice */}
      <div className="shadow-xl print:shadow-none print:w-full">
        <InvoiceTemplate data={data} template={template} />
      </div>
    </div>
  );
}
