import AppError from "../../core/AppError.js";

const PGRST_NOT_FOUND = "PGRST116";

class FinanceService {
  constructor({ db }) {
    this.db = db;
  }

  throwDbError(error, fallbackMessage = "Thao tác cơ sở dữ liệu thất bại.", statusCode = 400) {
    if (!error) {
      return;
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

  async assertTeamCaptain(teamId, userId, actorSystemRole = "USER") {
    const membership = await this.assertTeamMember(teamId, userId, actorSystemRole);

    if (membership.team_role !== "CAPTAIN") {
      throw new AppError("Chỉ đội trưởng mới có thể chỉnh sửa tài chính của đội.", 403);
    }

    return membership;
  }

  async getTeamFund(teamId) {
    const { data, error } = await this.db
      .from("teams")
      .select("id, total_fund")
      .eq("id", teamId)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      this.throwDbError(error, "Không thể lấy quỹ đội.", 500);
    }

    if (!data) {
      throw new AppError("Không tìm thấy đội.", 404);
    }

    return data;
  }

  async recalculateAndPersistTeamFund(teamId) {
    const { data: entries, error: listError } = await this.db
      .from("finances")
      .select("amount, type")
      .eq("team_id", teamId);

    this.throwDbError(listError, "Không thể tính lại quỹ đội.", 500);
    const totalFund = entries.reduce((sum, entry) => {
      if (entry.type === "INCOME") {
        return sum + Number(entry.amount);
      }
      return sum - Number(entry.amount);
    }, 0);

    const { error: updateError } = await this.db
      .from("teams")
      .update({ total_fund: totalFund })
      .eq("id", teamId);

    this.throwDbError(updateError, "Không thể cập nhật số dư quỹ đội.", 500);
    return totalFund;
  }

  async addEntry(teamId, actorId, actorSystemRole, payload) {
    await this.assertTeamCaptain(teamId, actorId, actorSystemRole);

    const team = await this.getTeamFund(teamId);
    if (payload.type === "EXPENSE" && Number(team.total_fund) < payload.amount) {
      throw new AppError("Quỹ đội không đủ cho khoản chi này.", 409);
    }

    const { data: entry, error: entryError } = await this.db
      .from("finances")
      .insert({
        team_id: teamId,
        user_id: actorId,
        amount: payload.amount,
        type: payload.type,
        description: payload.description,
      })
      .select("id, team_id, user_id, amount, type, description, created_at")
      .single();

    this.throwDbError(entryError, "Không thể tạo khoản tài chính.", 500);
    const totalFund = await this.recalculateAndPersistTeamFund(teamId);

    return {
      entry,
      totalFund,
    };
  }

  async listEntries(teamId, actorId, actorSystemRole, limit = 50) {
    await this.assertTeamMember(teamId, actorId, actorSystemRole);

    const [{ data: entries, error: entriesError }, team] = await Promise.all([
      this.db
        .from("finances")
        .select(
          "id, team_id, user_id, amount, type, description, created_at, users(id, full_name, avatar_url)"
        )
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(limit),
      this.getTeamFund(teamId),
    ]);

    this.throwDbError(entriesError, "Không thể liệt kê các khoản tài chính.", 500);
    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      users: Array.isArray(entry.users) ? entry.users[0] : entry.users,
    }));

    return {
      totalFund: Number(team.total_fund),
      entries: normalizedEntries,
    };
  }
}

export default FinanceService;