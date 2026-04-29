import AppError from "../../core/AppError.js";
import { TEAM_FINANCE_ROLES } from "../team/team.constants.js";

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

  async assertFinanceManager(teamId, userId, actorSystemRole = "USER") {
    const membership = await this.assertTeamMember(teamId, userId, actorSystemRole);

    if (!TEAM_FINANCE_ROLES.includes(membership.team_role)) {
      throw new AppError("Chỉ đội trưởng hoặc thủ quỹ mới có thể chỉnh sửa tài chính của đội.", 403);
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

  normalizeMonthInput(value) {
    if (!value) {
      const now = new Date();
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    }

    if (/^\d{4}-\d{2}$/.test(value)) {
      return new Date(`${value}-01T00:00:00.000Z`);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`);
    }

    throw new AppError("Tháng không hợp lệ.", 400);
  }

  formatMonthKey(date) {
    return date.toISOString().slice(0, 10);
  }

  async ensureFundMonth(teamId, monthDate, actorId) {
    const monthKey = this.formatMonthKey(monthDate);

    const { data, error } = await this.db
      .from("team_fund_months")
      .select("id, team_id, month, amount_per_member, created_by, created_at, updated_at")
      .eq("team_id", teamId)
      .eq("month", monthKey)
      .maybeSingle();

    if (error && error.code !== PGRST_NOT_FOUND) {
      this.throwDbError(error, "Không thể tải thông tin quỹ tháng.", 500);
    }

    if (data) {
      return data;
    }

    const { data: created, error: createError } = await this.db
      .from("team_fund_months")
      .insert({
        team_id: teamId,
        month: monthKey,
        amount_per_member: 0,
        created_by: actorId,
      })
      .select("id, team_id, month, amount_per_member, created_by, created_at, updated_at")
      .single();

    this.throwDbError(createError, "Không thể khởi tạo quỹ tháng.", 500);
    return created;
  }

  async ensureContributionRows(teamId, monthKey, amountPerMember, members) {
    const { data: existing, error } = await this.db
      .from("team_fund_contributions")
      .select("id, user_id")
      .eq("team_id", teamId)
      .eq("month", monthKey);

    this.throwDbError(error, "Không thể tải danh sách đóng quỹ.", 500);

    const existingIds = new Set((existing || []).map((row) => row.user_id));
    const missingMembers = members.filter((member) => !existingIds.has(member.user_id));

    if (missingMembers.length === 0) {
      return;
    }

    const payload = missingMembers.map((member) => ({
      team_id: teamId,
      month: monthKey,
      user_id: member.user_id,
      amount: amountPerMember,
    }));

    const { error: insertError } = await this.db
      .from("team_fund_contributions")
      .insert(payload);

    this.throwDbError(insertError, "Không thể tạo danh sách đóng quỹ.", 500);
  }

  async listMonthlyContributions(teamId, actorId, actorSystemRole, monthInput) {
    await this.assertTeamMember(teamId, actorId, actorSystemRole);

    const monthDate = this.normalizeMonthInput(monthInput);
    const monthKey = this.formatMonthKey(monthDate);
    const month = await this.ensureFundMonth(teamId, monthDate, actorId);

    const { data: members, error: membersError } = await this.db
      .from("team_members")
      .select(
        "user_id, team_role, preferred_position, users(id, full_name, avatar_url, email)"
      )
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    this.throwDbError(membersError, "Không thể tải danh sách thành viên.", 500);

    await this.ensureContributionRows(teamId, monthKey, month.amount_per_member, members);

    const { data: contributions, error: contributionsError } = await this.db
      .from("team_fund_contributions")
      .select(
        "id, team_id, month, user_id, finance_entry_id, amount, is_paid, paid_at, note, created_at, updated_at"
      )
      .eq("team_id", teamId)
      .eq("month", monthKey)
      .order("created_at", { ascending: true });

    this.throwDbError(contributionsError, "Không thể tải đóng quỹ theo tháng.", 500);

    const contributionMap = new Map(
      contributions.map((row) => [row.user_id, row])
    );

    const normalizedMembers = members.map((member) => {
      const profile = Array.isArray(member.users) ? member.users[0] : member.users;
      const contribution = contributionMap.get(member.user_id);

      return {
        userId: member.user_id,
        teamRole: member.team_role,
        preferredPosition: member.preferred_position,
        profile,
        amount: Number(contribution?.amount ?? month.amount_per_member ?? 0),
        isPaid: Boolean(contribution?.is_paid),
        paidAt: contribution?.paid_at ?? null,
        note: contribution?.note ?? null,
        financeEntryId: contribution?.finance_entry_id ?? null,
      };
    });

    const expectedAmount = normalizedMembers.reduce((sum, member) => sum + member.amount, 0);
    const collectedAmount = normalizedMembers.reduce(
      (sum, member) => sum + (member.isPaid ? member.amount : 0),
      0
    );

    return {
      month: monthKey,
      amountPerMember: Number(month.amount_per_member),
      members: normalizedMembers,
      totals: {
        expectedAmount,
        collectedAmount,
        outstandingAmount: expectedAmount - collectedAmount,
      },
    };
  }

  async setMonthlyAmount(teamId, actorId, actorSystemRole, payload) {
    await this.assertFinanceManager(teamId, actorId, actorSystemRole);

    const monthDate = this.normalizeMonthInput(payload.month);
    const monthKey = this.formatMonthKey(monthDate);

    const { data: month, error } = await this.db
      .from("team_fund_months")
      .upsert(
        {
          team_id: teamId,
          month: monthKey,
          amount_per_member: payload.amountPerMember,
          created_by: actorId,
        },
        { onConflict: "team_id,month" }
      )
      .select("id, team_id, month, amount_per_member, created_by, created_at, updated_at")
      .single();

    this.throwDbError(error, "Không thể cập nhật mức quỹ tháng.", 500);

    if (payload.applyToAll) {
      const { error: updateError } = await this.db
        .from("team_fund_contributions")
        .update({ amount: payload.amountPerMember })
        .eq("team_id", teamId)
        .eq("month", monthKey)
        .eq("is_paid", false);

      this.throwDbError(updateError, "Không thể áp dụng mức quỹ cho tất cả thành viên.", 500);
    }

    return month;
  }

  async updateContribution(teamId, actorId, actorSystemRole, userId, payload) {
    await this.assertFinanceManager(teamId, actorId, actorSystemRole);

    const monthDate = this.normalizeMonthInput(payload.month);
    const monthKey = this.formatMonthKey(monthDate);

    await this.ensureFundMonth(teamId, monthDate, actorId);

    const { data: contribution, error: contributionError } = await this.db
      .from("team_fund_contributions")
      .select("id, finance_entry_id, amount, is_paid")
      .eq("team_id", teamId)
      .eq("month", monthKey)
      .eq("user_id", userId)
      .maybeSingle();

    this.throwDbError(contributionError, "Không thể tải đóng quỹ của thành viên.", 500);

    if (!contribution) {
      const { error: insertError } = await this.db
        .from("team_fund_contributions")
        .insert({
          team_id: teamId,
          month: monthKey,
          user_id: userId,
          amount: payload.amount ?? 0,
        });

      this.throwDbError(insertError, "Không thể tạo đóng quỹ cho thành viên.", 500);
    } else if (payload.amount !== undefined) {
      const { error: updateError } = await this.db
        .from("team_fund_contributions")
        .update({ amount: payload.amount })
        .eq("id", contribution.id);

      this.throwDbError(updateError, "Không thể cập nhật mức đóng quỹ.", 500);

      if (contribution.is_paid && contribution.finance_entry_id) {
        const { error: updateEntryError } = await this.db
          .from("finances")
          .update({ amount: payload.amount })
          .eq("id", contribution.finance_entry_id);

        this.throwDbError(updateEntryError, "Không thể cập nhật khoản thu quỹ.", 500);
        await this.recalculateAndPersistTeamFund(teamId);
      }
    }

    if (payload.isPaid !== undefined) {
      await this.updateContributionPayment(
        teamId,
        actorId,
        actorSystemRole,
        userId,
        monthKey,
        payload
      );
    }

    return this.listMonthlyContributions(teamId, actorId, actorSystemRole, monthKey);
  }

  async updateContributionPayment(teamId, actorId, actorSystemRole, userId, monthKey, payload) {
    await this.assertFinanceManager(teamId, actorId, actorSystemRole);

    const { data: contribution, error } = await this.db
      .from("team_fund_contributions")
      .select("id, amount, is_paid, finance_entry_id")
      .eq("team_id", teamId)
      .eq("month", monthKey)
      .eq("user_id", userId)
      .maybeSingle();

    this.throwDbError(error, "Không thể tải đóng quỹ của thành viên.", 500);

    if (!contribution) {
      throw new AppError("Không tìm thấy dữ liệu đóng quỹ của thành viên.", 404);
    }

    if (payload.isPaid) {
      if (!payload.note || payload.note.trim().length < 2) {
        throw new AppError("Vui lòng nhập ghi chú cho khoản thu.", 400);
      }

      let financeEntryId = contribution.finance_entry_id;
      if (!financeEntryId) {
        const description = `Thu quỹ tháng ${monthKey.slice(0, 7)} - ${payload.note.trim()}`;
        const { data: entry, error: entryError } = await this.db
          .from("finances")
          .insert({
            team_id: teamId,
            user_id: userId,
            amount: contribution.amount,
            type: "INCOME",
            description,
          })
          .select("id")
          .single();

        this.throwDbError(entryError, "Không thể ghi nhận khoản thu quỹ.", 500);
        financeEntryId = entry.id;
      } else {
        const description = `Thu quỹ tháng ${monthKey.slice(0, 7)} - ${payload.note.trim()}`;
        const { error: updateEntryError } = await this.db
          .from("finances")
          .update({ description })
          .eq("id", financeEntryId);

        this.throwDbError(updateEntryError, "Không thể cập nhật khoản thu quỹ.", 500);
      }

      const { error: updateError } = await this.db
        .from("team_fund_contributions")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          note: payload.note.trim(),
          finance_entry_id: financeEntryId,
        })
        .eq("id", contribution.id);

      this.throwDbError(updateError, "Không thể cập nhật trạng thái đóng quỹ.", 500);
    } else {
      if (contribution.finance_entry_id) {
        const { error: deleteError } = await this.db
          .from("finances")
          .delete()
          .eq("id", contribution.finance_entry_id);

        this.throwDbError(deleteError, "Không thể hủy khoản thu quỹ.", 500);
      }

      const { error: updateError } = await this.db
        .from("team_fund_contributions")
        .update({
          is_paid: false,
          paid_at: null,
          note: payload.note ?? null,
          finance_entry_id: null,
        })
        .eq("id", contribution.id);

      this.throwDbError(updateError, "Không thể cập nhật trạng thái đóng quỹ.", 500);
    }

    await this.recalculateAndPersistTeamFund(teamId);
  }

  async addEntry(teamId, actorId, actorSystemRole, payload) {
    await this.assertFinanceManager(teamId, actorId, actorSystemRole);

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