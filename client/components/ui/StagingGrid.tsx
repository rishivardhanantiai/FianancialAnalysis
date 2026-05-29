import { useMemo, type ReactNode } from "react";

export interface StagedTransaction {
  id: string;
  date: string;
  amount: number;
  type: "Revenue" | "Expense";
  notes: string;
  dept: string;
  project: string;
  customer: string;
  business_unit: string;
  invoice_number: string;
  owner: string;
  ctype: string;
  costt: string;
}

type Props = {
  data: StagedTransaction[];
  onUpdate: (id: string, field: keyof StagedTransaction, value: string | number) => void;
  onRemove: (id: string) => void;
};

const BU_OPTIONS = ["CFB", "B2B", "D2C", "SS"];
const DEPT_OPTIONS = ["Marketing", "Sales", "Finance", "HR", "Tech", "Ops", "Management"];
const CTYPE_OPTIONS = ["New", "Existing"];
const COST_OPTIONS = ["Fixed", "Variable"];

type ChipTone = "slate" | "emerald" | "rose" | "blue" | "amber";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function fieldId(rowId: string, field: keyof StagedTransaction) {
  return `staged-${rowId}-${field}`;
}

function getMissingFields(row: StagedTransaction) {
  const missing: string[] = [];

  if (!row.date?.trim()) missing.push("Date");
  if (row.amount === undefined || row.amount === null || Number.isNaN(Number(row.amount))) {
    missing.push("Amount");
  }

  if (row.type === "Revenue") {
    if (!row.business_unit?.trim()) missing.push("BU");
    if (!row.project?.trim()) missing.push("Project");
    if (!row.customer?.trim()) missing.push("Customer");
    if (!row.ctype?.trim()) missing.push("Cust Type");
    if (!row.owner?.trim()) missing.push("Owner");
  }

  if (row.type === "Expense") {
    if (!row.dept?.trim()) missing.push("Dept");
    if (!row.project?.trim()) missing.push("Project");
    if (!row.owner?.trim()) missing.push("Owner");
    if (!row.costt?.trim()) missing.push("Cost Type");
  }

  return missing;
}

