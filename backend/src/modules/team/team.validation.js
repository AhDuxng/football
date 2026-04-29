import { z } from "zod";

const uuidSchema = z.string().uuid();

const positionEnum = z.enum([
  "GK",
  "RB",
  "RWB",
  "CB",
  "LB",
  "LWB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "CF",
  "ST",
]);

export const teamIdParamSchema = z.object({
  teamId: uuidSchema,
});

export const teamAndUserParamSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
});

export const invitationIdParamSchema = z.object({
  invitationId: uuidSchema,
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(120),
  logo: z.string().url().optional(),
  description: z.string().trim().max(1000).optional(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    logo: z.string().url().nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Cần ít nhất một trường của đội để cập nhật.",
  });

export const updateTeamMemberSchema = z
  .object({
    teamRole: z.enum(["CAPTAIN", "COACH", "TREASURER", "PLAYER"]).optional(),
    preferredPosition: positionEnum.nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Cần ít nhất một trường của thành viên để cập nhật.",
  });

export const upsertTacticsSchema = z.object({
  formation: z.string().trim().min(3).max(30),
  instructions: z.string().trim().max(2000).optional(),
});

export const createPracticeSplitSchema = z
  .object({
    sessionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "sessionDate phải theo định dạng YYYY-MM-DD")
      .optional(),
    mode: z.enum(["RANDOM", "MANUAL"]).default("RANDOM"),
    teamARoster: z.array(uuidSchema).optional(),
    teamBRoster: z.array(uuidSchema).optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.mode === "MANUAL") {
      if (!payload.teamARoster || !payload.teamBRoster) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamARoster"],
          message: "teamARoster và teamBRoster là bắt buộc khi ở chế độ MANUAL.",
        });
      }
    }
  });

export const createJoinRequestSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export const createInviteSchema = z.object({
  receiverId: uuidSchema,
  message: z.string().trim().max(500).optional(),
});

export const respondInvitationSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  preferredPosition: positionEnum.optional(),
});