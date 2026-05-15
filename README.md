# ANTI AI Financial Center 

A full-stack financial analytics platform for **ANTI AI Private Limited** — built to replace spreadsheets with a real-time, database-backed command center. Every transaction entered in the Daily Log instantly propagates across all dashboards, charts, and KPIs.

---

## Live Demo

**Deployed on Vercel** — [https://financial-analysis-wine.vercel.app](https://financial-analysis-wine.vercel.app)

> Login credentials are required. Contact the admin to receive access.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router 6, TypeScript, Vite |
| **Styling** | TailwindCSS 3, custom CSS design system |
| **Charts** | Chart.js (via `chart.js/auto`) |
| **Backend (Dev)** | Express.js integrated with Vite dev server |
| **Backend (Prod)** | Vercel Serverless Functions (`/api/*`) |
| **Database** | Supabase (PostgreSQL) |
| **Validation** | Zod |
| **Auth** | Local auth context with session persistence |
| **Package Manager** | npm / pnpm |

---

## 📁 Project Structure

```
FinancialAnalysis/
├── client/                   # React SPA frontend
│   ├── pages/
│   │   ├── Index.tsx          # Main app — all tabs/views rendered here
│   │   ├── Login.tsx          # Authentication page
│   │   └── NotFound.tsx       # 404 fallback
│   ├── components/
│   │   ├── Layout.tsx         # Page layout wrapper
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   └── ui/                # Radix UI component library
│   ├── hooks/
│   │   └── useTransactions.ts # Shared hook: fetch/add/delete via API
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state & guard
│   └── global.css             # TailwindCSS theming & global styles
│
├── server/                    # Express dev server
│   ├── index.ts               # App entry with all route registrations
│   ├── routes/
│   │   └── transactions.ts    # GET / POST / DELETE handlers (Supabase SDK)
│   └── lib/
│       └── supabase.ts        # Supabase admin client
│
├── api/                       # Vercel Serverless Functions (production)
│   └── transactions/
│       ├── index.ts           # GET (list) + POST (create)
│       └── [id].ts            # DELETE by transaction ID
│
└── shared/
    ├── api.ts                 # Shared TypeScript interfaces
    └── schema.ts              # Zod validation schema
```

---

## ✨ Features

### 🔐 Authentication
- Password-protected login page
- Auth guard redirects unauthenticated users to `/login`
- Session persisted across page refreshes
- Sign-out from any page via sidebar

---

### 📊 Dashboard — Financial Command Center
The main overview screen with live KPIs computed from all transactions.

**KPI Cards (Row 1)**
- **Total Revenue** — sum of all Revenue transactions
- **Total Expenses** — sum of all Expense transactions
- **Net Profit** — Revenue minus Expenses (colour-coded green/red)
- **Gross Margin %** — Profit / Revenue (target >60%)

**KPI Cards (Row 2)**
- **Contribution Margin** — (Revenue − Variable Costs) / Revenue
- **CAC** — (Marketing + Sales spend) / number of new customers acquired
- **LTV** — Total Revenue / unique customers
- **Runway** — Opening cash / monthly burn rate (months remaining)

**Charts**
- **Revenue vs Expenses bar chart** — auto-grouped by month from Daily Log
- **Department Spend doughnut chart** — expense breakdown per department
- **Cost Mix bars** — Fixed vs Variable cost percentage fill bars
- **Customer Revenue Split bar chart** — top 5 customers by revenue, concentration risk flag

**Health Status Badge** — top bar shows `● Healthy`, `● Warning`, or `● Critical` based on profit, margin, and runway.

---

### 📋 Daily Log — Transaction Entry & Management
The single source of truth. Every row entered here instantly updates every other screen.

**Quick Add Form** (inline, full-width grid)
- Date, Type (Revenue / Expense), Amount
- Department (Marketing / Sales / Finance / HR / Tech / Ops / Management)
- Project, Customer, Customer Type (New / Existing), Cost Type (Fixed / Variable)
- Owner, Notes
- Saves to Supabase on submit — persists across sessions and devices

**Transaction Table**
- All columns: Date, Type, Amount, Dept, Project, Customer, Cust.Type, Cost Type, Owner, Notes
- **Search** — filters across all text fields
- **Type filter** — show All / Revenue / Expense only
- **Delete** — removes from database permanently (with confirm dialog)
- Loading state shown while syncing from server
- Error banner if server is unreachable (fallback demo data displayed)

---

### 📈 Financial Analysis
Month-by-month performance breakdown.

- **Monthly Revenue & Expense Trend** — bar chart, auto-grouped by month
- **Profit Trend** — line chart with colour-coded profit points (green = profit, red = loss)
- **Monthly Performance Table** — Month, Revenue, Expenses, Net Profit, Margin %, Fixed Cost, Variable Cost, Status badge
- **Top Customers by Revenue** — ranked table with % revenue share and customer type tag
- **Marketing ROI Analysis** — monthly Marketing dept spend vs total revenue → ROI multiplier + signal (Excellent / Good / Watch / Poor)

---

### 🗂️ Project Tracker
P&L per project, automatically derived from the `project` field on transactions.

- **Project P&L Summary table** — Revenue, Expenses, Gross Profit, Margin %, Transaction count, Status (Profitable / Cost Only / Loss)
- **Revenue vs Expenses bar chart** — side-by-side per project
- Projects are dynamic — any new project name in transactions appears automatically

---

### 🏢 Department Tracker
Budget allocation vs actual spend per department.

- Budget calculated as a fixed % of total revenue per department (configurable `DEPT_ALLOC` map)
- **Department Budget vs Actual table** — Alloc %, Budget, Actual Spend, Variance, Utilization % (with progress bar), Status
- Status flags: ✓ On Track / ▲ Near Limit / ⚠ Overspend
- **KPI cards** — count of Overspending / Near Limit / On Track departments + total spend
- **Spend Distribution bar chart** — actual spend per department

---

### 🔮 3-Month Forecast
Forward-looking revenue and cash flow projection with editable assumptions.

**Editable Assumption Inputs** (all projections recalculate instantly on change)
- Revenue Growth % (new business rate)
- Expansion Rate % (upsell/cross-sell)
- Churn Rate % (lost revenue)
- Expense Growth % (cost inflation)
- Opening Cash (₹)

**Base values auto-pulled from the most recent month in Daily Log** — not hardcoded.

**Outputs**
- **Revenue Waterfall table** — Opening → +New → +Expansion → −Churn → Closing for each forecast month
- **Expense & Cash Flow table** — Expenses, Net CF, Opening Cash, Closing Cash, Runway per month
- **Projection Chart** — line chart with actual data (solid) + forecast data (dashed) for Revenue, Expenses, and Cash Balance
- **Insight flags** — auto-generated alerts (margin compression, runway warnings, positive cash signals)

---

### 🧠 AI Insights Engine
Auto-generated financial intelligence from the rules engine — updates with every transaction.

**Critical Issues** (red)
- Company overspending alert
- Runway < 3 months warning
- Revenue concentration risk (top 3 clients > 50% of revenue)

**Warnings** (amber)
- Low contribution margin
- HR cost as % of revenue exceeding 25% threshold
- Marketing spend rising while ROI declines
- Management salary escalation during cash constraint

**Positives** (green)
- Month-over-month revenue growth with % and context
- CAC efficiency relative to ₹50K benchmark
- Enterprise vs SMB revenue premium analysis

**Recommendations** (navy)
- Top 5 prioritised actions with estimated monthly savings
- All insights are computed dynamically from real transaction data — no hardcoded text

---

### 💧 Cash Flow Analysis
Running cash position tracking.

**KPI cards** — Total Inflow, Total Outflow, Net Cash Flow, Cash Balance (Opening + Net)

**Charts & Tables**
- **Monthly Cash Flow bar chart** — Inflow (green) vs Outflow (red) side-by-side
- **Monthly Running Balance table** — Month, Inflow, Outflow, Net, Running Balance, Status (Growing / Stable / Depleting)

---

## 🗄️ Database Schema

**Table: `transactions`**

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `date` | text | Transaction date (YYYY-MM-DD) |
| `type` | text | `"Revenue"` or `"Expense"` |
| `amount` | numeric | Transaction amount in ₹ |
| `dept` | text | Department name |
| `project` | text | Project name |
| `customer` | text | Customer name (revenue rows) |
| `ctype` | text | Customer type: `"New"` or `"Existing"` |
| `costt` | text | Cost type: `"Fixed"` or `"Variable"` |
| `owner` | text | Transaction owner/responsible person |
| `notes` | text | Free-text notes |
| `created_at` | timestamptz | Auto-set by Supabase |

All dashboards derive their data from this single unified table.

---

## 🔌 API Routes

### Development (Express)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/transactions` | List all transactions (ordered by date desc) |
| `POST` | `/api/transactions` | Create a new transaction |
| `DELETE` | `/api/transactions/:id` | Delete transaction by UUID |

### Production (Vercel Serverless)
| Method | Route | Handler |
|---|---|---|
| `GET` | `/api/transactions` | `api/transactions/index.ts` |
| `POST` | `/api/transactions` | `api/transactions/index.ts` |
| `DELETE` | `/api/transactions/:id` | `api/transactions/[id].ts` |

Both environments talk to the same Supabase database.

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone the repo
git clone https://github.com/Manan0p/FinancialAnalysis.git
cd FinancialAnalysis

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Start dev server (client + server on port 8080)
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

### Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PING_MESSAGE=ping pong
```

> ⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY` on the client side.** It is server-only.

---

## 🚢 Deployment (Vercel)

```bash
# Build production bundle
npm run build

# Deploy via Vercel CLI
vercel --prod
```

The `vercel.json` routes:
- `/api/*` → Vercel Serverless Functions in `/api/`
- All other routes → `dist/index.html` (SPA fallback)

---

## 📜 Scripts

```bash
npm run dev        # Start Vite + Express dev server
npm run build      # Build production frontend bundle
npm run start      # Start production server
npm run typecheck  # TypeScript type validation
npm run test       # Run Vitest tests
```

---

## 🏗️ Architecture Notes

- **Single data model** — one `transactions` table, all views derived from it. Revenue vs Expense is distinguished by the `type` field only.
- **No React Query / state library** — all data flows through a shared `useTransactions` hook with optimistic updates.
- **Dual backend** — Express for local dev (hot reload), Vercel Functions for production. Both use the same Supabase REST API.
- **Fallback data** — if the API is unreachable on load, the app displays demo transactions so the UI remains usable.
- **Auth is local** — authentication state lives in React context with localStorage persistence. No external auth provider.

---

*Built for ANTI AI Private Limited — Financial Command Center v1.0*
