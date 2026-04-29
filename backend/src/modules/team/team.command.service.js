import AppError from "../../core/AppError.js";
import { PGRST_NOT_FOUND } from "./team.constants.js";
import { throwTeamDbError } from "./team.db-error.js";

class TeamCommandService {
  constructor({ db, guardService }) {
    this.db = db;
    this.guardService = guardService;
  }

  async createTeam({ userId, name, logo, description }) {
    await this.guardService.ensureUserHasNoTeam(userId);

    const { data: team, error: teamError } = await this.db
      .from("teams")
      .insert({
        name,
        logo: logo ?? null,
        description: description ?? null,
        created_by: userId,
      })
      .select("id, name, logo, description, total_fund, created_by, created_at, updated_at")
      .single();

    throwTeamDbError(teamError, "Không thể tạo đội.", 500);
    const { error: membershipError } = await this.db.from("team_members").insert({
      team_id: team.id,
      user_id: userId,
      team_role: "CAPTAIN",
      preferred_position: "CM",
    });

    if (membershipError) {
      throwTeamDbError(
        membershipError,
        "Đã tạo đội nhưng không thể gán đội trưởng.",
        500
      );    }

    return {
      ...team,
      onboarding: {
        action: "TEAM_CREATED",
        assignedTeamRole: "CAPTAIN",
      },
    };
  }

  async updateTeam(teamId, actorId, actorSystemRole, payload) {
    await this.guardService.assertTeamManager(teamId, actorId, actorSystemRole);

    const updates = {};
    if (payload.name !== undefined) {
      updates.name = payload.name;
    }
    if (payload.logo !== undefined) {
      updates.logo = payload.logo;
    }
    if (payload.description !== undefined) {
      updates.description = payload.description;
    }

    const { data, error } = await this.db
      .from("teams")
      .update(updates)
      .eq("id", teamId)
      .select("id, name, logo, description, total_fund, created_by, created_at, updated_at")
      .single();

    throwTeamDbError(error, "Không thể cập nhật đội.", 500);
    return data;
  }

  async updateMember(teamId, actorId, actorSystemRole, targetUserId, payload) {
    const actorMembership = await this.guardService.assertTeamManager(
      teamId,
      actorId,
      actorSystemRole
    );

    const { data: targetMembership, error: targetMembershipError } = await this.db
      .from("team_members")
      .select("team_id, user_id, team_role, preferred_position")
      .eq("team_id", teamId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetMembershipError && targetMembershipError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(targetMembershipError, "Không thể tải thành viên trong đội.", 500);
    }

    if (!targetMembership) {
      throw new AppError("Không tìm thấy thành viên trong đội.", 404);
    }

    if (
      payload.teamRole === "CAPTAIN" &&
      actorMembership.team_role !== "CAPTAIN" &&
      actorSystemRole !== "ADMIN"
    ) {
      throw new AppError("Chỉ đội trưởng mới có thể thăng chức thành viên khác lên đội trưởng.", 403);
    }

    if (
      payload.teamRole === "TREASURER" &&
      actorMembership.team_role !== "CAPTAIN" &&
      actorSystemRole !== "ADMIN"
    ) {
      throw new AppError("Chỉ đội trưởng mới có thể bổ nhiệm thủ quỹ.", 403);
    }

    if (
      payload.teamRole === "CAPTAIN" &&
      targetMembership.team_role !== "CAPTAIN"
    ) {
      const { count: captainCount, error: captainCountError } = await this.db
        .from("team_members")
        .select("user_id", { head: true, count: "exact" })
        .eq("team_id", teamId)
        .eq("team_role", "CAPTAIN");

      throwTeamDbError(captainCountError, "Không thể kiểm tra số lượng đội trưởng.", 500);

      if ((captainCount ?? 0) >= 1) {
        throw new AppError("Mỗi đội chỉ có một đội trưởng.", 409);
      }
    }

    if (
      targetMembership.team_role === "CAPTAIN" &&
      payload.teamRole &&
      payload.teamRole !== "CAPTAIN"
    ) {
      const { count, error: captainCountError } = await this.db
        .from("team_members")
        .select("user_id", { head: true, count: "exact" })
        .eq("team_id", teamId)
        .eq("team_role", "CAPTAIN");

      throwTeamDbError(captainCountError, "Không thể kiểm tra số lượng đội trưởng.", 500);

      if ((count ?? 0) <= 1) {
        throw new AppError("Phải còn ít nhất một đội trưởng trong đội.", 409);
      }
    }

    const updates = {};
    if (payload.teamRole !== undefined) {
      updates.team_role = payload.teamRole;
    }
    if (payload.preferredPosition !== undefined) {
      updates.preferred_position = payload.preferredPosition;
    }

    const { data, error } = await this.db
      .from("team_members")
      .update(updates)
      .eq("team_id", teamId)
      .eq("user_id", targetUserId)
      .select("team_id, user_id, team_role, preferred_position, joined_at")
      .single();

    throwTeamDbError(error, "Không thể cập nhật thành viên trong đội.", 500);
    return data;
  }

  async upsertTactics(teamId, actorId, actorSystemRole, payload) {
    await this.guardService.assertTeamManager(teamId, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("tactics")
      .upsert(
        {
          team_id: teamId,
          formation: payload.formation,
          instructions: payload.instructions ?? null,
          updated_by: actorId,
        },
        { onConflict: "team_id" }
      )
      .select("id, team_id, formation, instructions, updated_by, created_at, updated_at")
      .single();

    throwTeamDbError(error, "Không thể lưu chiến thuật.", 500);
    return data;
  }
}

export default TeamCommandService;