import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const seedTransactions = [
  { date: "2026-01-03", type: "Revenue", amount: 120000, dept: "Sales", project: "Enterprise", customer: "Reliance Ltd", ctype: "New", costt: "", owner: "Ankit", notes: "Enterprise annual deal" },
  { date: "2026-01-05", type: "Expense", amount: 18000, dept: "Ops", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "Admin", notes: "Office rent Jan" },
  { date: "2026-01-07", type: "Revenue", amount: 28000, dept: "Sales", project: "SMB", customer: "Infosys SMB", ctype: "New", costt: "", owner: "Priya", notes: "Starter plan signup" },
  { date: "2026-01-08", type: "Expense", amount: 95000, dept: "HR", project: "Hiring", customer: "", ctype: "", costt: "Fixed", owner: "Kavya", notes: "Engineering salaries Jan" },
  { date: "2026-01-10", type: "Expense", amount: 8500, dept: "Marketing", project: "Product Launch", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "Google Ads Jan" },
  { date: "2026-01-12", type: "Revenue", amount: 45000, dept: "Sales", project: "Enterprise", customer: "Tata Digital", ctype: "New", costt: "", owner: "Ankit", notes: "Mid-market deal" },
  { date: "2026-01-14", type: "Expense", amount: 4200, dept: "Tech", project: "Platform", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "AWS hosting Jan" },
  { date: "2026-01-16", type: "Expense", amount: 6000, dept: "Finance", project: "Compliance", customer: "", ctype: "", costt: "Fixed", owner: "CEO", notes: "Legal retainer" },
  { date: "2026-01-18", type: "Revenue", amount: 18000, dept: "Sales", project: "SMB", customer: "Wipro SME", ctype: "Existing", costt: "", owner: "Priya", notes: "Renewal - Starter" },
  { date: "2026-01-20", type: "Expense", amount: 3500, dept: "Marketing", project: "Product Launch", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "LinkedIn Ads Jan" },
  { date: "2026-01-22", type: "Revenue", amount: 35000, dept: "Sales", project: "Enterprise", customer: "HCL Tech", ctype: "Existing", costt: "", owner: "Ankit", notes: "Upsell existing" },
  { date: "2026-01-25", type: "Expense", amount: 1800, dept: "Ops", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "Admin", notes: "SaaS subscriptions" },
  { date: "2026-01-27", type: "Expense", amount: 22000, dept: "Management", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "CEO", notes: "Founder salaries" },
  { date: "2026-01-29", type: "Revenue", amount: 12000, dept: "Sales", project: "SMB", customer: "Mahindra SME", ctype: "New", costt: "", owner: "Ravi", notes: "SMB onboarding" },
  { date: "2026-01-31", type: "Expense", amount: 2800, dept: "Tech", project: "Platform", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "Datadog monitoring" },
  { date: "2026-02-02", type: "Revenue", amount: 135000, dept: "Sales", project: "Enterprise", customer: "Adani Digital", ctype: "New", costt: "", owner: "Ankit", notes: "Enterprise Q1 deal" },
  { date: "2026-02-03", type: "Expense", amount: 18000, dept: "Ops", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "Admin", notes: "Office rent Feb" },
  { date: "2026-02-05", type: "Expense", amount: 98000, dept: "HR", project: "Hiring", customer: "", ctype: "", costt: "Fixed", owner: "Kavya", notes: "Full team salaries Feb" },
  { date: "2026-02-07", type: "Revenue", amount: 28000, dept: "Sales", project: "SMB", customer: "Bajaj Finserv", ctype: "New", costt: "", owner: "Priya", notes: "SMB deal Feb" },
  { date: "2026-02-09", type: "Expense", amount: 12000, dept: "Marketing", project: "Rebrand", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "Brand redesign agency" },
  { date: "2026-02-10", type: "Revenue", amount: 45000, dept: "Sales", project: "Enterprise", customer: "Reliance Ltd", ctype: "Existing", costt: "", owner: "Ankit", notes: "Upsell Reliance" },
  { date: "2026-02-12", type: "Expense", amount: 5500, dept: "Tech", project: "Platform", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "AWS + Cloudflare Feb" },
  { date: "2026-02-14", type: "Revenue", amount: 22000, dept: "Sales", project: "SMB", customer: "Infosys SMB", ctype: "Existing", costt: "", owner: "Priya", notes: "Existing renewal" },
  { date: "2026-02-16", type: "Expense", amount: 6000, dept: "Finance", project: "Compliance", customer: "", ctype: "", costt: "Fixed", owner: "CEO", notes: "Legal retainer Feb" },
  { date: "2026-02-18", type: "Expense", amount: 9000, dept: "Marketing", project: "Product Launch", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "Facebook & Instagram ads" },
  { date: "2026-02-20", type: "Revenue", amount: 15000, dept: "Sales", project: "SMB", customer: "Meesho Seller", ctype: "New", costt: "", owner: "Ravi", notes: "New SMB" },
  { date: "2026-02-22", type: "Expense", amount: 1800, dept: "Ops", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "Admin", notes: "SaaS tools Feb" },
  { date: "2026-02-24", type: "Expense", amount: 25000, dept: "Management", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "CEO", notes: "Founder salaries Feb" },
  { date: "2026-02-26", type: "Revenue", amount: 38000, dept: "Sales", project: "Enterprise", customer: "Tata Digital", ctype: "Existing", costt: "", owner: "Ankit", notes: "Tata expansion" },
  { date: "2026-02-28", type: "Expense", amount: 3200, dept: "Tech", project: "Platform", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "New Relic APM" },
  { date: "2026-03-01", type: "Revenue", amount: 160000, dept: "Sales", project: "Enterprise", customer: "HDFC Digital", ctype: "New", costt: "", owner: "Ankit", notes: "Q1 close - large deal" },
  { date: "2026-03-03", type: "Expense", amount: 18000, dept: "Ops", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "Admin", notes: "Office rent Mar" },
  { date: "2026-03-04", type: "Expense", amount: 102000, dept: "HR", project: "Hiring", customer: "", ctype: "", costt: "Fixed", owner: "Kavya", notes: "Expanded team salaries" },
  { date: "2026-03-05", type: "Revenue", amount: 35000, dept: "Sales", project: "SMB", customer: "Nykaa", ctype: "New", costt: "", owner: "Priya", notes: "SMB enterprise" },
  { date: "2026-03-07", type: "Expense", amount: 15000, dept: "Marketing", project: "Product Launch", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "Launch campaign Mar" },
  { date: "2026-03-09", type: "Revenue", amount: 45000, dept: "Sales", project: "Enterprise", customer: "Adani Digital", ctype: "Existing", costt: "", owner: "Ankit", notes: "Adani expansion" },
  { date: "2026-03-10", type: "Expense", amount: 7200, dept: "Tech", project: "Platform", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "Infrastructure scale-up" },
  { date: "2026-03-12", type: "Revenue", amount: 25000, dept: "Sales", project: "SMB", customer: "Wipro SME", ctype: "Existing", costt: "", owner: "Priya", notes: "Wipro upsell" },
  { date: "2026-03-14", type: "Expense", amount: 6000, dept: "Finance", project: "Compliance", customer: "", ctype: "", costt: "Fixed", owner: "CEO", notes: "Legal retainer Mar" },
  { date: "2026-03-15", type: "Expense", amount: 18000, dept: "Marketing", project: "Product Launch", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "Influencer partnerships" },
  { date: "2026-03-17", type: "Revenue", amount: 30000, dept: "Sales", project: "SMB", customer: "Bajaj Finserv", ctype: "Existing", costt: "", owner: "Ravi", notes: "Bajaj renewal Mar" },
  { date: "2026-03-18", type: "Expense", amount: 1800, dept: "Ops", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "Admin", notes: "Tools Mar" },
  { date: "2026-03-20", type: "Revenue", amount: 55000, dept: "Sales", project: "Enterprise", customer: "Meesho Corp", ctype: "New", costt: "", owner: "Ankit", notes: "Meesho enterprise sign" },
  { date: "2026-03-22", type: "Expense", amount: 28000, dept: "Management", project: "General", customer: "", ctype: "", costt: "Fixed", owner: "CEO", notes: "Salaries + bonus" },
  { date: "2026-03-24", type: "Expense", amount: 8000, dept: "Tech", project: "Rebrand", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "Dev tooling upgrade" },
  { date: "2026-03-26", type: "Revenue", amount: 18000, dept: "Sales", project: "SMB", customer: "HDFC SME", ctype: "New", costt: "", owner: "Priya", notes: "New SMB sign" },
  { date: "2026-03-28", type: "Expense", amount: 5500, dept: "Marketing", project: "Rebrand", customer: "", ctype: "", costt: "Variable", owner: "Priya", notes: "New website design" },
  { date: "2026-03-30", type: "Expense", amount: 4000, dept: "Tech", project: "Platform", customer: "", ctype: "", costt: "Variable", owner: "Ravi", notes: "End of month infra" },
];

async function seed() {
  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to check existing rows: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    console.log(`transactions table already has ${count} rows. Skipping seed to avoid duplicates.`);
    console.log("If you want a full reset seed, clear table first then rerun this script.");
    return;
  }

  const { error: insertError } = await supabase
    .from("transactions")
    .insert(seedTransactions);

  if (insertError) {
    throw new Error(`Failed to insert seed data: ${insertError.message}`);
  }

  console.log(`Seeded ${seedTransactions.length} transactions into Supabase.`);
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
