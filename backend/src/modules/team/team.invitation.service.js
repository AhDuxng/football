import AppError from "../../core/AppError.js";
import { PGRST_NOT_FOUND } from "./team.constants.js";
import { throwTeamDbError } from "./team.db-error.js";

class TeamInvitationService {
  constructor({ db, guardService }) {
    this.db = db;
    this.guardService = guardService;
  }

  async createJoinRequest(teamId, senderId, message) {
    await this.guardService.ensureUserHasNoTeam(senderId);
    await this.guardService.ensureTeamExists(teamId);

    const { data: existingRequest, error: existingRequestError } = await this.db
      .from("invitations_requests")
      .select("id")
      .eq("team_id", teamId)
      .eq("sender_id", senderId)
      .eq("type", "REQUEST")
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingRequestError && existingRequestError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(existingRequestError, "Không thể kiểm tra yêu cầu hiện có.", 500);
    }

    if (existingRequest) {
      throw new AppError("Đã tồn tại một yêu cầu tham gia đang chờ cho đội này.", 409);
    }

    const { data: existingInvite, error: existingInviteError } = await this.db
      .from("invitations_requests")
      .select("id")
      .eq("team_id", teamId)
      .eq("receiver_id", senderId)
      .eq("type", "INVITE")
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingInviteError && existingInviteError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(
        existingInviteError,
        "Không thể kiểm tra lời mời hiện có.",
        500
      );
    }

    if (existingInvite) {
      throw new AppError(
        "Bạn đã có một lời mời đang chờ từ đội này. Hãy phản hồi trong hộp thư.",
        409
      );
    }

    const { data: captains, error: captainError } = await this.db
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("team_role", "CAPTAIN")
      .limit(1);

    throwTeamDbError(captainError, "Không thể xác định đội trưởng để chuyển yêu cầu.", 500);

    const captainId = captains?.[0]?.user_id;
    if (!captainId) {
      throw new AppError("Đội này chưa có đội trưởng để duyệt yêu cầu.", 409);
    }

    const { data, error } = await this.db
      .from("invitations_requests")
      .insert({
        sender_id: senderId,
        receiver_id: captainId,
        team_id: teamId,
        type: "REQUEST",
        status: "PENDING",
        message: message ?? null,
      })
      .select(
        "id, sender_id, receiver_id, team_id, type, status, message, created_at, responded_at"
      )
      .single();

    throwTeamDbError(error, "Không thể tạo yêu cầu tham gia.", 500);
    return data;
  }

  async inviteToTeam(teamId, senderId, actorSystemRole, receiverId, message) {
    await this.guardService.assertTeamManager(teamId, senderId, actorSystemRole);
    await this.guardService.ensureUserHasNoTeam(receiverId);

    if (senderId === receiverId) {
      throw new AppError("Bạn không thể tự mời chính mình.", 400);
    }

    const { data: existingInvite, error: existingInviteError } = await this.db
      .from("invitations_requests")
      .select("id")
      .eq("team_id", teamId)
      .eq("receiver_id", receiverId)
      .eq("type", "INVITE")
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingInviteError && existingInviteError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(
        existingInviteError,
        "Không thể kiểm tra lời mời hiện có.",
        500
      );
    }

    if (existingInvite) {
      throw new AppError("Đã tồn tại một lời mời đang chờ cho người dùng này.", 409);
    }

    const { data: existingRequest, error: existingRequestError } = await this.db
      .from("invitations_requests")
      .select("id")
      .eq("team_id", teamId)
      .eq("sender_id", receiverId)
      .eq("type", "REQUEST")
      .eq("status", "PENDING")
      .maybeSingle();

    if (existingRequestError && existingRequestError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(existingRequestError, "Không thể kiểm tra yêu cầu hiện có.", 500);
    }

    if (existingRequest) {
      throw new AppError(
        "Người dùng này đã gửi yêu cầu tham gia. Hãy xem yêu cầu trong hộp thư.",
        409
      );
    }

    const { data, error } = await this.db
      .from("invitations_requests")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        team_id: teamId,
        type: "INVITE",
        status: "PENDING",
        message: message ?? null,
      })
      .select(
        "id, sender_id, receiver_id, team_id, type, status, message, created_at, responded_at"
      )
      .single();

    throwTeamDbError(error, "Không thể gửi lời mời.", 500);
    return data;
  }

  async respondToInvitation(invitationId, actorId, actorSystemRole, payload) {
    const { data: invitation, error: invitationError } = await this.db
      .from("invitations_requests")
      .select(
        "id, sender_id, receiver_id, team_id, type, status, message, created_at, responded_at"
      )
      .eq("id", invitationId)
      .maybeSingle();

    if (invitationError && invitationError.code !== PGRST_NOT_FOUND) {
      throwTeamDbError(invitationError, "Không thể tải lời mời hoặc yêu cầu.", 500);
    }

    if (!invitation) {
      throw new AppError("Không tìm thấy lời mời hoặc yêu cầu.", 404);
    }

    if (invitation.status !== "PENDING") {
      throw new AppError("Lời mời hoặc yêu cầu này đã được xử lý.", 409);
    }

    let joiningUserId;
    if (invitation.type === "INVITE") {
      if (invitation.receiver_id !== actorId && actorSystemRole !== "ADMIN") {
        throw new AppError("Chỉ người được mời mới có thể phản hồi lời mời này.", 403);
      }
      joiningUserId = invitation.receiver_id;
    } else {
      await this.guardService.assertTeamManager(invitation.team_id, actorId, actorSystemRole);
      joiningUserId = invitation.sender_id;
    }

    if (payload.status === "ACCEPTED") {
      await this.guardService.ensureUserHasNoTeam(joiningUserId);

      const { error: memberInsertError } = await this.db.from("team_members").insert({
        team_id: invitation.team_id,
        user_id: joiningUserId,
        team_role: "PLAYER",
        preferred_position: payload.preferredPosition ?? null,
      });

      throwTeamDbError(memberInsertError, "Không thể thêm người dùng vào đội.", 500);    }

    const { data, error } = await this.db
      .from("invitations_requests")
      .update({
        status: payload.status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .select(
        "id, sender_id, receiver_id, team_id, type, status, message, created_at, responded_at"
      )
      .single();

    throwTeamDbError(error, "Không thể cập nhật trạng thái lời mời/yêu cầu.", 500);
    return data;
  }
}

export default TeamInvitationService;