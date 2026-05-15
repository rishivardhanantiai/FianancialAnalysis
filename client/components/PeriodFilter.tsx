import { useState } from "react";
import type { FilterPeriod } from "@/lib/dateFilters";
import {
  getCurrentFY,
  getCurrentQuarter,
  getDefaultPeriod,
} from "@/lib/dateFilters";
import type { TransactionRecord } from "@shared/api";
import {
  getAvailableFYs,
  getAvailableYears,
} from "@/lib/dateFilters";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface PeriodFilterProps {
  value: FilterPeriod;
  onChange: (period: FilterPeriod) => void;
  transactions: TransactionRecord[]; // used to derive available FYs & years
  showAllOption?: boolean;
}

type TabType = "all" | "monthly" | "quarterly" | "yearly" | "financial-year" | "custom";

export default function PeriodFilter({
  value,
  onChange,
  transactions,
  showAllOption = true,
}: PeriodFilterProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const { quarter: currentQ } = getCurrentQuarter();

  const availableFYs = getAvailableFYs(transactions);
  const availableYears = getAvailableYears(transactions);

  const activeTab: TabType =
    value.type === "multi-fy" ? "financial-year" : (value.type as TabType);

  const tabs: { key: TabType; label: string }[] = [
    ...(showAllOption ? [{ key: "all" as TabType, label: "All Time" }] : []),
    { key: "monthly",        label: "Monthly" },
    { key: "quarterly",      label: "Quarterly" },
    { key: "yearly",         label: "Yearly" },
    { key: "financial-year", label: "Financial Year" },
    { key: "custom",         label: "Custom Range" },
  ];

  const handleTabChange = (tab: TabType) => {
    switch (tab) {
      case "all":
        onChange({ type: "all" });
        break;
      case "monthly":
        onChange({ type: "monthly", year: currentYear, month: currentMonth });
        break;
      case "quarterly":
        onChange({ type: "quarterly", year: currentYear, quarter: currentQ });
        break;
      case "yearly":
        onChange({ type: "yearly", year: currentYear });
        break;
      case "financial-year":
        onChange({ type: "financial-year", fy: getCurrentFY() });
        break;
      case "custom": {
        const start = `${currentYear}-01-01`;
        const end = now.toISOString().split("T")[0];
        onChange({ type: "custom", start, end });
        break;
      }
    }
  };

  return (
    <div className="box mb-16">
      {/* Tab Row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", borderBottom: "1px solid var(--f-border)", paddingBottom: "8px" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className="btn-ui"
            style={{
              background: activeTab === tab.key ? "var(--blue-pale)" : "transparent",
              color: activeTab === tab.key ? "var(--navy)" : "var(--f-muted)",
              fontWeight: activeTab === tab.key ? 800 : 500,
              padding: "6px 12px",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls per tab */}
      <div style={{ display: "flex", gap: "16px", alignItems: "end", flexWrap: "wrap" }}>
        {/* MONTHLY */}
        {activeTab === "monthly" && value.type === "monthly" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Year</label>
              <select
                value={value.year}
                onChange={(e) =>
                  onChange({ type: "monthly", year: +e.target.value, month: value.month })
                }
                className="tbl-input"
                style={{ width: "100px" }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Month</label>
              <select
                value={value.month}
                onChange={(e) =>
                  onChange({ type: "monthly", year: value.year, month: +e.target.value })
                }
                className="tbl-input"
                style={{ width: "120px" }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{MONTH_NAMES[m]}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* QUARTERLY */}
        {activeTab === "quarterly" && value.type === "quarterly" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Year</label>
              <select
                value={value.year}
                onChange={(e) =>
                  onChange({ type: "quarterly", year: +e.target.value, quarter: value.quarter })
                }
                className="tbl-input"
                style={{ width: "100px" }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Quarter</label>
              <select
                value={value.quarter}
                onChange={(e) =>
                  onChange({ type: "quarterly", year: value.year, quarter: +e.target.value as 1|2|3|4 })
                }
                className="tbl-input"
                style={{ width: "160px" }}
              >
                <option value={1}>Q1 (Jan–Mar)</option>
                <option value={2}>Q2 (Apr–Jun)</option>
                <option value={3}>Q3 (Jul–Sep)</option>
                <option value={4}>Q4 (Oct–Dec)</option>
              </select>
            </div>
          </>
        )}

        {/* YEARLY */}
        {activeTab === "yearly" && value.type === "yearly" && (
          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Year</label>
            <select
              value={value.year}
              onChange={(e) => onChange({ type: "yearly", year: +e.target.value })}
              className="tbl-input"
              style={{ width: "100px" }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* FINANCIAL YEAR */}
        {activeTab === "financial-year" && (
          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
              Financial Year (Apr – Mar)
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {availableFYs.map((fy) => {
                const isSelected =
                  (value.type === "financial-year" && value.fy === fy) ||
                  (value.type === "multi-fy" && value.fys.includes(fy));
                return (
                  <button
                    key={fy}
                    onClick={() => {
                      if (value.type === "multi-fy") {
                        const fys = value.fys.includes(fy)
                          ? value.fys.filter((f) => f !== fy)
                          : [...value.fys, fy];
                        if (fys.length === 0) return;
                        if (fys.length === 1)
                          onChange({ type: "financial-year", fy: fys[0] });
                        else onChange({ type: "multi-fy", fys });
                      } else if (value.type === "financial-year") {
                        if (value.fy === fy) return;
                        onChange({ type: "multi-fy", fys: [value.fy, fy] });
                      } else {
                        onChange({ type: "financial-year", fy });
                      }
                    }}
                    className="tag"
                    style={{
                      background: isSelected ? "var(--navy)" : "var(--blue-pale)",
                      color: isSelected ? "#fff" : "var(--navy)",
                      cursor: "pointer",
                      padding: "6px 12px",
                      border: "none",
                      fontWeight: isSelected ? 800 : 600,
                    }}
                  >
                    FY {fy}
                  </button>
                );
              })}
            </div>
            {value.type === "multi-fy" && (
              <p style={{ fontSize: "11px", color: "var(--f-muted)", marginTop: "8px" }}>
                Comparing {value.fys.length} financial years. Click a selected FY to deselect.
              </p>
            )}
          </div>
        )}

        {/* CUSTOM */}
        {activeTab === "custom" && value.type === "custom" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Start Date</label>
              <input
                type="date"
                value={value.start}
                onChange={(e) => onChange({ type: "custom", start: e.target.value, end: value.end })}
                className="tbl-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--f-muted)", textTransform: "uppercase", marginBottom: "4px" }}>End Date</label>
              <input
                type="date"
                value={value.end}
                onChange={(e) => onChange({ type: "custom", start: value.start, end: e.target.value })}
                className="tbl-input"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
