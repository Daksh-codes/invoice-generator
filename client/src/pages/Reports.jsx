import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getAllBills, getPayments } from "../api";

const COLORS = [
  "#0f172a",
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#4b5563",
];

function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function getPaymentsFromResponse(data) {
  if (Array.isArray(data)) return data;
  return data?.payments ?? [];
}

export default function Reports() {
  const [modeTotals, setModeTotals] = useState([]);
  const [paymentRows, setPaymentRows] = useState([]);
  const [selectedMode, setSelectedMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");

        const billsRes = await getAllBills();
        const bills = Array.isArray(billsRes.data)
          ? billsRes.data
          : billsRes.data?.bills ?? [];

        const paymentsByBill = await Promise.all(
          bills.map(async (bill) => {
            const paymentsRes = await getPayments(bill.id);
            return {
              bill,
              payments: getPaymentsFromResponse(paymentsRes.data),
            };
          }),
        );

        const totals = {};
        const rows = [];

        paymentsByBill.forEach(({ bill, payments }) => {
          payments.forEach((payment) => {
            const amount = Number(payment.amount ?? 0);
            if (!amount) return;

            const mode = payment.mode || "Unknown";
            totals[mode] = (totals[mode] ?? 0) + amount;
            rows.push({
              id: payment.id ?? `${bill.id}-${rows.length}`,
              invoiceId: bill.id,
              billNumber: bill.bill_number ?? `#${bill.id}`,
              clientName: bill.client_name ?? "-",
              amount,
              mode,
              date: payment.payment_date ?? payment.date,
            });
          });
        });

        const chartData = Object.entries(totals)
          .map(([mode, total]) => ({ mode, total }))
          .sort((a, b) => b.total - a.total);

        if (!alive) return;
        setModeTotals(chartData);
        setPaymentRows(rows);
        setSelectedMode(chartData[0]?.mode ?? "");
      } catch (err) {
        if (alive) {
          setError(err.response?.data?.message ?? "Failed to load reports.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadReports();

    return () => {
      alive = false;
    };
  }, []);

  const filteredPayments = useMemo(
    () => paymentRows.filter((payment) => payment.mode === selectedMode),
    [paymentRows, selectedMode],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Payment totals by mode
          </p>
        </div>

        {modeTotals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center text-sm text-slate-400">
            No data
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modeTotals}
                      dataKey="total"
                      nameKey="mode"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ mode, total }) =>
                        `${mode}: ${formatAmount(total)}`
                      }
                      onClick={(entry) => setSelectedMode(entry.mode)}
                    >
                      {modeTotals.map((entry, index) => (
                        <Cell
                          key={entry.mode}
                          fill={COLORS[index % COLORS.length]}
                          stroke={entry.mode === selectedMode ? "#020617" : "#fff"}
                          strokeWidth={entry.mode === selectedMode ? 3 : 1}
                          className="cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatAmount(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    {selectedMode} Payments
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {filteredPayments.length} matching payment
                    {filteredPayments.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {formatAmount(
                    filteredPayments.reduce(
                      (sum, payment) => sum + payment.amount,
                      0,
                    ),
                  )}
                </p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bill
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-slate-400 text-sm"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {payment.billNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {payment.clientName}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatAmount(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(payment.date)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
