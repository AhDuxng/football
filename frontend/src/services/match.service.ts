import type { HallOfFameEntry, Match, MatchEvent, MatchEventType, MatchStatus } from "../types";
import { apiRequest } from "./http";

type RawMatch = {
  id: string;
  team_id: string;
  opponent_name: string;
  match_date: string;
  location: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const toMatch = (raw: RawMatch): Match => ({
  id: raw.id,
  teamId: raw.team_id,
  opponentName: raw.opponent_name,
  matchDate: raw.match_date,
  location: raw.location,
  status: raw.status,
  homeScore: raw.home_score,
  awayScore: raw.away_score,
  createdBy: raw.created_by,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const matchService = {
  async listTeamMatches(
    token: string,
    teamId: string,
    filters?: { status?: MatchStatus }
  ): Promise<Match[]> {
    const params = new URLSearchParams();
    if (filters?.status) {
      params.set("status", filters.status);
    }

    const query = params.toString();
    const data = await apiRequest<RawMatch[]>(
      `/matches/team/${teamId}${query ? `?${query}` : ""}`,
      { token }
    );

    return data.map(toMatch);
  },

  async createMatch(
    token: string,
    teamId: string,
    payload: { opponentName: string; matchDate: string; location?: string }
  ): Promise<Match> {
    const data = await apiRequest<RawMatch>(`/matches/team/${teamId}`, {
      method: "POST",
      token,
      body: payload,
    });

    return toMatch(data);
  },

  async completeMatch(
    token: string,
    matchId: string,
    payload: { homeScore: number; awayScore: number }
  ): Promise<Match> {
    const data = await apiRequest<RawMatch>(`/matches/${matchId}/complete`, {
      method: "PATCH",
      token,
      body: payload,
    });

    return toMatch(data);
  },

  async addMatchEvent(
    token: string,
    matchId: string,
    payload: { userId: string; eventType: MatchEventType; minute?: number }
  ): Promise<MatchEvent> {
    const data = await apiRequest<{
      id: string;
      match_id: string;
      user_id: string;
      event_type: MatchEventType;
      minute: number | null;
      created_at: string;
    }>(`/matches/${matchId}/events`, {
      method: "POST",
      token,
      body: payload,
    });

    return {
      id: data.id,
      matchId: data.match_id,
      userId: data.user_id,
      eventType: data.event_type,
      minute: data.minute,
      createdAt: data.created_at,
    };
  },

  async listMatchEvents(token: string, matchId: string): Promise<MatchEvent[]> {
    return apiRequest<MatchEvent[]>(`/matches/${matchId}/events`, { token });
  },

  async getHallOfFame(token: string, teamId: string): Promise<HallOfFameEntry[]> {
    return apiRequest<HallOfFameEntry[]>(`/matches/team/${teamId}/hall-of-fame`, {
      token,
    });
  },
};