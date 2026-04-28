import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { getInbox, getPendingCount } from "./notification.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/inbox", getInbox);
router.get("/pending-count", getPendingCount);

export default router;