import { useState, useEffect, useCallback } from "react";
import type { TransactionRecord } from "@shared/api";
import { fetchWithAuth } from "@/lib/api";

export interface UseTransactionsReturn {
  transactions: TransactionRecord[];
  loading: boolean;
  error: string | null;
  addTransaction: (payload: Omit<TransactionRecord, "id" | "created_at">) => Promise<TransactionRecord>;
  deleteTransaction: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/transactions");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      setTransactions(data.transactions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(
    async (payload: Omit<TransactionRecord, "id" | "created_at">): Promise<TransactionRecord> => {
      const res = await fetchWithAuth("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create transaction (${res.status})`);
      }

      const data = await res.json();
      const created: TransactionRecord = data.transaction;
      // Optimistically prepend so UI updates instantly
      setTransactions((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    let res = await fetchWithAuth(`/api/transactions/${id}`, { method: "DELETE" });

    // Some hosts may not resolve dynamic serverless routes like /api/transactions/:id.
    // Retry against index route with query param as a compatibility fallback.
    if (res.status === 404 || res.status === 405) {
      res = await fetchWithAuth(`/api/transactions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Failed to delete transaction (${res.status})`);
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
