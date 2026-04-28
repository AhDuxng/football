import AppError from "../../core/AppError.js";
import { PGRST_NOT_FOUND, TEAM_MANAGER_ROLES } from "./team.constants.js";
import { throwTeamDbError } from "./team.db-error.js";

class TeamGuardService {
  constructor({ db }) {
    this.db = db;
  }

  async ensureTeamExists(teamId) {
    const { data, error } = await this.db
      .from("teams")
      .select("id, name, logo, description, total_fund, created_by, created_at, updated_at")
      .eq("id", teamId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(error, "Không thể tải đội.", 500);
    }

    if (!data) {
      throw new AppError("Không tìm thấy đội.", 404);
    }

    return data;
  }

  async getUserMembership(userId) {
    const { data, error } = await this.db
      .from("team_members")
      .select("team_id, user_id, team_role, preferred_position, joined_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(error, "Không thể xác minh tư cách thành viên trong đội.", 500);
    }

    return data ?? null;
  }

  async ensureUserHasNoTeam(userId) {
    const membership = await this.getUserMembership(userId);
    if (membership) {
      throw new AppError("Người dùng đã là thành viên của một đội khác.", 409);
    }
  }

  async assertTeamMember(teamId, userId, actorSystemRole = "USER") {
    if (actorSystemRole === "ADMIN") {
      return {
        team_id: teamId,
        user_id: userId,
        team_role: "CAPTAIN",
      };
    }

    const { data, error } = await this.db
      .from("team_members")
      .select("team_id, user_id, team_role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(error, "Không thể xác minh tư cách thành viên trong đội.", 500);
    }

    if (!data) {
      throw new AppError("Bạn không phải là thành viên của đội này.", 403);
    }

    return data;
  }

  async assertTeamManager(teamId, userId, actorSystemRole = "USER") {
    const membership = await this.assertTeamMember(teamId, userId, actorSystemRole);

    if (!TEAM_MANAGER_ROLES.includes(membership.team_role)) {
      throw new AppError("Chỉ đội trưởng hoặc huấn luyện viên mới có thể thực hiện thao tác này.", 403);
    }

    return membership;
  }
}

export default TeamGuardService;