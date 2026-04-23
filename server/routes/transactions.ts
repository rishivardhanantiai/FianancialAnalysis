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
  const id = req.params.id;
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