export function StagingGrid({ data, onUpdate, onRemove }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  const summary = useMemo(() => {
    const total = safeData.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const revenue = safeData.filter((row) => row.type === "Revenue").length;
    const expense = safeData.filter((row) => row.type === "Expense").length;
    const invalid = safeData.filter((row) => getMissingFields(row).length > 0).length;

    return { total, revenue, expense, invalid };
  }, [safeData]);

  if (!safeData.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Staged Transactions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review, edit, and save imported rows before pushing them to the Daily Log.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <StatChip label="Rows" value={safeData.length} />
          <StatChip label="Revenue" value={summary.revenue} tone="emerald" />
          <StatChip label="Expense" value={summary.expense} tone="rose" />
          <StatChip label="Total" value={`₹${formatCurrency(summary.total)}`} tone="blue" />
          {summary.invalid > 0 && (
            <StatChip label="Needs review" value={summary.invalid} tone="amber" />
          )}
        </div>
      </header>

      <div className="max-h-[72vh] overflow-auto">
        <div className="space-y-4 p-4 sm:p-6">
          {safeData.map((row, index) => {
            const missing = getMissingFields(row);
            const hasMissing = missing.length > 0;
            const isExpense = row.type === "Expense";
            const isRevenue = row.type === "Revenue";

            const handleTypeChange = (nextType: "Revenue" | "Expense") => {
              onUpdate(row.id, "type", nextType);

              if (nextType === "Revenue") {
                onUpdate(row.id, "dept", "");
                onUpdate(row.id, "costt", "");
              } else {
                onUpdate(row.id, "business_unit", "");
                onUpdate(row.id, "ctype", "");
              }
            };

            return (
              <article
                key={row.id}
                className={`rounded-2xl border p-4 shadow-sm transition-colors sm:p-5 ${
                  hasMissing
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        row.type === "Revenue"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {row.type}
                    </span>

                    <span className="text-sm font-medium text-slate-500">
                      Row {index + 1}
                    </span>

                    <span className="text-sm text-slate-500">
                      ID: {row.id.slice(0, 8)}
                    </span>

                    {hasMissing && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        Missing: {missing.join(", ")}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(row.id)}
                    className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
                  >
                    ✕ Drop
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <LabeledField
                    label="Date"
                    htmlFor={fieldId(row.id, "date")}
                    className="col-span-12 sm:col-span-2"
                  >
                    <input
                      id={fieldId(row.id, "date")}
                      type="date"
                      value={row.date ?? ""}
                      onChange={(e) => onUpdate(row.id, "date", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </LabeledField>

                  <LabeledField
                    label="Amount (₹)"
                    htmlFor={fieldId(row.id, "amount")}
                    className="col-span-12 sm:col-span-2"
                  >
                    <input
                      id={fieldId(row.id, "amount")}
                      type="number"
                      step="0.01"
                      value={row.amount ?? 0}
                      onChange={(e) =>
                        onUpdate(row.id, "amount", Number(e.target.value) || 0)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </LabeledField>

                  <LabeledField
                    label="Type"
                    htmlFor={fieldId(row.id, "type")}
                    className="col-span-12 sm:col-span-2"
                  >
                    <select
                      id={fieldId(row.id, "type")}
                      value={row.type}
                      onChange={(e) =>
                        handleTypeChange(e.target.value as "Revenue" | "Expense")
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="Revenue">Revenue</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </LabeledField>

                  {isRevenue && (
                    <>
                      <LabeledField
                        label="BU"
                        htmlFor={fieldId(row.id, "business_unit")}
                        className="col-span-12 sm:col-span-2"
                      >
                        <select
                          id={fieldId(row.id, "business_unit")}
                          value={row.business_unit ?? ""}
                          onChange={(e) =>
                            onUpdate(row.id, "business_unit", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        >
                          <option value="">— Select —</option>
                          {BU_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </LabeledField>

                      <LabeledField
                        label="Customer"
                        htmlFor={fieldId(row.id, "customer")}
                        className="col-span-12 sm:col-span-4"
                      >
                        <input
                          id={fieldId(row.id, "customer")}
                          type="text"
                          value={row.customer ?? ""}
                          onChange={(e) =>
                            onUpdate(row.id, "customer", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Customer name"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Cust Type"
                        htmlFor={fieldId(row.id, "ctype")}
                        className="col-span-12 sm:col-span-2"
                      >
                        <select
                          id={fieldId(row.id, "ctype")}
                          value={row.ctype ?? ""}
                          onChange={(e) => onUpdate(row.id, "ctype", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        >
                          <option value="">— Select —</option>
                          {CTYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </LabeledField>

                      <LabeledField
                        label="Project"
                        htmlFor={fieldId(row.id, "project")}
                        className="col-span-12 sm:col-span-3"
                      >
                        <input
                          id={fieldId(row.id, "project")}
                          type="text"
                          value={row.project ?? ""}
                          onChange={(e) => onUpdate(row.id, "project", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Project"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Inv #"
                        htmlFor={fieldId(row.id, "invoice_number")}
                        className="col-span-12 sm:col-span-2"
                      >
                        <input
                          id={fieldId(row.id, "invoice_number")}
                          type="text"
                          value={row.invoice_number ?? ""}
                          onChange={(e) =>
                            onUpdate(row.id, "invoice_number", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Invoice #"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Owner"
                        htmlFor={fieldId(row.id, "owner")}
                        className="col-span-12 sm:col-span-3"
                      >
                        <input
                          id={fieldId(row.id, "owner")}
                          type="text"
                          value={row.owner ?? ""}
                          onChange={(e) => onUpdate(row.id, "owner", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Owner"
                        />
                      </LabeledField>
                    </>
                  )}

                  {isExpense && (
                    <>
                      <LabeledField
                        label="Dept"
                        htmlFor={fieldId(row.id, "dept")}
                        className="col-span-12 sm:col-span-2"
                      >
                        <select
                          id={fieldId(row.id, "dept")}
                          value={row.dept ?? ""}
                          onChange={(e) => onUpdate(row.id, "dept", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        >
                          <option value="">— Select —</option>
                          {DEPT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </LabeledField>

                      <LabeledField
                        label="Vendor"
                        htmlFor={fieldId(row.id, "customer")}
                        className="col-span-12 sm:col-span-4"
                      >
                        <input
                          id={fieldId(row.id, "customer")}
                          type="text"
                          value={row.customer ?? ""}
                          onChange={(e) => onUpdate(row.id, "customer", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Vendor name"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Project"
                        htmlFor={fieldId(row.id, "project")}
                        className="col-span-12 sm:col-span-3"
                      >
                        <input
                          id={fieldId(row.id, "project")}
                          type="text"
                          value={row.project ?? ""}
                          onChange={(e) => onUpdate(row.id, "project", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Project"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Inv #"
                        htmlFor={fieldId(row.id, "invoice_number")}
                        className="col-span-12 sm:col-span-2"
                      >
                        <input
                          id={fieldId(row.id, "invoice_number")}
                          type="text"
                          value={row.invoice_number ?? ""}
                          onChange={(e) =>
                            onUpdate(row.id, "invoice_number", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Invoice #"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Owner"
                        htmlFor={fieldId(row.id, "owner")}
                        className="col-span-12 sm:col-span-3"
                      >
                        <input
                          id={fieldId(row.id, "owner")}
                          type="text"
                          value={row.owner ?? ""}
                          onChange={(e) => onUpdate(row.id, "owner", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          placeholder="Owner"
                        />
                      </LabeledField>

                      <LabeledField
                        label="Cost Type"
                        htmlFor={fieldId(row.id, "costt")}
                        className="col-span-12 sm:col-span-3"
                      >
                        <select
                          id={fieldId(row.id, "costt")}
                          value={row.costt ?? ""}
                          onChange={(e) => onUpdate(row.id, "costt", e.target.value)}
                          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-slate-100 ${
                            !row.costt?.trim()
                              ? "border-amber-400 focus:border-amber-500"
                              : "border-slate-200 focus:border-slate-400"
                          }`}
                        >
                          <option value="">— Select —</option>
                          {COST_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </LabeledField>
                    </>
                  )}

                  <LabeledField
                    label="Bank Desc (Notes)"
                    htmlFor={fieldId(row.id, "notes")}
                    className="col-span-12"
                  >
                    <textarea
                      id={fieldId(row.id, "notes")}
                      value={row.notes ?? ""}
                      onChange={(e) => onUpdate(row.id, "notes", e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      placeholder="Clean bank narration / description"
                    />
                  </LabeledField>
                </div>

                {isExpense && !row.costt?.trim() && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Expense rows need a Cost Type before saving.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LabeledField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function StatChip({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: ChipTone;
}) {
  const tones: Record<ChipTone, string> = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 ${tones[tone]}`}>
      {label}: <b>{value}</b>
    </span>
  );
}