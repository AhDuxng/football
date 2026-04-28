import type { ApiResponse } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:5000/api/v1";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
}

const buildHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const normalizeErrorMessage = (payload: unknown, fallbackMessage: string) => {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return fallbackMessage;
};

export const apiRequest = async <T>(
  path: string,
  { method = "GET", token, body }: RequestOptions = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: ApiResponse<T> | { message?: string } | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      normalizeErrorMessage(payload, `Yêu cầu thất bại với mã trạng thái ${response.status}.`)
    );
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Định dạng phản hồi API không hợp lệ.");
  }

  return payload.data;
};