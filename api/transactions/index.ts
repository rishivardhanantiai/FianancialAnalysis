type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl, serviceRoleKey };
}

function validateTransactionPayload(body: any) {
  const type = body?.type;
  const amount = Number(body?.amount);
  const date = typeof body?.date === "string" ? body.date.trim() : "";

  if (!date) {
    return { ok: false, error: "Date is required" };
  }

  if (type !== "Revenue" && type !== "Expense") {
    return { ok: false, error: "Type must be Revenue or Expense" };
  }

  if (Number.isNaN(amount) || amount < 0) {
    return { ok: false, error: "Amount must be a positive number" };
  }

  // For Expense type, all fields except notes, customer, and customer type are required
  if (type === "Expense") {
    const dept = typeof body?.dept === "string" ? body.dept.trim() : "";
    const project = typeof body?.project === "string" ? body.project.trim() : "";
    const costt = typeof body?.costt === "string" ? body.costt.trim() : "";
    const owner = typeof body?.owner === "string" ? body.owner.trim() : "";

    const missingFields = [];
    if (!dept) missingFields.push("dept");
    if (!project) missingFields.push("project");
    if (!costt) missingFields.push("costt");
    if (!owner) missingFields.push("owner");

    if (missingFields.length > 0) {
      return { ok: false, error: `For Expense, the following fields are required: ${missingFields.join(", ")}` };
    }
  }

  // For Revenue type, project, customer, customer type, and owner are required
  if (type === "Revenue") {
    const project = typeof body?.project === "string" ? body.project.trim() : "";
    const customer = typeof body?.customer === "string" ? body.customer.trim() : "";
    const ctype = typeof body?.ctype === "string" ? body.ctype.trim() : "";
    const owner = typeof body?.owner === "string" ? body.owner.trim() : "";

    const missingFields = [];
    if (!project) missingFields.push("project");
    if (!customer) missingFields.push("customer");
    if (!ctype) missingFields.push("ctype");
    if (!owner) missingFields.push("owner");

    if (missingFields.length > 0) {
      return { ok: false, error: `For Revenue, the following fields are required: ${missingFields.join(", ")}` };
    }
  }

  return {
    ok: true,
    value: {
      date,
      type,
      amount,
      dept: typeof body?.dept === "string" ? body.dept : "",
      project: typeof body?.project === "string" ? body.project : "",
      customer: typeof body?.customer === "string" ? body.customer : "",
      ctype: typeof body?.ctype === "string" ? body.ctype : "",
      costt: typeof body?.costt === "string" ? body.costt : "",
      owner: typeof body?.owner === "string" ? body.owner : "",
      notes: typeof body?.notes === "string" ? body.notes : "",
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  try {
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    if (req.method === "GET") {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/transactions?select=*&order=date.desc,created_at.desc`,
        { headers },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({ error: errorText || "Failed to fetch transactions" });
      }

      const data = await response.json();
      return res.status(200).json({ transactions: data ?? [] });
    }

    if (req.method === "POST") {
      const validation = validateTransactionPayload(req.body);
      if (!validation.ok) {
        return res.status(400).json({
          error: validation.error,
        });
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/transactions`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify(validation.value),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({ error: errorText || "Failed to create transaction" });
      }

      const rows = await response.json();
      const transaction = Array.isArray(rows) ? rows[0] : rows;

      return res.status(201).json({ transaction });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
}
