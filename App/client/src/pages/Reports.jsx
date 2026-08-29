import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { getAllBills, getPayments } from "../api";
import { useFinancialYear } from "../context/FinancialYearContext";

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

function getDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(value, from, to) {
  if (!from && !to) return true;
  const dateKey = getDateKey(value);
  if (!dateKey) return false;
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;
  return true;
}

function getModeTotals(rows) {
  const totals = {};

  rows.forEach((payment) => {
    totals[payment.mode] = (totals[payment.mode] ?? 0) + payment.amount;
  });

  return Object.entries(totals)
    .map(([mode, total]) => ({ mode, total }))
    .sort((a, b) => b.total - a.total);
}

export default function Reports() {
  const { financialYear } = useFinancialYear();
  const [paymentRows, setPaymentRows] = useState([]);
  const [selectedMode, setSelectedMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const hasFilters = filterDateFrom || filterDateTo;

  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");

        const billsRes = await getAllBills({
          date_from: financialYear.startDate,
          date_to: financialYear.endDate,
        });
        const bills = Array.isArray(billsRes.data)
          ? billsRes.data
          : (billsRes.data?.bills ?? []);

        const paymentsByBill = await Promise.all(
          bills.map(async (bill) => {
            const paymentsRes = await getPayments(bill.id);
            return {
              bill,
              payments: getPaymentsFromResponse(paymentsRes.data),
            };
          }),
        );
        const rows = [];

        paymentsByBill.forEach(({ bill, payments }) => {
          payments.forEach((payment) => {
            const amount = Number(payment.amount ?? 0);
            if (!amount) return;

            const mode = payment.mode || "Unknown";
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

        const chartData = getModeTotals(rows);

        if (!alive) return;
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
  }, [financialYear.startDate, financialYear.endDate]);

  const dateFilteredPayments = useMemo(
    () =>
      paymentRows.filter((payment) => {
        if (
          !isWithinDateRange(
            payment.date,
            financialYear.startDate,
            financialYear.endDate,
          )
        ) {
          return false;
        }
        return isWithinDateRange(payment.date, filterDateFrom, filterDateTo);
      }),
    [
      paymentRows,
      financialYear.startDate,
      financialYear.endDate,
      filterDateFrom,
      filterDateTo,
    ],
  );

  const modeTotals = useMemo(
    () => getModeTotals(dateFilteredPayments),
    [dateFilteredPayments],
  );

  useEffect(() => {
    if (modeTotals.length === 0) {
      if (selectedMode) setSelectedMode("");
      return;
    }

    if (!modeTotals.some((entry) => entry.mode === selectedMode)) {
      setSelectedMode(modeTotals[0].mode);
    }
  }, [modeTotals, selectedMode]);

  const filteredPayments = useMemo(
    () =>
      dateFilteredPayments.filter((payment) => payment.mode === selectedMode),
    [dateFilteredPayments, selectedMode],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Reports</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Payment totals by mode
            </p>
          </div>
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider block mb-1">
                From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wider block mb-1">
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

            <button 
              onClick={() => {
                setFilterDateFrom("")
                setFilterDateTo("")
              }}
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

        {modeTotals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center text-sm text-slate-400">
            No data
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="h-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modeTotals}
                    onClick={(state) => {
                      const mode = state?.activePayload?.[0]?.payload?.mode;
                      if (mode) {
                        setSelectedMode(mode);
                      }
                    }}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="mode" tick={{ fontSize: 12 }} />

                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatAmount(value)}
                    />

                    <Tooltip formatter={(value) => formatAmount(value)} />

                    <Legend />

                    <Bar
                      dataKey="total"
                      name="Total Payments"
                      radius={[10, 10, 0, 0]}
                      minPointSize={8}
                      cursor="pointer"
                      onClick={(data) => {
                        if (data?.mode) {
                          setSelectedMode(data.mode);
                        }
                      }}
                    >
                      {modeTotals.map((entry, index) => (
                        <Cell
                          key={entry.mode}
                          fill={COLORS[index % COLORS.length]}
                          opacity={entry.mode === selectedMode ? 1 : 0.72}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {modeTotals.map((entry, index) => {
                  const active = entry.mode === selectedMode;
                  return (
                    <button
                      key={entry.mode}
                      type="button"
                      onClick={() => setSelectedMode(entry.mode)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{entry.mode}</span>
                      <span className={active ? "text-slate-200" : "text-slate-400"}>
                        {formatAmount(entry.total)}
                      </span>
                    </button>
                  );
                })}
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
                          <button
                            onClick={() =>
                              navigate(`/bills/${payment.invoiceId}/preview`)
                            }
                            className="font-mono font-medium text-slate-800 hover:text-blue-600 hover:underline transition-colors"
                          >
                            {payment.billNumber ?? "—"}
                          </button>
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