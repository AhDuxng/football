import { supabase, supabaseAdmin } from "../../config/supabase.js";
import catchAsync from "../../core/catchAsync.js";
import sendResponse from "../../core/sendResponse.js";
import AuthService from "./auth.service.js";

const authService = new AuthService({
  supabaseClient: supabase,
  supabaseAdminClient: supabaseAdmin,
});

export const signUp = catchAsync(async (req, res) => {
  const result = await authService.signUp(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Đã tạo tài khoản thành công.",
    data: result,
  });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Đăng nhập thành công.",
    data: result,
  });
});

export const me = catchAsync(async (req, res) => {
  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy hồ sơ người dùng đã xác thực.",
    data: {
      user: req.profile,
    },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Đã cập nhật hồ sơ người dùng.",
    data: {
      user,
    },
  });
});