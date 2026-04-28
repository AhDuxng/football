import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import validate from "../../middlewares/validate.js";
import { login, me, signUp, updateProfile } from "./auth.controller.js";
import { loginSchema, signUpSchema, updateProfileSchema } from "./auth.validation.js";

const router = Router();

router.post("/signup", validate(signUpSchema), signUp);
router.post("/login", validate(loginSchema), login);
router.get("/me", authMiddleware, me);
router.put("/profile", authMiddleware, validate(updateProfileSchema), updateProfile);

export default router;