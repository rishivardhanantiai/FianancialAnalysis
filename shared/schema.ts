import { z } from "zod";

export const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(["Revenue", "Expense"]),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  dept: z.string(),
  project: z.string(),
  customer: z.string(),
  ctype: z.string(),
  costt: z.string(),
  owner: z.string(),
  notes: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;
