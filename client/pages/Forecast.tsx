import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import {
  generateForecast, buildMonthlyTotals, formatMonthLabel,
  getCurrentMonth, alphasValid, DEFAULT_REVENUE_ALPHAS, DEFAULT_EXPENSE_ALPHAS,
  type AlphaTriplet,
} from "@/lib/forecastEngine";

function formatCurrency(n: number) {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function alphaInterpret(a: number): string {
  if (a < 0.4) return "Stable — slow reaction";
  if (a < 0.6) return "Balanced";
  return "Reactive — fast to volatility";
}

interface AlphaControlProps {
  label: string;
  alphas: AlphaTriplet;
  onChange: (a: AlphaTriplet) => void;
}
function AlphaControl({ label, alphas, onChange }: AlphaControlProps) {
  const valid = alphasValid(alphas);
  const sum   = alphas[0] + alphas[1] + alphas[2];

  const handleChange = (idx: 0|1|2, raw: string) => {
    const val = Math.min(0.9, Math.max(0.1, parseFloat(raw) || 0.1));
    const next: AlphaTriplet = [...alphas] as AlphaTriplet;
    next[idx] = parseFloat(val.toFixed(1));
    onChange(next);
  };

  return (
    <div className="bg-blue-pale border-2 border-blue-mid rounded-lg p-4">
      <p className="text-xs font-bold text-navy uppercase tracking-wider mb-3">{label}</p>
      {(["α1 (current mo.)", "α2 (t−1)", "α3 (t−2)"] as const).map((lbl, i) => (
        <div key={i} className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-blue-mid font-semibold">{lbl}</label>
            <span className="text-xs font-bold text-navy">{alphas[i as 0|1|2].toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.1} max={0.9} step={0.1}
            value={alphas[i as 0|1|2]}
            onChange={(e) => handleChange(i as 0|1|2, e.target.value)}
            className="w-full accent-navy"
          />
          <p className="text-xs text-blue-mid mt-1">{alphaInterpret(alphas[i as 0|1|2])}</p>
        </div>
      ))}
      <div className={`text-xs font-bold mt-2 px-2 py-1 rounded ${valid ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
        Sum = {sum.toFixed(1)} {valid ? "✓" : "⚠ must equal 1.0"}
      </div>
    </div>
  );
}

export default function Forecast() {
  const { transactions, loading, error } = useTransactions();
  const [revAlphas, setRevAlphas] = useState<AlphaTriplet>([...DEFAULT_REVENUE_ALPHAS]);
  const [expAlphas, setExpAlphas] = useState<AlphaTriplet>([...DEFAULT_EXPENSE_ALPHAS]);
  const [openingCash, setOpeningCash] = useState(500000);

  const currentMonth = getCurrentMonth();

  // Build actuals chart data from real transactions
  const revTotals = useMemo(() => buildMonthlyTotals(transactions, "Revenue"), [transactions]);
  const expTotals = useMemo(() => buildMonthlyTotals(transactions, "Expense"), [transactions]);

  const actualMonths = useMemo(() => {
    const all = new Set([...Object.keys(revTotals), ...Object.keys(expTotals)]);
    return Array.from(all).sort().slice(-6); // last 6 actual months
  }, [revTotals, expTotals]);

  // Forecast
  const forecast = useMemo(
    () => generateForecast(transactions, revAlphas, expAlphas, 3),
    [transactions, revAlphas, expAlphas]
  );

  // Unified chart: actuals + forecast
  const chartData = useMemo(() => {
    const actual = actualMonths.map((m) => ({
      month: formatMonthLabel(m),
      Revenue:  revTotals[m] ?? 0,
      Expenses: expTotals[m] ?? 0,
      type: "actual",
    }));
    const fcst = forecast.months.map((f) => ({
      month:    f.label,
      Revenue:  f.revenue,
      Expenses: f.expense,
      type:     "forecast",
    }));
    return [...actual, ...fcst];
  }, [actualMonths, forecast, revTotals, expTotals]);

  // Cash flow rows
  const cfRows = useMemo(() => {
    let cash = openingCash;
    return forecast.months.map((f) => {
      const openCash  = cash;
      const closeCash = cash + f.netCF;
      cash = closeCash;
      const runway =
        f.expense > f.revenue
          ? (closeCash / (f.expense - f.revenue)).toFixed(1) + " mo"
          : "∞ Positive";
      return { ...f, openCash, closeCash, runway };
    });
  }, [forecast, openingCash]);

  const lastCF   = cfRows[cfRows.length - 1];
  const splitLabel = actualMonths.length > 0
    ? formatMonthLabel(actualMonths[actualMonths.length - 1])
    : "";

  return (
    <Layout
      title="3-Month Revenue Projection"
      subtitle="Exponential smoothing · Auto-pulled from Daily Log · Dynamically date-aware"
    >
      {loading && <div className="text-center py-8 text-blue-mid text-sm">Loading…</div>}
      {error   && <div className="alert red" style={{ marginBottom: "12px" }}>{error}</div>}

      {/* Alpha Controls */}
      <div style={{ background: "var(--navy)", color: "white", padding: "12px 24px", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>⚙ Smoothing Factor Controls</span>
        <span style={{ fontSize: "11px", opacity: 0.7 }}>F(t+1) = α1·A(t) + α2·A(t−1) + α3·A(t−2)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <AlphaControl label="Revenue Alphas" alphas={revAlphas} onChange={setRevAlphas} />
        <AlphaControl label="Expense Alphas" alphas={expAlphas} onChange={setExpAlphas} />
      </div>

      {/* Opening Cash */}
      <div className="box mb-16" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--navy)", textTransform: "uppercase" }}>
          Opening Cash (₹)
        </label>
        <input
          type="number"
          value={openingCash}
          onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
          style={{
            padding: "8px 12px",
            border: "1.5px solid var(--f-border)",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--navy)",
            background: "var(--background)",
            width: "160px",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Starting cash balance for runway calculation</span>
      </div>

      {/* Seed Actuals Used */}
      <div className="box mb-16" style={{ padding: "16px", background: "var(--blue-pale)" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--navy)", textTransform: "uppercase", marginBottom: "8px" }}>Actuals Used for Seeding</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, marginBottom: "4px" }}>Revenue: A(t), A(t−1), A(t−2)</p>
            <p className="fw-bold" style={{ fontSize: "13px", color: "var(--navy)" }}>
              {forecast.revenueActuals.map(formatCurrency).join(" · ")}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, marginBottom: "4px" }}>Expense: A(t), A(t−1), A(t−2)</p>
            <p className="fw-bold" style={{ fontSize: "13px", color: "var(--navy)" }}>
              {forecast.expenseActuals.map(formatCurrency).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="box mb-16">
        <div className="box-title">
          <span>3-Month Forward Forecast</span>
          <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted)" }}>
            — dynamically derived from {currentMonth}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr style={{ background: "var(--navy)", color: "white" }}>
                <th>Month</th>
                <th>Forecast Revenue</th>
                <th>Forecast Expense</th>
                <th>Net CF</th>
                <th>Opening Cash</th>
                <th>Closing Cash</th>
                <th>Runway</th>
              </tr>
            </thead>
            <tbody>
              {cfRows.map((row) => (
                <tr key={row.month} style={{ textAlign: "center" }}>
                  <td className="fw-bold">{row.label}</td>
                  <td className="fw-bold" style={{ color: "var(--green)" }}>{formatCurrency(row.revenue)}</td>
                  <td className="fw-bold" style={{ color: "var(--red)" }}>{formatCurrency(row.expense)}</td>
                  <td className="fw-bold" style={{ color: row.netCF >= 0 ? "var(--green)" : "var(--red)" }}>
                    {row.netCF >= 0 ? "+" : ""}{formatCurrency(row.netCF)}
                  </td>
                  <td>{formatCurrency(row.openCash)}</td>
                  <td className="fw-bold">{formatCurrency(row.closeCash)}</td>
                  <td>{row.runway}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart: Actuals + Forecast */}
      <div className="box mb-16">
        <div className="box-title">Revenue & Expenses — Actuals + Forecast</div>
        <div style={{ padding: "16px" }}>
          <p style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "12px" }}>Dashed line separates actuals from forecast period.</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
              <XAxis dataKey="month" stroke="#5a718a" style={{ fontSize: 11 }} />
              <YAxis stroke="#5a718a" style={{ fontSize: 11 }} tickFormatter={formatCurrency} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ background: "#fff", border: "1px solid #e2eaf3" }} />
              <Legend />
              {splitLabel && (
                <ReferenceLine x={splitLabel} stroke="#1F3A5F" strokeDasharray="6 3" label={{ value: "Forecast →", position: "top", fontSize: 10, fill: "#1F3A5F" }} />
              )}
              <Line type="monotone" dataKey="Revenue" stroke="#2E7D32" strokeWidth={2} dot={{ fill: "#2E7D32", r: 3 }} />
              <Line type="monotone" dataKey="Expenses" stroke="#C62828" strokeWidth={2} dot={{ fill: "#C62828", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {lastCF && lastCF.netCF >= 0 ? (
          <div className="alert green" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "18px" }}>🟢</span>
            <div>
              <p className="fw-bold" style={{ marginBottom: "2px" }}>Positive cash flow projected</p>
              <p style={{ fontSize: "11px", opacity: 0.8 }}>Revenue exceeds expenses in all 3 forecast months.</p>
            </div>
          </div>
        ) : (
          <div className="alert red" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <div>
              <p className="fw-bold" style={{ marginBottom: "2px" }}>Negative cash flow projected</p>
              <p style={{ fontSize: "11px", opacity: 0.8 }}>Monitor burn rate. Adjust alpha weights or review expense base.</p>
            </div>
          </div>
        )}
        {lastCF && typeof lastCF.runway === "string" && !lastCF.runway.includes("∞") && parseFloat(lastCF.runway) < 3 && (
          <div className="alert red" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "18px" }}>🚨</span>
            <div>
              <p className="fw-bold" style={{ marginBottom: "2px" }}>Runway below 3 months</p>
              <p style={{ fontSize: "11px", opacity: 0.8 }}>Take immediate cash action.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

