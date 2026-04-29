import { z } from "zod";

const uuidSchema = z.string().uuid();
const monthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Tháng phải theo định dạng YYYY-MM");

export const teamIdParamSchema = z.object({
  teamId: uuidSchema,
});

export const teamAndUserParamSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
});

export const financeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createFinanceEntrySchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().min(2).max(500),
});

export const contributionListQuerySchema = z.object({
  month: monthSchema.optional(),
});

export const setMonthlyAmountSchema = z.object({
  month: monthSchema,
  amountPerMember: z.coerce.number().min(0),
  applyToAll: z.coerce.boolean().optional(),
});

export const updateContributionSchema = z
  .object({
    month: monthSchema,
    amount: z.coerce.number().min(0).optional(),
    isPaid: z.boolean().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 1, {
    message: "Cần ít nhất một thay đổi cho đóng quỹ.",
  });