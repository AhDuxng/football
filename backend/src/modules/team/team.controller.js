import { supabaseAdmin } from "../../config/supabase.js";
import catchAsync from "../../core/catchAsync.js";
import sendResponse from "../../core/sendResponse.js";
import TeamService from "./team.service.js";

const teamService = new TeamService({
  db: supabaseAdmin,
});

export const createTeam = catchAsync(async (req, res) => {
  const team = await teamService.createTeam({
    userId: req.user.id,
    ...req.body,
  });

  sendResponse(res, {
    statusCode: 201,
    message: "Đã tạo đội thành công.",
    data: team,
  });
});

export const searchTeams = catchAsync(async (req, res) => {
  const teams = await teamService.searchTeams({
    query: req.query.q?.trim(),
  });

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy danh sách đội thành công.",
    data: teams,
  });
});

export const getMyTeamContext = catchAsync(async (req, res) => {
  const context = await teamService.getMyTeamContext(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy ngữ cảnh đội hiện tại thành công.",
    data: context,
  });
});

export const getTeam = catchAsync(async (req, res) => {
  const team = await teamService.getTeam(req.params.teamId);

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy chi tiết đội.",
    data: team,
  });
});

export const updateTeam = catchAsync(async (req, res) => {
  const updatedTeam = await teamService.updateTeam(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã cập nhật đội thành công.",
    data: updatedTeam,
  });
});

export const listMembers = catchAsync(async (req, res) => {
  const members = await teamService.listMembers(req.params.teamId);

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy danh sách thành viên đội thành công.",
    data: members,
  });
});

export const updateTeamMember = catchAsync(async (req, res) => {
  const member = await teamService.updateMember(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.params.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã cập nhật thành viên đội thành công.",
    data: member,
  });
});

export const upsertTactics = catchAsync(async (req, res) => {
  const tactics = await teamService.upsertTactics(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lưu chiến thuật thành công.",
    data: tactics,
  });
});

export const getTactics = catchAsync(async (req, res) => {
  const tactics = await teamService.getTactics(
    req.params.teamId,
    req.user.id,
    req.profile.system_role
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy chiến thuật của đội thành công.",
    data: tactics,
  });
});

export const createPracticeSplit = catchAsync(async (req, res) => {
  const session = await teamService.createPracticeSplit(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Đã tạo buổi chia đội luyện tập.",
    data: session,
  });
});

export const listPracticeSessions = catchAsync(async (req, res) => {
  const sessions = await teamService.listPracticeSessions(
    req.params.teamId,
    req.user.id,
    req.profile.system_role
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy danh sách buổi luyện tập thành công.",
    data: sessions,
  });
});

export const createJoinRequest = catchAsync(async (req, res) => {
  const requestEntry = await teamService.createJoinRequest(
    req.params.teamId,
    req.user.id,
    req.body.message
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Đã gửi yêu cầu tham gia thành công.",
    data: requestEntry,
  });
});

export const inviteToTeam = catchAsync(async (req, res) => {
  const invitation = await teamService.inviteToTeam(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body.receiverId,
    req.body.message
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Đã gửi lời mời thành công.",
    data: invitation,
  });
});

export const respondToInvitation = catchAsync(async (req, res) => {
  const result = await teamService.respondToInvitation(
    req.params.invitationId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã ghi nhận phản hồi lời mời/yêu cầu.",
    data: result,
  });
});