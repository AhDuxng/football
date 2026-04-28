import type { NotificationItem } from "../types";
import { apiRequest } from "./http";

export const notificationService = {
  async getInbox(token: string): Promise<NotificationItem[]> {
    return apiRequest<NotificationItem[]>("/notifications/inbox", {
      token,
    });
  },

  async getPendingCount(token: string): Promise<number> {
    const data = await apiRequest<{ pendingCount: number }>("/notifications/pending-count", {
      token,
    });

    return data.pendingCount;
  },
};