import type { FinanceSummary } from "../types";
import { apiRequest } from "./http";

export const financeService = {
  async listEntries(token: string, teamId: string): Promise<FinanceSummary> {
    const data = await apiRequest<{
      totalFund: number;
      entries: {
        id: string;
        team_id: string;
        user_id: string | null;
        amount: number;
        type: "INCOME" | "EXPENSE";
        description: string;
        created_at: string;
        users?: {
          id: string;
          full_name: string;
          avatar_url: string | null;
        };
      }[];
    }>(`/finances/team/${teamId}`, {
      token,
    });

    return {
      totalFund: data.totalFund,
      entries: data.entries.map((entry) => ({
        id: entry.id,
        teamId: entry.team_id,
        userId: entry.user_id,
        amount: Number(entry.amount),
        type: entry.type,
        description: entry.description,
        createdAt: entry.created_at,
        users: entry.users,
      })),
    };
  },

  async addEntry(
    token: string,
    teamId: string,
    payload: {
      amount: number;
      type: "INCOME" | "EXPENSE";
      description: string;
    }
  ): Promise<void> {
    await apiRequest(`/finances/team/${teamId}`, {
      method: "POST",
      token,
      body: payload,
    });
  },
};