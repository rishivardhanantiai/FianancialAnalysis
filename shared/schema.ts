import { z } from "zod";

export const transactionSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    type: z.enum(["Revenue", "Expense"]),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    dept: z.string(),
    project: z.string(),
    customer: z.string(),
    ctype: z.string(),
    costt: z.string(),
    owner: z.string(),
    notes: z.string().optional(),
    business_unit: z.string().optional(),
    invoice_number: z.string().optional(),
    invoice_url: z.string().optional(),
  })
  .refine(
    (data) => {
      // For Expense type, all fields except notes, customer, and customer type are required
      if (data.type === "Expense") {
        return (
          data.dept.trim().length > 0 &&
          data.project.trim().length > 0 &&
          data.costt.trim().length > 0 &&
          data.owner.trim().length > 0
        );
      }
      // For Revenue type, project, customer, customer type, and owner are required
      if (data.type === "Revenue") {
        return (
          data.project.trim().length > 0 &&
          data.customer.trim().length > 0 &&
          data.ctype.trim().length > 0 &&
          data.owner.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "Check required fields for your transaction type",
      path: ["type"],
    }
  );

export type Transaction = z.infer<typeof transactionSchema>;
