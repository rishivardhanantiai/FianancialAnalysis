import { RequestHandler } from "express";
import { getSupabaseAdminClient } from "../lib/supabase";

const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return "";
  let str = String(val);
  str = str.replace(/"/g, '""');
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str}"`;
  }
  return str;
};

export const listLogs: RequestHandler = async (req, res) => {
  const userRole = req.headers["x-user-role"] as string;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("transaction_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List logs error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Process logs: mask user identity for CA role
    const processedLogs = (data ?? []).map((log: any) => {
      const isCA = userRole === "ca";
      return {
        id: log.id,
        action: log.action,
        transaction_id: log.transaction_id,
        details: log.details,
        performed_by_email: isCA ? `[Masked (${log.performed_by_role})]` : log.performed_by_email,
        performed_by_role: log.performed_by_role,
        created_at: log.created_at,
      };
    });

    return res.status(200).json({ logs: processedLogs });
  } catch (error) {
    console.error("Unexpected list logs error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load audit logs",
    });
  }
};

export const exportTransactionsCSV: RequestHandler = async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Export transactions db error:", error);
      return res.status(500).json({ error: error.message });
    }

    const headers = [
      "ID",
      "Date",
      "Type",
      "Amount",
      "Business Unit (BU)",
      "Department",
      "Project",
      "Customer",
      "Customer Type",
      "Cost Type",
      "Owner",
      "Invoice Number",
      "Notes",
      "Created At"
    ];

    let csvContent = headers.join(",") + "\n";

    (transactions ?? []).forEach((t: any) => {
      const row = [
        t.id,
        t.date,
        t.type,
        t.amount,
        t.business_unit || "",
        t.dept || "",
        t.project || "",
        t.customer || "",
        t.ctype || "",
        t.costt || "",
        t.owner || "",
        t.invoice_number || "",
        t.notes || "",
        t.created_at
      ];
      csvContent += row.map(escapeCSV).join(",") + "\n";
    });

    const fileName = `MIS_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Unexpected export transactions error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to export transactions",
    });
  }
};

export const exportLogsCSV: RequestHandler = async (req, res) => {
  const userRole = req.headers["x-user-role"] as string;
  const isCA = userRole === "ca";

  try {
    const supabase = getSupabaseAdminClient();
    const { data: logs, error } = await supabase
      .from("transaction_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Export logs db error:", error);
      return res.status(500).json({ error: error.message });
    }

    const headers = [
      "Log ID",
      "Timestamp",
      "Action Type",
      "Transaction ID",
      "Amount (₹)",
      "Transaction Type",
      "Project",
      "Dept/BU",
      "Performed By (Email)",
      "Performed By (Role)"
    ];

    let csvContent = headers.join(",") + "\n";

    (logs ?? []).forEach((log: any) => {
      const details = log.details || {};
      const amount = details.amount !== undefined ? details.amount : "";
      const type = details.type || "";
      const project = details.project || "";
      const dept = details.dept || details.business_unit || "";
      
      const email = isCA ? `[Masked (${log.performed_by_role})]` : log.performed_by_email;

      const row = [
        log.id,
        log.created_at,
        log.action,
        log.transaction_id || "",
        amount,
        type,
        project,
        dept,
        email,
        log.performed_by_role
      ];
      csvContent += row.map(escapeCSV).join(",") + "\n";
    });

    const fileName = `Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Unexpected export logs error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to export audit logs",
    });
  }
};
