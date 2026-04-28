import type {
  PreferredPosition,
  PracticeSession,
  TeamContextData,
  TeamInfo,
  TeamInvitation,
  TeamMember,
  TeamMembership,
  Tactics,
} from "../types";
import { apiRequest } from "./http";

type RawMembership = {
  teamId: string;
  userId: string;
  teamRole: TeamMembership["teamRole"];
  preferredPosition: TeamMembership["preferredPosition"];
  joinedAt: string;
};

type RawTeam = {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  total_fund: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  membersCount?: number;
  tactics?: {
    id: string;
    team_id: string;
    formation: string;
    instructions: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

const toTactics = (raw: RawTeam["tactics"]): Tactics | null => {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    teamId: raw.team_id,
    formation: raw.formation,
    instructions: raw.instructions,
    updatedBy: raw.updated_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
};

const toTeamInfo = (raw: RawTeam): TeamInfo => ({
  id: raw.id,
  name: raw.name,
  logo: raw.logo,
  description: raw.description,
  totalFund: Number(raw.total_fund ?? 0),
  createdBy: raw.created_by,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  membersCount: raw.membersCount,
  tactics: toTactics(raw.tactics),
});

const toMembership = (raw: RawMembership | null): TeamMembership | null => {
  if (!raw) {
    return null;
  }

  return {
    teamId: raw.teamId,
    userId: raw.userId,
    teamRole: raw.teamRole,
    preferredPosition: raw.preferredPosition,
    joinedAt: raw.joinedAt,
  };
};

const toInvitation = (raw: {
  id: string;
  sender_id: string;
  receiver_id: string;
  team_id: string;
  type: TeamInvitation["type"];
  status: TeamInvitation["status"];
  message: string | null;
  created_at: string;
  responded_at: string | null;
}): TeamInvitation => ({
  id: raw.id,
  senderId: raw.sender_id,
  receiverId: raw.receiver_id,
  teamId: raw.team_id,
  type: raw.type,
  status: raw.status,
  message: raw.message,
  createdAt: raw.created_at,
  respondedAt: raw.responded_at,
});

const toTeamMember = (raw: {
  teamId: string;
  userId: string;
  teamRole: TeamMember["teamRole"];
  preferredPosition: TeamMember["preferredPosition"];
  joinedAt: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    system_role: "ADMIN" | "USER";
  };
}): TeamMember => ({
  teamId: raw.teamId,
  userId: raw.userId,
  teamRole: raw.teamRole,
  preferredPosition: raw.preferredPosition,
  joinedAt: raw.joinedAt,
  profile: {
    id: raw.profile.id,
    email: raw.profile.email,
    fullName: raw.profile.full_name,
    avatarUrl: raw.profile.avatar_url,
    systemRole: raw.profile.system_role,
  },
});

const toPracticeSession = (raw: {
  id: string;
  team_id: string;
  session_date: string;
  team_a_roster: PracticeSession["teamARoster"];
  team_b_roster: PracticeSession["teamBRoster"];
  created_by: string | null;
  created_at: string;
}): PracticeSession => ({
  id: raw.id,
  teamId: raw.team_id,
  sessionDate: raw.session_date,
  teamARoster: raw.team_a_roster,
  teamBRoster: raw.team_b_roster,
  createdBy: raw.created_by,
  createdAt: raw.created_at,
});

export const teamService = {
  async getMyTeamContext(token: string): Promise<TeamContextData> {
    const data = await apiRequest<{
      membership: RawMembership | null;
      team: RawTeam | null;
    }>("/teams/me", { token });

    return {
      membership: toMembership(data.membership),
      team: data.team ? toTeamInfo(data.team) : null,
    };
  },

  async searchTeams(token: string, query = ""): Promise<TeamInfo[]> {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }

    const queryString = params.toString();
    const data = await apiRequest<RawTeam[]>(
      `/teams/search${queryString ? `?${queryString}` : ""}`,
      {
        token,
      }
    );

    return data.map(toTeamInfo);
  },

  async createTeam(
    token: string,
    payload: { name: string; logo?: string; description?: string }
  ): Promise<TeamInfo> {
    const data = await apiRequest<RawTeam>("/teams", {
      method: "POST",
      token,
      body: payload,
    });

    return toTeamInfo(data);
  },

  async getTeamMembers(token: string, teamId: string): Promise<TeamMember[]> {
    const data = await apiRequest<
      {
        teamId: string;
        userId: string;
        teamRole: TeamMember["teamRole"];
        preferredPosition: PreferredPosition | null;
        joinedAt: string;
        profile: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          system_role: "ADMIN" | "USER";
        };
      }[]
    >(`/teams/${teamId}/members`, { token });

    return data.map(toTeamMember);
  },

  async updateTeamMember(
    token: string,
    teamId: string,
    userId: string,
    payload: {
      teamRole?: TeamMembership["teamRole"];
      preferredPosition?: TeamMembership["preferredPosition"];
    }
  ): Promise<void> {
    await apiRequest(`/teams/${teamId}/members/${userId}`, {
      method: "PATCH",
      token,
      body: payload,
    });
  },

  async getTactics(token: string, teamId: string): Promise<Tactics | null> {
    const raw = await apiRequest<RawTeam["tactics"]>(`/teams/${teamId}/tactics`, {
      token,
    });

    return toTactics(raw);
  },

  async saveTactics(
    token: string,
    teamId: string,
    payload: { formation: string; instructions?: string }
  ): Promise<Tactics> {
    const raw = await apiRequest<RawTeam["tactics"]>(`/teams/${teamId}/tactics`, {
      method: "PUT",
      token,
      body: payload,
    });

    if (!raw) {
      throw new Error("Failed to persist tactics.");
    }

    return toTactics(raw) as Tactics;
  },

  async createPracticeSplit(
    token: string,
    teamId: string,
    payload: {
      sessionDate?: string;
      mode: "RANDOM" | "MANUAL";
      teamARoster?: string[];
      teamBRoster?: string[];
    }
  ): Promise<PracticeSession> {
    const data = await apiRequest<{
      id: string;
      team_id: string;
      session_date: string;
      team_a_roster: PracticeSession["teamARoster"];
      team_b_roster: PracticeSession["teamBRoster"];
      created_by: string | null;
      created_at: string;
    }>(`/teams/${teamId}/practice-split`, {
      method: "POST",
      token,
      body: payload,
    });

    return toPracticeSession(data);
  },

  async listPracticeSessions(token: string, teamId: string): Promise<PracticeSession[]> {
    const data = await apiRequest<
      {
        id: string;
        team_id: string;
        session_date: string;
        team_a_roster: PracticeSession["teamARoster"];
        team_b_roster: PracticeSession["teamBRoster"];
        created_by: string | null;
        created_at: string;
      }[]
    >(`/teams/${teamId}/practice-sessions`, { token });

    return data.map(toPracticeSession);
  },

  async sendJoinRequest(
    token: string,
    teamId: string,
    message?: string
  ): Promise<TeamInvitation> {
    const data = await apiRequest<{
      id: string;
      sender_id: string;
      receiver_id: string;
      team_id: string;
      type: TeamInvitation["type"];
      status: TeamInvitation["status"];
      message: string | null;
      created_at: string;
      responded_at: string | null;
    }>(`/teams/${teamId}/join-requests`, {
      method: "POST",
      token,
      body: { message },
    });

    return toInvitation(data);
  },

  async inviteToTeam(
    token: string,
    teamId: string,
    payload: { receiverId: string; message?: string }
  ): Promise<TeamInvitation> {
    const data = await apiRequest<{
      id: string;
      sender_id: string;
      receiver_id: string;
      team_id: string;
      type: TeamInvitation["type"];
      status: TeamInvitation["status"];
      message: string | null;
      created_at: string;
      responded_at: string | null;
    }>(`/teams/${teamId}/invitations`, {
      method: "POST",
      token,
      body: payload,
    });

    return toInvitation(data);
  },

  async respondToInvitation(
    token: string,
    invitationId: string,
    payload: {
      status: "ACCEPTED" | "REJECTED";
      preferredPosition?: TeamMembership["preferredPosition"];
    }
  ): Promise<TeamInvitation> {
    const data = await apiRequest<{
      id: string;
      sender_id: string;
      receiver_id: string;
      team_id: string;
      type: TeamInvitation["type"];
      status: TeamInvitation["status"];
      message: string | null;
      created_at: string;
      responded_at: string | null;
    }>(`/teams/invitations/${invitationId}/respond`, {
      method: "PATCH",
      token,
      body: payload,
    });

    return toInvitation(data);
  },
};