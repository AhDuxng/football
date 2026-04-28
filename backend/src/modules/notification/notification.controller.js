import { supabaseAdmin } from "../../config/supabase.js";
import catchAsync from "../../core/catchAsync.js";
import sendResponse from "../../core/sendResponse.js";
import NotificationService from "./notification.service.js";

const notificationService = new NotificationService({
  db: supabaseAdmin,
});

export const getInbox = catchAsync(async (req, res) => {
  const inbox = await notificationService.getInbox(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy hộp thư thông báo thành công.",
    data: inbox,
  });
});

export const getPendingCount = catchAsync(async (req, res) => {
  const pendingCount = await notificationService.getPendingCount(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    message: "Đã lấy số lượng thông báo chờ thành công.",
    data: {
      pendingCount,
    },
  });
});