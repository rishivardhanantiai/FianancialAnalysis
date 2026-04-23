import { createClient } from "@supabase/supabase-js";

type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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
    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ transactions: data ?? [] });
    }

    if (req.method === "POST") {
      const validation = validateTransactionPayload(req.body);
      if (!validation.ok) {
        return res.status(400).json({
          error: "Invalid transaction payload",
          details: validation.error,
        });
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert(validation.value)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ transaction: data });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
}
