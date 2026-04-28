import { z } from "zod";

const uuidSchema = z.string().uuid();

export const teamIdParamSchema = z.object({
  teamId: uuidSchema,
});

export const financeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createFinanceEntrySchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().min(2).max(500),
});