import { supabaseAdmin } from "../config/supabase.js";
import AppError from "../core/AppError.js";
import catchAsync from "../core/catchAsync.js";

export const restrictTo = (...allowedSystemRoles) => (req, res, next) => {
  if (!req.profile) {
    return next(new AppError("Không được phép: không tìm thấy hồ sơ người dùng.", 401));
  }

  if (req.profile.system_role === "ADMIN") {
    return next();
  }

  if (!allowedSystemRoles.includes(req.profile.system_role)) {
    return next(
      new AppError("Bị cấm: quyền hệ thống không đủ.", 403)
    );
  }

  return next();
};

export const restrictToTeamRoles = (...allowedTeamRoles) =>
  catchAsync(async (req, res, next) => {
    if (req.profile?.system_role === "ADMIN") {
      return next();
    }

    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;

    if (!teamId) {
      throw new AppError("Cần có teamId để kiểm tra vai trò trong đội.", 400);
    }

    const { data: membership, error } = await supabaseAdmin
      .from("team_members")
      .select("team_id, user_id, team_role")
      .eq("team_id", teamId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new AppError("Không thể xác minh tư cách thành viên trong đội.", 500, {
        code: error.code,
      });
    }

    if (!membership || !allowedTeamRoles.includes(membership.team_role)) {
      throw new AppError("Bị cấm: quyền của vai trò trong đội không đủ.", 403);
    }

    req.membership = membership;
    return next();
  });