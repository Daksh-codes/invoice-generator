// src/pages/InvoicePreview.jsx
// Reads template from data.template saved at bill creation — no toggle needed.

import { useEffect, useState } from "react";
import { BlobProvider, PDFViewer } from "@react-pdf/renderer";
import { useNavigate } from "react-router-dom";
import { getBill } from "../api";
import InvoicePDF from "./InvoicePDF";
import PaymentReceiptPDF from "./PaymentReceiptPDF";

export default function InvoicePreview({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    getBill(id)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || "Failed to load bill"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <div className="bg-white rounded p-6 text-red-600 text-sm shadow">{error}</div>
    </div>
  );

  const canDownloadReceipt = Number(data?.paid_amount ?? 0) > 0;

  return (
    <div className="min-h-screen flex flex-col items-center bg-blue-100 py-6 gap-4 print:bg-white">

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
        {/* <button
          onClick={() => window.print()}
          className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Print / Save PDF
        </button> */}
        <BlobProvider document={<InvoicePDF data={data} />}>
          {({ url, loading, error }) => {
            if (loading) {
              return (
                <button
                  disabled
                  className="px-3 py-1 text-sm rounded bg-slate-500 text-white cursor-not-allowed"
                >
                  Generating...
                </button>
              );
            }
            if (error) {
              return (
                <button
                  disabled
                  className="px-3 py-1 text-sm rounded bg-red-500 text-white cursor-not-allowed"
                >
                  PDF Error
                </button>
              );
            }
            return (
              <a
                href={url}
                download={`invoice-${data?.bill_number ?? id}.pdf`}
                className="px-3 py-1 text-sm rounded bg-slate-800 text-white hover:bg-slate-900 transition"
              >
                Download PDF
              </a>
            );
          }}
        </BlobProvider>
        {canDownloadReceipt && (
          <BlobProvider document={<PaymentReceiptPDF data={data} />}>
            {({ url, loading, error }) => {
              if (loading) {
                return (
                  <button
                    disabled
                    className="px-3 py-1 text-sm rounded bg-emerald-500 text-white cursor-not-allowed"
                  >
                    Receipt...
                  </button>
                );
              }
              if (error) {
                return (
                  <button
                    disabled
                    className="px-3 py-1 text-sm rounded bg-red-500 text-white cursor-not-allowed"
                  >
                    Receipt Error
                  </button>
                );
              }
              return (
                <a
                  href={url}
                  download={`payment-receipt-${data?.bill_number ?? id}.pdf`}
                  className="px-3 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Download Receipt
                </a>
              );
            }}
          </BlobProvider>
        )}
      </div>

      {/* Invoice */}
      <div className="shadow-xl print:shadow-none print:w-full w-full max-w-[210mm] bg-white">
        <PDFViewer style={{ width: "100%", height: "100vh" }}>
          <InvoicePDF data={data} />
        </PDFViewer>
      </div>
    </div>
  );
}
