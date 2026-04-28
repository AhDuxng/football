import AppError from "../../core/AppError.js";

const PGRST_NOT_FOUND = "PGRST116";
const TEAM_MANAGER_ROLES = ["CAPTAIN", "COACH"];

class MatchService {
  constructor({ db }) {
    this.db = db;
  }

  throwDbError(error, fallbackMessage = "Thao tác cơ sở dữ liệu thất bại.", statusCode = 400) {
    if (!error) {
      return;
    }

    if (error.code === "23503") {
      throw new AppError(error.message || "Không tìm thấy tài nguyên được tham chiếu.", 404, {
        code: error.code,
        details: error.details,
      });
    }

    throw new AppError(error.message || fallbackMessage, statusCode, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
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
      this.throwDbError(error, "Không thể xác minh tư cách thành viên trong đội.", 500);
    }

    if (!data) {
      throw new AppError("Bạn không phải là thành viên của đội này.", 403);
    }

    return data;
  }

  async assertTeamManager(teamId, userId, actorSystemRole = "USER") {
    const membership = await this.assertTeamMember(teamId, userId, actorSystemRole);

    if (!TEAM_MANAGER_ROLES.includes(membership.team_role)) {
      throw new AppError(
        "Chỉ đội trưởng hoặc huấn luyện viên mới có thể quản lý trận đấu của đội này.",
        403
      );
    }

    return membership;
  }

  async ensureMatchExists(matchId) {
    const { data, error } = await this.db
      .from("matches")
      .select(
        "id, team_id, opponent_name, match_date, location, status, home_score, away_score, created_by, created_at, updated_at"
      )
      .eq("id", matchId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      this.throwDbError(error, "Không thể lấy trận đấu.", 500);
    }

    if (!data) {
      throw new AppError("Không tìm thấy trận đấu.", 404);
    }

    return data;
  }

  async assertPlayerBelongsToTeam(teamId, userId) {
    const { data, error } = await this.db
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      this.throwDbError(error, "Không thể xác thực cầu thủ cho sự kiện trận đấu.", 500);
    }

    if (!data) {
      throw new AppError("Cầu thủ được chọn không phải là thành viên của đội này.", 400);
    }
  }

  async createMatch(teamId, actorId, actorSystemRole, payload) {
    await this.assertTeamManager(teamId, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("matches")
      .insert({
        team_id: teamId,
        opponent_name: payload.opponentName,
        match_date: payload.matchDate.toISOString(),
        location: payload.location ?? null,
        status: "UPCOMING",
        created_by: actorId,
      })
      .select(
        "id, team_id, opponent_name, match_date, location, status, home_score, away_score, created_by, created_at, updated_at"
      )
      .single();

    this.throwDbError(error, "Không thể tạo trận đấu.", 500);
    return data;
  }

  async listTeamMatches(teamId, actorId, actorSystemRole, filters = {}) {
    await this.assertTeamMember(teamId, actorId, actorSystemRole);

    let query = this.db
      .from("matches")
      .select(
        "id, team_id, opponent_name, match_date, location, status, home_score, away_score, created_by, created_at, updated_at"
      )
      .eq("team_id", teamId)
      .order("match_date", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    this.throwDbError(error, "Không thể liệt kê các trận đấu của đội.", 500);
    return data;
  }

  async completeMatch(matchId, actorId, actorSystemRole, payload) {
    const match = await this.ensureMatchExists(matchId);
    await this.assertTeamManager(match.team_id, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("matches")
      .update({
        status: "COMPLETED",
        home_score: payload.homeScore,
        away_score: payload.awayScore,
      })
      .eq("id", matchId)
      .select(
        "id, team_id, opponent_name, match_date, location, status, home_score, away_score, created_by, created_at, updated_at"
      )
      .single();

    this.throwDbError(error, "Không thể hoàn tất trận đấu.", 500);
    return data;
  }

  async addMatchEvent(matchId, actorId, actorSystemRole, payload) {
    const match = await this.ensureMatchExists(matchId);
    await this.assertTeamManager(match.team_id, actorId, actorSystemRole);
    await this.assertPlayerBelongsToTeam(match.team_id, payload.userId);

    const { data, error } = await this.db
      .from("match_events")
      .insert({
        match_id: matchId,
        user_id: payload.userId,
        event_type: payload.eventType,
        minute: payload.minute ?? null,
      })
      .select("id, match_id, user_id, event_type, minute, created_at")
      .single();

    this.throwDbError(error, "Không thể ghi nhận sự kiện trận đấu.", 500);
    return data;
  }

  async listMatchEvents(matchId, actorId, actorSystemRole) {
    const match = await this.ensureMatchExists(matchId);
    await this.assertTeamMember(match.team_id, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("match_events")
      .select(
        "id, match_id, user_id, event_type, minute, created_at, users(id, full_name, avatar_url)"
      )
      .eq("match_id", matchId)
      .order("minute", { ascending: true })
      .order("created_at", { ascending: true });

    this.throwDbError(error, "Không thể lấy sự kiện trận đấu.", 500);
    return data.map((event) => ({
      id: event.id,
      matchId: event.match_id,
      userId: event.user_id,
      eventType: event.event_type,
      minute: event.minute,
      createdAt: event.created_at,
      player: Array.isArray(event.users) ? event.users[0] : event.users,
    }));
  }

  async getHallOfFame(teamId, actorId, actorSystemRole) {
    await this.assertTeamMember(teamId, actorId, actorSystemRole);

    const { data, error } = await this.db
      .from("match_events")
      .select(
        "event_type, user_id, users(id, full_name, avatar_url), matches!inner(team_id)"
      )
      .eq("matches.team_id", teamId);

    this.throwDbError(error, "Không thể tính thống kê bảng danh dự.", 500);
    const statsMap = new Map();

    for (const event of data) {
      const userId = event.user_id;
      const user = Array.isArray(event.users) ? event.users[0] : event.users;

      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          userId,
          fullName: user?.full_name,
          avatarUrl: user?.avatar_url,
          goals: 0,
          assists: 0,
          mvp: 0,
          yellowCards: 0,
          redCards: 0,
          score: 0,
        });
      }

      const row = statsMap.get(userId);

      switch (event.event_type) {
        case "GOAL":
          row.goals += 1;
          row.score += 3;
          break;
        case "ASSIST":
          row.assists += 1;
          row.score += 2;
          break;
        case "MVP":
          row.mvp += 1;
          row.score += 5;
          break;
        case "YELLOW_CARD":
          row.yellowCards += 1;
          row.score -= 1;
          break;
        case "RED_CARD":
          row.redCards += 1;
          row.score -= 2;
          break;
        default:
          break;
      }
    }

    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }
      return b.assists - a.assists;
    });
  }
}

export default MatchService;