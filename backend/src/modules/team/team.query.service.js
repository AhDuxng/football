import { PGRST_NOT_FOUND } from "./team.constants.js";
import { throwTeamDbError } from "./team.db-error.js";

class TeamQueryService {
  constructor({ db, guardService }) {
    this.db = db;
    this.guardService = guardService;
  }

  normalizeMembership(membership) {
    if (!membership) {
      return null;
    }

    return {
      teamId: membership.team_id,
      userId: membership.user_id,
      teamRole: membership.team_role,
      preferredPosition: membership.preferred_position,
      joinedAt: membership.joined_at,
    };
  }

  async getMyTeamContext(userId) {
    const membership = await this.guardService.getUserMembership(userId);

    if (!membership) {
      return {
        membership: null,
        team: null,
      };
    }

    const team = await this.getTeam(membership.team_id);

    return {
      membership: this.normalizeMembership(membership),
      team,
    };
  }

  async searchTeams({ query }) {
    let request = this.db
      .from("teams")
      .select("id, name, logo, description, total_fund, created_at")
      .order("name", { ascending: true })
      .limit(30);

    if (query) {
      request = request.ilike("name", `%${query}%`);
    }

    const { data, error } = await request;
    throwTeamDbError(error, "Không thể tìm kiếm các đội.", 500);

    return data;
  }

  async getTeam(teamId) {
    const team = await this.guardService.ensureTeamExists(teamId);

    const [
      { data: tactics, error: tacticsError },
      { count: membersCount, error: membersCountError },
    ] = await Promise.all([
      this.db
        .from("tactics")
        .select("id, team_id, formation, instructions, updated_by, updated_at")
        .eq("team_id", teamId)
        .maybeSingle(),
      this.db
        .from("team_members")
        .select("user_id", { head: true, count: "exact" })
        .eq("team_id", teamId),
    ]);

    if (tacticsError && tacticsError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(tacticsError, "Không thể tải chiến thuật của đội.", 500);
    }

    throwTeamDbError(membersCountError, "Không thể đếm số thành viên của đội.", 500);

    return {
      ...team,
      membersCount: membersCount ?? 0,
      tactics: tactics ?? null,
    };
  }

  async listMembers(teamId) {
    await this.guardService.ensureTeamExists(teamId);

    const { data, error } = await this.db
      .from("team_members")
      .select(
        "team_id, user_id, team_role, preferred_position, joined_at, users(id, email, full_name, avatar_url, system_role)"
      )
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    throwTeamDbError(error, "Không thể lấy danh sách thành viên đội.", 500);

    return data.map((member) => {
      const profile = Array.isArray(member.users) ? member.users[0] : member.users;

      return {
        teamId: member.team_id,
        userId: member.user_id,
        teamRole: member.team_role,
        preferredPosition: member.preferred_position,
        joinedAt: member.joined_at,
        profile,
      };
    });
  }

  async getTactics(teamId, actorId, actorSystemRole) {
    await this.guardService.assertTeamMember(teamId, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("tactics")
      .select("id, team_id, formation, instructions, updated_by, created_at, updated_at")
      .eq("team_id", teamId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(error, "Không thể tải chiến thuật.", 500);
    }

    return data ?? null;
  }

  async listPracticeSessions(teamId, actorId, actorSystemRole) {
    await this.guardService.assertTeamMember(teamId, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("practice_sessions")
      .select(
        "id, team_id, session_date, team_a_roster, team_b_roster, created_by, created_at"
      )
      .eq("team_id", teamId)
      .order("session_date", { ascending: false })
      .limit(25);

    throwTeamDbError(error, "Không thể lấy các buổi luyện tập.", 500);

    return data;
  }
}

export default TeamQueryService;