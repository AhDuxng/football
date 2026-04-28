import AppError from "../../core/AppError.js";
import { throwTeamDbError } from "./team.db-error.js";

const shuffleArray = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

class TeamPracticeService {
  constructor({ db, guardService, queryService }) {
    this.db = db;
    this.guardService = guardService;
    this.queryService = queryService;
  }

  buildRosterMember(member) {
    const profile = member.profile || {};

    return {
      userId: member.userId,
      fullName: profile.full_name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      teamRole: member.teamRole,
      preferredPosition: member.preferredPosition,
    };
  }

  validateManualRosters(teamARoster, teamBRoster, allowedUserIds) {
    const allRosterIds = [...teamARoster, ...teamBRoster];
    const uniqueRosterIds = new Set(allRosterIds);

    if (uniqueRosterIds.size !== allRosterIds.length) {
      throw new AppError("Danh sách đội thủ công không được chứa người dùng trùng lặp.", 400);
    }

    for (const memberId of uniqueRosterIds) {
      if (!allowedUserIds.has(memberId)) {
        throw new AppError(
          "Danh sách đội thủ công chỉ được bao gồm thành viên hiện tại của đội.",
          400
        );
      }
    }

    if (uniqueRosterIds.size !== allowedUserIds.size) {
      throw new AppError(
        "Danh sách đội thủ công phải bao gồm mỗi thành viên hiện tại của đội đúng một lần.",
        400
      );
    }
  }

  async createPracticeSplit(teamId, actorId, actorSystemRole, payload) {
    await this.guardService.assertTeamManager(teamId, actorId, actorSystemRole);

    const members = await this.queryService.listMembers(teamId);

    if (members.length < 2) {
      throw new AppError(
        "Cần ít nhất hai thành viên để tạo buổi chia đội luyện tập.",
        400
      );
    }

    let rosterA = [];
    let rosterB = [];

    if (payload.mode === "MANUAL") {
      const teamARoster = payload.teamARoster ?? [];
      const teamBRoster = payload.teamBRoster ?? [];
      const membersById = new Map(members.map((member) => [member.userId, member]));

      this.validateManualRosters(teamARoster, teamBRoster, new Set(membersById.keys()));

      rosterA = teamARoster.map((memberId) =>
        this.buildRosterMember(membersById.get(memberId))
      );
      rosterB = teamBRoster.map((memberId) =>
        this.buildRosterMember(membersById.get(memberId))
      );
    } else {
      const shuffled = shuffleArray(members);
      const splitIndex = Math.ceil(shuffled.length / 2);
      rosterA = shuffled.slice(0, splitIndex).map((member) => this.buildRosterMember(member));
      rosterB = shuffled.slice(splitIndex).map((member) => this.buildRosterMember(member));
    }

    const { data, error } = await this.db
      .from("practice_sessions")
      .insert({
        team_id: teamId,
        session_date: payload.sessionDate ?? new Date().toISOString().slice(0, 10),
        team_a_roster: rosterA,
        team_b_roster: rosterB,
        created_by: actorId,
      })
      .select(
        "id, team_id, session_date, team_a_roster, team_b_roster, created_by, created_at"
      )
      .single();

    throwTeamDbError(error, "Không thể tạo buổi chia đội luyện tập.", 500);

    return data;
  }
}

export default TeamPracticeService;