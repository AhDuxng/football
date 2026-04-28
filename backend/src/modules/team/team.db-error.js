import AppError from "../../core/AppError.js";

export const throwTeamDbError = (
  error,
  fallbackMessage = "Thao tác cơ sở dữ liệu thất bại.",
  statusCode = 400
) => {
  if (!error) {
    return;
  }

  if (error.code === "23505") {
    throw new AppError(error.message || "Tài nguyên đã tồn tại.", 409, {
      code: error.code,
      details: error.details,
    });
  }

  if (error.code === "23503") {
    throw new AppError(error.message || "Tài nguyên được tham chiếu không tồn tại.", 404, {
      code: error.code,
      details: error.details,
    });
  }

  throw new AppError(error.message || fallbackMessage, statusCode, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
};