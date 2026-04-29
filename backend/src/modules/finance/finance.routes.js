import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { restrictToTeamRoles } from "../../middlewares/roleMiddleware.js";
import validate from "../../middlewares/validate.js";
import {
  createFinanceEntry,
  listFinanceEntries,
  listMonthlyContributions,
  setMonthlyAmount,
  updateContribution,
} from "./finance.controller.js";
import {
  contributionListQuerySchema,
  createFinanceEntrySchema,
  financeListQuerySchema,
  setMonthlyAmountSchema,
  teamIdParamSchema,
  teamAndUserParamSchema,
  updateContributionSchema,
} from "./finance.validation.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/team/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(createFinanceEntrySchema),
  restrictToTeamRoles("CAPTAIN", "TREASURER"),
  createFinanceEntry
);

router.get(
  "/team/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(financeListQuerySchema, "query"),
  listFinanceEntries
);

router.get(
  "/team/:teamId/contributions",
  validate(teamIdParamSchema, "params"),
  validate(contributionListQuerySchema, "query"),
  listMonthlyContributions
);

router.put(
  "/team/:teamId/contributions",
  validate(teamIdParamSchema, "params"),
  validate(setMonthlyAmountSchema),
  restrictToTeamRoles("CAPTAIN", "TREASURER"),
  setMonthlyAmount
);

router.patch(
  "/team/:teamId/contributions/:userId",
  validate(teamAndUserParamSchema, "params"),
  validate(updateContributionSchema),
  restrictToTeamRoles("CAPTAIN", "TREASURER"),
  updateContribution
);

export default router;