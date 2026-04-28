import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { restrictToTeamRoles } from "../../middlewares/roleMiddleware.js";
import validate from "../../middlewares/validate.js";
import {
  addMatchEvent,
  completeMatch,
  createMatch,
  getHallOfFame,
  listMatchEvents,
  listTeamMatches,
} from "./match.controller.js";
import {
  completeMatchSchema,
  createMatchEventSchema,
  createMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  teamIdParamSchema,
} from "./match.validation.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/team/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(createMatchSchema),
  restrictToTeamRoles("CAPTAIN", "COACH"),
  createMatch
);

router.get(
  "/team/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(listMatchesQuerySchema, "query"),
  listTeamMatches
);

router.get(
  "/team/:teamId/hall-of-fame",
  validate(teamIdParamSchema, "params"),
  getHallOfFame
);

router.patch(
  "/:matchId/complete",
  validate(matchIdParamSchema, "params"),
  validate(completeMatchSchema),
  completeMatch
);

router.post(
  "/:matchId/events",
  validate(matchIdParamSchema, "params"),
  validate(createMatchEventSchema),
  addMatchEvent
);

router.get("/:matchId/events", validate(matchIdParamSchema, "params"), listMatchEvents);

export default router;