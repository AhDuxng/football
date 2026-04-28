import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { restrictToTeamRoles } from "../../middlewares/roleMiddleware.js";
import validate from "../../middlewares/validate.js";
import { createFinanceEntry, listFinanceEntries } from "./finance.controller.js";
import {
  createFinanceEntrySchema,
  financeListQuerySchema,
  teamIdParamSchema,
} from "./finance.validation.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/team/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(createFinanceEntrySchema),
  restrictToTeamRoles("CAPTAIN"),
  createFinanceEntry
);

router.get(
  "/team/:teamId",
  validate(teamIdParamSchema, "params"),
  validate(financeListQuerySchema, "query"),
  listFinanceEntries
);

export default router;