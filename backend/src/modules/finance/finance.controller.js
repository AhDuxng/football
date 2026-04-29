import { supabaseAdmin } from "../../config/supabase.js";
import catchAsync from "../../core/catchAsync.js";
import sendResponse from "../../core/sendResponse.js";
import FinanceService from "./finance.service.js";

const financeService = new FinanceService({
  db: supabaseAdmin,
});

export const createFinanceEntry = catchAsync(async (req, res) => {
  const result = await financeService.addEntry(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    message: "Đã ghi nhận khoản tài chính thành công.",
    data: result,
  });
});

export const listFinanceEntries = catchAsync(async (req, res) => {
  const result = await financeService.listEntries(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.query.limit
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy danh sách khoản tài chính thành công.",
    data: result,
  });
});

export const listMonthlyContributions = catchAsync(async (req, res) => {
  const result = await financeService.listMonthlyContributions(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.query.month
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy danh sách đóng quỹ theo tháng.",
    data: result,
  });
});

export const setMonthlyAmount = catchAsync(async (req, res) => {
  const result = await financeService.setMonthlyAmount(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã cập nhật mức quỹ theo tháng.",
    data: result,
  });
});

export const updateContribution = catchAsync(async (req, res) => {
  const result = await financeService.updateContribution(
    req.params.teamId,
    req.user.id,
    req.profile.system_role,
    req.params.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Đã cập nhật đóng quỹ.",
    data: result,
  });
});