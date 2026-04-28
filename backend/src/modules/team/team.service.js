import TeamCommandService from "./team.command.service.js";
import TeamGuardService from "./team.guard.service.js";
import TeamInvitationService from "./team.invitation.service.js";
import TeamPracticeService from "./team.practice.service.js";
import TeamQueryService from "./team.query.service.js";

class TeamService {
  constructor({ db }) {
    this.guardService = new TeamGuardService({ db });
    this.queryService = new TeamQueryService({
      db,
      guardService: this.guardService,
    });
    this.commandService = new TeamCommandService({
      db,
      guardService: this.guardService,
    });
    this.practiceService = new TeamPracticeService({
      db,
      guardService: this.guardService,
      queryService: this.queryService,
    });
    this.invitationService = new TeamInvitationService({
      db,
      guardService: this.guardService,
    });
  }

  async createTeam({ userId, name, logo, description }) {
    return this.commandService.createTeam({ userId, name, logo, description });
  }

  async searchTeams({ query }) {
    return this.queryService.searchTeams({ query });
  }

  async getMyTeamContext(userId) {
    return this.queryService.getMyTeamContext(userId);
  }

  async getTeam(teamId) {
    return this.queryService.getTeam(teamId);
  }

  async listMembers(teamId) {
    return this.queryService.listMembers(teamId);
  }

  async updateTeam(teamId, actorId, actorSystemRole, payload) {
    return this.commandService.updateTeam(teamId, actorId, actorSystemRole, payload);
  }

  async updateMember(teamId, actorId, actorSystemRole, targetUserId, payload) {
    return this.commandService.updateMember(
      teamId,
      actorId,
      actorSystemRole,
      targetUserId,
      payload
    );
  }

  async upsertTactics(teamId, actorId, actorSystemRole, payload) {
    return this.commandService.upsertTactics(teamId, actorId, actorSystemRole, payload);
  }

  async getTactics(teamId, actorId, actorSystemRole) {
    return this.queryService.getTactics(teamId, actorId, actorSystemRole);
  }

  async listPracticeSessions(teamId, actorId, actorSystemRole) {
    return this.queryService.listPracticeSessions(teamId, actorId, actorSystemRole);
  }

  async createPracticeSplit(teamId, actorId, actorSystemRole, payload) {
    return this.practiceService.createPracticeSplit(
      teamId,
      actorId,
      actorSystemRole,
      payload
    );
  }

  async createJoinRequest(teamId, senderId, message) {
    return this.invitationService.createJoinRequest(teamId, senderId, message);
  }

  async inviteToTeam(teamId, senderId, actorSystemRole, receiverId, message) {
    return this.invitationService.inviteToTeam(
      teamId,
      senderId,
      actorSystemRole,
      receiverId,
      message
    );
  }

  async respondToInvitation(invitationId, actorId, actorSystemRole, payload) {
    return this.invitationService.respondToInvitation(
      invitationId,
      actorId,
      actorSystemRole,
      payload
    );
  }
}

export default TeamService;