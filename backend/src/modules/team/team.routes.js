import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { restrictToTeamRoles } from "../../middlewares/roleMiddleware.js";
import validate from "../../middlewares/validate.js";
import {
  createInviteSchema,
  createJoinRequestSchema,
  createPracticeSplitSchema,
  createTeamSchema,
  invitationIdParamSchema,
  respondInvitationSchema,
  teamAndUserParamSchema,
  teamIdParamSchema,
  updateTeamMemberSchema,
  updateTeamSchema,
  upsertTacticsSchema,
} from "./team.validation.js";
import {
  createJoinRequest,
  createPracticeSplit,
  createTeam,
  getMyTeamContext,
  getTactics,
  getTeam,
  inviteToTeam,
  listMembers,
  listPracticeSessions,
  respondToInvitation,
  searchTeams,
  updateTeam,
  updateTeamMember,
  upsertTactics,
} from "./team.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/search", searchTeams);
router.get("/me", getMyTeamContext);
router.patch(
  "/invitations/:invitationId/respond",
  validate(invitationIdParamSchema, "params"),
  validate(respondInvitationSchema),
  respondToInvitation
);

router.post("/", validate(createTeamSchema), createTeam);

router.get("/:teamId", validate(teamIdParamSchema, "params"), getTeam);
router.patch(
  "/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(updateTeamSchema),
  restrictToTeamRoles("CAPTAIN", "COACH"),
  updateTeam
);

router.get("/:teamId/members", validate(teamIdParamSchema, "params"), listMembers);
router.patch(
  "/:teamId/members/:userId",
  validate(teamAndUserParamSchema, "params"),
  validate(updateTeamMemberSchema),
  restrictToTeamRoles("CAPTAIN", "COACH"),
  updateTeamMember
);

router.put(
  "/:teamId/tactics",
  validate(teamIdParamSchema, "params"),
  validate(upsertTacticsSchema),
  restrictToTeamRoles("CAPTAIN", "COACH"),
  upsertTactics
);
router.get("/:teamId/tactics", validate(teamIdParamSchema, "params"), getTactics);

router.post(
  "/:teamId/practice-split",
  validate(teamIdParamSchema, "params"),
  validate(createPracticeSplitSchema),
  restrictToTeamRoles("CAPTAIN", "COACH"),
  createPracticeSplit
);
router.get(
  "/:teamId/practice-sessions",
  validate(teamIdParamSchema, "params"),
  listPracticeSessions
);

router.post(
  "/:teamId/join-requests",
  validate(teamIdParamSchema, "params"),
  validate(createJoinRequestSchema),
  createJoinRequest
);

router.post(
  "/:teamId/invitations",
  validate(teamIdParamSchema, "params"),
  validate(createInviteSchema),
  restrictToTeamRoles("CAPTAIN", "COACH"),
  inviteToTeam
);

export default router;