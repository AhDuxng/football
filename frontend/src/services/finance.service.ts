import type { FinanceSummary, FundMonthSummary } from "../types";
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

  async getMonthlyContributions(
    token: string,
    teamId: string,
    month?: string
  ): Promise<FundMonthSummary> {
    const query = month ? `?month=${month}` : "";
    const data = await apiRequest<FundMonthSummary>(
      `/finances/team/${teamId}/contributions${query}`,
      { token }
    );

    return {
      ...data,
      amountPerMember: Number(data.amountPerMember),
      members: data.members.map((member) => ({
        ...member,
        amount: Number(member.amount),
      })),
      totals: {
        expectedAmount: Number(data.totals.expectedAmount),
        collectedAmount: Number(data.totals.collectedAmount),
        outstandingAmount: Number(data.totals.outstandingAmount),
      },
    };
  },

  async setMonthlyAmount(
    token: string,
    teamId: string,
    payload: { month: string; amountPerMember: number; applyToAll?: boolean }
  ) {
    await apiRequest(`/finances/team/${teamId}/contributions`, {
      method: "PUT",
      token,
      body: payload,
    });
  },

  async updateContribution(
    token: string,
    teamId: string,
    userId: string,
    payload: {
      month: string;
      amount?: number;
      isPaid?: boolean;
      note?: string;
    }
  ): Promise<FundMonthSummary> {
    const data = await apiRequest<FundMonthSummary>(
      `/finances/team/${teamId}/contributions/${userId}`,
      {
        method: "PATCH",
        token,
        body: payload,
      }
    );

    return {
      ...data,
      amountPerMember: Number(data.amountPerMember),
      members: data.members.map((member) => ({
        ...member,
        amount: Number(member.amount),
      })),
      totals: {
        expectedAmount: Number(data.totals.expectedAmount),
        collectedAmount: Number(data.totals.collectedAmount),
        outstandingAmount: Number(data.totals.outstandingAmount),
      },
    };
  },
};