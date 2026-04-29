export type SystemRole = "ADMIN" | "USER";
export type TeamRole = "CAPTAIN" | "COACH" | "TREASURER" | "PLAYER";
export type PreferredPosition =
  | "GK"
  | "RB"
  | "RWB"
  | "CB"
  | "LB"
  | "LWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "RM"
  | "LM"
  | "RW"
  | "LW"
  | "CF"
  | "ST";

export type InvitationType = "INVITE" | "REQUEST";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type MatchStatus = "UPCOMING" | "COMPLETED";
export type MatchEventType = "GOAL" | "ASSIST" | "MVP" | "YELLOW_CARD" | "RED_CARD";
export type FinanceType = "INCOME" | "EXPENSE";

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  systemRole: SystemRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  expiresIn: number;
}

export interface AuthResult {
  user: UserProfile;
  session: AuthSession | null;
}

export interface TeamMembership {
  teamId: string;
  userId: string;
  teamRole: TeamRole;
  preferredPosition: PreferredPosition | null;
  joinedAt: string;
}

export interface Tactics {
  id: string;
  teamId: string;
  formation: string;
  instructions: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  totalFund: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  tactics?: Tactics | null;
}

export interface TeamContextData {
  membership: TeamMembership | null;
  team: TeamInfo | null;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  teamRole: TeamRole;
  preferredPosition: PreferredPosition | null;
  joinedAt: string;
  profile: UserProfile;
}

export interface PracticeRosterMember {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  teamRole: TeamRole;
  preferredPosition: PreferredPosition | null;
}

export interface PracticeSession {
  id: string;
  teamId: string;
  sessionDate: string;
  teamARoster: PracticeRosterMember[];
  teamBRoster: PracticeRosterMember[];
  createdBy: string | null;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  senderId: string;
  receiverId: string;
  teamId: string;
  type: InvitationType;
  status: InvitationStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export interface Match {
  id: string;
  teamId: string;
  opponentName: string;
  matchDate: string;
  location: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  userId: string;
  eventType: MatchEventType;
  minute: number | null;
  createdAt: string;
  player?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface HallOfFameEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  goals: number;
  assists: number;
  mvp: number;
  yellowCards: number;
  redCards: number;
  score: number;
}

export interface FinanceEntry {
  id: string;
  teamId: string;
  userId: string | null;
  amount: number;
  type: FinanceType;
  description: string;
  createdAt: string;
  users?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface FinanceSummary {
  totalFund: number;
  entries: FinanceEntry[];
}

export interface FundMemberContribution {
  userId: string;
  teamRole: TeamRole;
  preferredPosition: PreferredPosition | null;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  note: string | null;
  financeEntryId: string | null;
}

export interface FundMonthSummary {
  month: string;
  amountPerMember: number;
  members: FundMemberContribution[];
  totals: {
    expectedAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
  };
}

export interface NotificationItem {
  id: string;
  senderId: string;
  receiverId: string;
  teamId: string;
  type: InvitationType;
  status: InvitationStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  team?: {
    id: string;
    name: string;
    logo: string | null;
  };
}
