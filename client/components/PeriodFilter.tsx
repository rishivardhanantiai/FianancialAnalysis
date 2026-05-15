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
    <div className="bg-white border border-blue-pale rounded-lg p-4 mb-6">
      {/* Tab Row */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === tab.key
                ? "bg-navy text-white"
                : "bg-blue-pale text-navy hover:bg-blue-mid hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls per tab */}
      <div className="flex gap-3 items-end flex-wrap">
        {/* MONTHLY */}
        {activeTab === "monthly" && value.type === "monthly" && (
          <>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Year</label>
              <select
                value={value.year}
                onChange={(e) =>
                  onChange({ type: "monthly", year: +e.target.value, month: value.month })
                }
                className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Month</label>
              <select
                value={value.month}
                onChange={(e) =>
                  onChange({ type: "monthly", year: value.year, month: +e.target.value })
                }
                className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
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
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Year</label>
              <select
                value={value.year}
                onChange={(e) =>
                  onChange({ type: "quarterly", year: +e.target.value, quarter: value.quarter })
                }
                className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Quarter</label>
              <select
                value={value.quarter}
                onChange={(e) =>
                  onChange({ type: "quarterly", year: value.year, quarter: +e.target.value as 1|2|3|4 })
                }
                className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
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
            <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Year</label>
            <select
              value={value.year}
              onChange={(e) => onChange({ type: "yearly", year: +e.target.value })}
              className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
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
            <label className="block text-xs font-bold text-blue-mid uppercase mb-1">
              Financial Year (Apr – Mar)
            </label>
            <div className="flex gap-2 flex-wrap">
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
                        // second click starts multi-select
                        onChange({ type: "multi-fy", fys: [value.fy, fy] });
                      } else {
                        onChange({ type: "financial-year", fy });
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                      isSelected
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-navy border-blue-pale hover:border-navy"
                    }`}
                  >
                    FY {fy}
                  </button>
                );
              })}
            </div>
            {value.type === "multi-fy" && (
              <p className="text-xs text-blue-mid mt-1">
                Comparing {value.fys.length} financial years. Click a selected FY to deselect.
              </p>
            )}
          </div>
        )}

        {/* CUSTOM */}
        {activeTab === "custom" && value.type === "custom" && (
          <>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={value.start}
                onChange={(e) => onChange({ type: "custom", start: e.target.value, end: value.end })}
                className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-mid uppercase mb-1">End Date</label>
              <input
                type="date"
                value={value.end}
                onChange={(e) => onChange({ type: "custom", start: value.start, end: e.target.value })}
                className="px-3 py-2 border border-blue-pale rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
