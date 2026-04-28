import { z } from "zod";

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const avatarUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.startsWith("data:image/") || isValidUrl(value),
    "Avatar không hợp lệ."
  );

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(120),
  avatarUrl: avatarUrlSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  avatarUrl: z.union([avatarUrlSchema, z.null()]).optional(),
});