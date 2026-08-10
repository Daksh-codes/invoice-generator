import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InvoiceTemplate from "./InvoiceTemplate";
import api from "../api";

const VARIANTS = [
  { key: "full",      label: "Logo + Name" },
  { key: "logo-only", label: "Logo Only"   },
  { key: "name-only", label: "Name Only"   },
];

export default function InvoicePreview() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [variant, setVariant] = useState(
    () => localStorage.getItem("invoice_variant") || "full"
  );

  useEffect(() => {
    if (!id) return;
    api
      .get(`/bills/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const setAndSave = (v) => {
    setVariant(v);
    localStorage.setItem("invoice_variant", v);
  };

  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (error)
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <>
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-1">Header:</span>
          {VARIANTS.map((v) => (
            <button
              key={v.key}
              onClick={() => setAndSave(v.key)}
              className={`px-3 py-1 rounded text-sm border transition ${
                variant === v.key
                  ? "bg-blue-950 text-white border-blue-950"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-950"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-950 text-white px-5 py-1.5 rounded text-sm hover:bg-blue-800 transition"
        >
          Print / Save PDF
        </button>
      </div>

      <InvoiceTemplate data={data} variant={variant} />
    </>
  );
}