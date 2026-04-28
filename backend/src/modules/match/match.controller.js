import { supabaseAdmin } from "../../config/supabase.js";
import catchAsync from "../../core/catchAsync.js";
import sendResponse from "../../core/sendResponse.js";
import MatchService from "./match.service.js";

const matchService = new MatchService({
  db: supabaseAdmin,
});

export const createMatch = catchAsync(async (req, res) => {
  const match = await matchService.createMatch(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Đã tạo trận đấu sắp tới thành công.",
    data: match,
  });
});

export const listTeamMatches = catchAsync(async (req, res) => {
  const matches = await matchService.listTeamMatches(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.query
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy danh sách trận đấu thành công.",
    data: matches,
  });
});

export const completeMatch = catchAsync(async (req, res) => {
  const match = await matchService.completeMatch(
    req.params.matchId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã đánh dấu trận đấu là hoàn tất.",
    data: match,
  });
});

export const addMatchEvent = catchAsync(async (req, res) => {
  const event = await matchService.addMatchEvent(
    req.params.matchId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Đã ghi nhận sự kiện trận đấu thành công.",
    data: event,
  });
});

export const listMatchEvents = catchAsync(async (req, res) => {
  const events = await matchService.listMatchEvents(
    req.params.matchId,
    req.user.id,
    req.profile.system_role
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy sự kiện trận đấu thành công.",
    data: events,
  });
});

export const getHallOfFame = catchAsync(async (req, res) => {
  const hallOfFame = await matchService.getHallOfFame(
    req.params.teamId,
    req.user.id,
    req.profile.system_role
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã tạo bảng danh dự thành công.",
    data: hallOfFame,
  });
});