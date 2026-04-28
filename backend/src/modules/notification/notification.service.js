import AppError from "../../core/AppError.js";

class NotificationService {
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

  normalizeInboxRecord(record) {
    return {
      id: record.id,
      senderId: record.sender_id,
      receiverId: record.receiver_id,
      teamId: record.team_id,
      type: record.type,
      status: record.status,
      message: record.message,
      createdAt: record.created_at,
      respondedAt: record.responded_at,
      sender: Array.isArray(record.sender) ? record.sender[0] : record.sender,
      receiver: Array.isArray(record.receiver) ? record.receiver[0] : record.receiver,
      team: Array.isArray(record.team) ? record.team[0] : record.team,
    };
  }

  async getManagedTeamIds(userId) {
    const { data, error } = await this.db
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .in("team_role", ["CAPTAIN", "COACH"]);

    this.throwDbError(error, "Không thể lấy danh sách đội quản lý.", 500);
    return [...new Set(data.map((row) => row.team_id))];
  }

  async getInbox(userId) {
    const baseSelect =
      "id, sender_id, receiver_id, team_id, type, status, message, created_at, responded_at, sender:users!invitations_requests_sender_id_fkey(id, full_name, avatar_url, email), receiver:users!invitations_requests_receiver_id_fkey(id, full_name, avatar_url, email), team:teams(id, name, logo)";

    const [{ data: personalRecords, error: personalError }, managedTeamIds] =
      await Promise.all([
        this.db
          .from("invitations_requests")
          .select(baseSelect)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false }),
        this.getManagedTeamIds(userId),
      ]);

    this.throwDbError(personalError, "Không thể lấy thông báo cá nhân.", 500);
    let managerRequests = [];
    if (managedTeamIds.length > 0) {
      const { data, error } = await this.db
        .from("invitations_requests")
        .select(baseSelect)
        .eq("type", "REQUEST")
        .in("team_id", managedTeamIds)
        .order("created_at", { ascending: false });

      this.throwDbError(error, "Không thể lấy các yêu cầu của đội được quản lý.", 500);
      managerRequests = data;
    }

    const merged = new Map();
    for (const row of [...personalRecords, ...managerRequests]) {
      merged.set(row.id, this.normalizeInboxRecord(row));
    }

    return Array.from(merged.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getPendingCount(userId) {
    const inbox = await this.getInbox(userId);
    return inbox.filter((item) => item.status === "PENDING").length;
  }
}

export default NotificationService;