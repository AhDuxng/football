import { ZodError } from "zod";

import { env } from "../config/env.js";
import AppError from "./AppError.js";

const postgresCodeToStatus = {
  "22P02": 400,
  "23503": 409,
  "23505": 409,
};

const formatZodError = (error) =>
  new AppError(
    "Xác thực dữ liệu thất bại.",
    400,
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }))
  );

const isSupabaseError = (error) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (
    typeof error.code === "string" ||
    typeof error.hint === "string" ||
    typeof error.details === "string"
  );
};

const formatSupabaseError = (error) => {
  const statusCode =
    Number(error.statusCode) ||
    Number(error.status) ||
    postgresCodeToStatus[error.code] ||
    400;

  return new AppError(error.message || "Thao tác cơ sở dữ liệu thất bại.", statusCode, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
};

const globalErrorHandler = (error, req, res, next) => {
  let formattedError = error;

  if (error instanceof ZodError) {
    formattedError = formatZodError(error);
  } else if (isSupabaseError(error) && !(error instanceof AppError)) {
    formattedError = formatSupabaseError(error);
  } else if (!(error instanceof AppError)) {
    formattedError = new AppError(error.message || "Lỗi máy chủ nội bộ.", 500);
  }

  const payload = {
    status: formattedError.status,
    message: formattedError.message,
  };

  if (formattedError.details) {
    payload.details = formattedError.details;
  }

  if (env.NODE_ENV !== "production") {
    payload.stack = formattedError.stack;
  }

  res.status(formattedError.statusCode || 500).json(payload);
};

export default globalErrorHandler;