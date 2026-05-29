import { RequestHandler } from "express";
import { transactionSchema } from "../../shared/schema";
import { getSupabaseAdminClient } from "../lib/supabase";
import {
  TransactionCreateRequest,
  TransactionCreateResponse,
  TransactionRecord,
  TransactionsListResponse,
} from "@shared/api";

const TABLE_NAME = "transactions";

function mapRowToTransaction(row: any): TransactionRecord {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: Number(row.amount ?? 0),
    dept: row.dept ?? "",
    project: row.project ?? "",
    customer: row.customer ?? "",
    ctype: row.ctype ?? "",
    costt: row.costt ?? "",
    owner: row.owner ?? "",
    notes: row.notes ?? "",
    business_unit: row.business_unit ?? "",
    invoice_number: row.invoice_number ?? "",
    invoice_url: row.invoice_url ?? "",
    created_at: row.created_at,
  };
}

export const listTransactions: RequestHandler = async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const response: TransactionsListResponse = {
      transactions: (data ?? []).map(mapRowToTransaction),
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to list transactions",
    });
  }
};

export const createTransaction: RequestHandler = async (req, res) => {
  const validation = transactionSchema.safeParse(req.body);
  if (!validation.success) {
    const type = req.body?.type;
    const amount = Number(req.body?.amount);
    const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";

    const missingFields: string[] = [];
    if (!date) missingFields.push("Date");
    if (Number.isNaN(amount) || amount < 0) missingFields.push("Amount");

    if (type === "Expense") {
      if (!req.body?.dept) missingFields.push("Department");
      if (!req.body?.project) missingFields.push("Project");
      if (!req.body?.costt) missingFields.push("Cost Type");
      if (!req.body?.owner) missingFields.push("Owner");
    }

    if (type === "Revenue") {
      if (!req.body?.project) missingFields.push("Project");
      if (!req.body?.customer) missingFields.push("Customer");
      if (!req.body?.ctype) missingFields.push("Customer Type");
      if (!req.body?.owner) missingFields.push("Owner");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Please fill required fields: ${missingFields.join(", ")}`,
      });
    }

    return res.status(400).json({
      error: "Invalid transaction payload",
      details: validation.error.flatten(),
    });
  }

  const payload: TransactionCreateRequest = {
    date: validation.data.date,
    type: validation.data.type,
    amount: validation.data.amount,
    dept: validation.data.dept ?? "",
    project: validation.data.project ?? "",
    customer: validation.data.customer ?? "",
    ctype: validation.data.ctype ?? "",
    costt: validation.data.costt ?? "",
    owner: validation.data.owner ?? "",
    notes: validation.data.notes ?? "",
    business_unit: validation.data.business_unit ?? "",
    invoice_number: validation.data.invoice_number ?? "",
    invoice_url: validation.data.invoice_url ?? "",
  };

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const response: TransactionCreateResponse = {
      transaction: mapRowToTransaction(data),
    };

    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to create transaction",
    });
  }
};

export const deleteTransaction: RequestHandler = async (req, res) => {
  const rawQueryId = req.query?.id;
  const queryId = Array.isArray(rawQueryId) ? rawQueryId[0] : rawQueryId;
  const id = req.params.id ?? queryId;
  if (!id) {
    return res.status(400).json({ error: "Transaction id is required" });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete transaction",
    });
  }
};
export const createBulkTransactions: RequestHandler = async (req, res) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: "An array of transactions is required" });
  }

  const validPayloads: TransactionCreateRequest[] = [];
  const validationErrors: any[] = [];

  // Validate each row using your existing schema
  transactions.forEach((tx, index) => {
    const validation = transactionSchema.safeParse(tx);
    
    if (!validation.success) {
      validationErrors.push({ index, issues: validation.error.flatten() });
    } else {
      validPayloads.push({
        date: validation.data.date,
        type: validation.data.type,
        amount: validation.data.amount,
        dept: validation.data.dept ?? "",
        project: validation.data.project ?? "",
        customer: validation.data.customer ?? "",
        ctype: validation.data.ctype ?? "",
        costt: validation.data.costt ?? "",
        owner: validation.data.owner ?? "",
        notes: validation.data.notes ?? "",
        business_unit: validation.data.business_unit ?? "",
        invoice_number: validation.data.invoice_number ?? "",
        invoice_url: validation.data.invoice_url ?? "",
      });
    }
  });

  // If any row fails validation, reject the whole batch to prevent partial data corruption
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: "Validation failed for some transactions in the bulk upload.",
      details: validationErrors,
    });
  }

  try {
    const supabase = getSupabaseAdminClient();
    
    // Supabase native bulk insert
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(validPayloads)
      .select("*");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const response: TransactionsListResponse = {
      transactions: (data ?? []).map(mapRowToTransaction),
    };

    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to bulk create transactions",
    });
  }
};