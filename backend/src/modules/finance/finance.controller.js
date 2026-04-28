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