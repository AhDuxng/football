import { z } from "zod";

const uuidSchema = z.string().uuid();

export const teamIdParamSchema = z.object({
  teamId: uuidSchema,
});

export const matchIdParamSchema = z.object({
  matchId: uuidSchema,
});

export const listMatchesQuerySchema = z.object({
  status: z.enum(["UPCOMING", "COMPLETED"]).optional(),
});

export const createMatchSchema = z.object({
  opponentName: z.string().trim().min(2).max(120),
  matchDate: z.coerce.date(),
  location: z.string().trim().max(255).optional(),
});

export const completeMatchSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});

export const createMatchEventSchema = z.object({
  userId: uuidSchema,
  eventType: z.enum(["GOAL", "ASSIST", "MVP", "YELLOW_CARD", "RED_CARD"]),
  minute: z.coerce.number().int().min(0).max(130).optional(),
});