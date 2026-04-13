import Layout from "@/components/Layout";

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return "₹" + (amount / 100000).toFixed(2) + "L";
  } else if (amount >= 1000) {
    return "₹" + (amount / 1000).toFixed(1) + "K";
  }
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

interface InsightItem {
  icon: string;
  title: string;
  body: string;
  action: string;
}

function InsightCard({
  icon,
  title,
  body,
  action,
  variant,
}: InsightItem & { variant: "red" | "amber" | "green" | "blue" }) {
  const variantClasses = {
    red: "border-l-danger bg-danger-bg",
    amber: "border-l-warning bg-warning-bg",
    green: "border-l-success bg-success-bg",
    blue: "border-l-navy bg-blue-pale",
  };

  return (
    <div className={`border-l-4 ${variantClasses[variant]} rounded-lg p-4 mb-3 flex gap-3`}>
      <div className="text-xl flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-bold text-navy mb-1">{title}</div>
        <div className="text-xs text-blue-mid mb-2">{body}</div>
        <div className="text-xs font-semibold text-navy bg-white/50 px-2 py-1 rounded inline-block">
          → {action}
        </div>
      </div>
    </div>
  );
}

export default function Insights() {
  const critical: InsightItem[] = [
    {
      icon: "🚨",
      title: "Critical Cash Risk — Runway < 3 Months",
      body: "At current burn of ₹71K/month with ₹5L cash, runway is 7.0 months. Monitor closely.",
      action: "Prioritize collecting pending AR. Defer all non-critical payments.",
    },
    {
      icon: "🚨",
      title: "Revenue Concentration Risk — Top 3 Clients = 87.2%",
      body: "Reliance Ltd, Adani Digital, HDFC Digital account for 87.2% of all revenue. Losing any one is catastrophic.",
      action: "Build customer success playbook. Offer 2-year contracts at 10% discount to lock them in.",
    },
  ];

  const warnings: InsightItem[] = [
    {
      icon: "⚠️",
      title: "HR Cost = 46.6% of Revenue (Target: <25%)",
      body: "HR spending ₹295K is 46.6% of total revenue. Personnel costs are the largest single cost driver.",
      action: "Freeze non-critical hires. Each hire needs revenue impact model showing ₹3–5L ARR.",
    },
    {
      icon: "⚠️",
      title: "Marketing ROI Declining",
      body: "Marketing spend increased 3.2× but revenue ROI declined. Need better attribution tracking.",
      action: "Add UTM source tracking. Redirect to proven enterprise outbound channels.",
    },
  ];

  const positive: InsightItem[] = [
    {
      icon: "✅",
      title: "Revenue Growing — 33.3% MoM",
      body: "Revenue trend is positive — growing from ₹120K (Jan) to ₹160K (Mar). Enterprise segment is primary driver.",
      action: "Double down on enterprise segment. Close rate is highest ROI activity.",
    },
    {
      icon: "✅",
      title: "Enterprise Segment = 65.6% of Revenue",
      body: "Enterprise customers generate premium pricing. 3.4× revenue premium vs SMB.",
      action: "Raise enterprise pricing 15–20% at next renewal. Add Premium tier with SLA.",
    },
  ];

  const recommendations: InsightItem[] = [
    {
      icon: "💡",
      title: "Top 5 Actionable Recommendations",
      body: "1. Collect pending AR this week — HDFC Digital (₹160K) highest priority\n2. Fix churn — assign CS owner\n3. Freeze hiring, audit HR — 426% of budget\n4. Kill duplicate monitoring tools — save ₹10K/quarter\n5. Switch SMB to annual contracts — floor at ₹35K/year",
      action: "Monthly savings potential: ₹96K–₹160K from all actions",
    },
  ];

  return (
    <Layout
      title="AI Insights Engine"
      subtitle="Auto-generated from Daily Log rules engine · Updates with every transaction"
    >
      {/* Critical Issues */}
      <div className="mb-6">
        <div className="bg-danger text-white px-6 py-3 rounded-lg mb-3 flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Critical Issues
          </span>
        </div>
        {critical.map((item, idx) => (
          <InsightCard key={idx} {...item} variant="red" />
        ))}
      </div>

      {/* Warnings */}
      <div className="mb-6">
        <div className="bg-warning text-white px-6 py-3 rounded-lg mb-3 flex items-center gap-2">
          <span className="text-lg">⚠</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Warnings
          </span>
        </div>
        {warnings.map((item, idx) => (
          <InsightCard key={idx} {...item} variant="amber" />
        ))}
      </div>

      {/* Positives */}
      <div className="mb-6">
        <div className="bg-success text-white px-6 py-3 rounded-lg mb-3 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Positives
          </span>
        </div>
        {positive.map((item, idx) => (
          <InsightCard key={idx} {...item} variant="green" />
        ))}
      </div>

      {/* Recommendations */}
      <div>
        <div className="bg-navy text-white px-6 py-3 rounded-lg mb-3 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Recommendations
          </span>
        </div>
        {recommendations.map((item, idx) => (
          <InsightCard key={idx} {...item} variant="blue" />
        ))}
      </div>
    </Layout>
  );
}
