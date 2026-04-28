import { useEffect, useMemo, useState } from 'react';

import { useAppState } from '../../hooks/useAppState';
import { notificationService } from '../../services/notification.service';
import { teamService } from '../../services/team.service';
import type { NotificationItem, PreferredPosition, TeamInfo, TeamMember, TeamRole } from '../../types';

const POSITION_OPTIONS: PreferredPosition[] = [
  'GK',
  'RB',
  'RWB',
  'CB',
  'LB',
  'LWB',
  'CDM',
  'CM',
  'CAM',
  'RM',
  'LM',
  'RW',
  'LW',
  'CF',
  'ST',
];

const TEAM_ROLE_OPTIONS: TeamRole[] = ['CAPTAIN', 'COACH', 'PLAYER'];

const Squad = () => {
  const {
    token,
    profile,
    teamContext,
    refreshTeamContext,
    refreshPendingInboxCount,
    refreshAll,
  } = useAppState();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TeamInfo[]>([]);
  const [joinMessage, setJoinMessage] = useState('');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteReceiverId, setInviteReceiverId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const [memberRoleDraft, setMemberRoleDraft] = useState<Record<string, TeamRole>>({});
  const [memberPositionDraft, setMemberPositionDraft] = useState<
    Record<string, PreferredPosition | ''>
  >({});

  const [pendingInvites, setPendingInvites] = useState<NotificationItem[]>([]);

  const canManageRoster = useMemo(() => {
    return teamContext.membership?.teamRole === 'CAPTAIN' || teamContext.membership?.teamRole === 'COACH';
  }, [teamContext.membership?.teamRole]);

  useEffect(() => {
    if (!token || !teamContext.team) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      try {
        const data = await teamService.getTeamMembers(token, teamContext.team!.id);
        setMembers(data);

        const roleDraft: Record<string, TeamRole> = {};
        const positionDraft: Record<string, PreferredPosition | ''> = {};

        data.forEach((member) => {
          roleDraft[member.userId] = member.teamRole;
          positionDraft[member.userId] = member.preferredPosition || '';
        });

        setMemberRoleDraft(roleDraft);
        setMemberPositionDraft(positionDraft);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách thành viên.');
      }
    };

    void loadMembers();
  }, [token, teamContext.team]);

  useEffect(() => {
    if (!token || teamContext.team) {
      setPendingInvites([]);
      return;
    }

    const loadInvites = async () => {
      try {
        const inbox = await notificationService.getInbox(token);
        const invites = inbox.filter(
          (item) =>
            item.type === 'INVITE' &&
            item.status === 'PENDING' &&
            item.receiverId === profile?.id
        );
        setPendingInvites(invites);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải lời mời.');
      }
    };

    void loadInvites();
  }, [token, profile?.id, teamContext.team]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleCreateTeam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.createTeam(token, {
        name: teamName,
        logo: teamLogo || undefined,
        description: teamDescription || undefined,
      });

      await refreshAll();
      setTeamName('');
      setTeamLogo('');
      setTeamDescription('');
      setNotice('Tạo đội thành công. Bạn hiện là đội trưởng.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo đội.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchTeam = async () => {
    if (!token) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      const teams = await teamService.searchTeams(token, searchKeyword);
      setSearchResults(teams);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tìm kiếm đội.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendJoinRequest = async (teamId: string) => {
    if (!token) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.sendJoinRequest(token, teamId, joinMessage || undefined);
      await refreshPendingInboxCount();
      setNotice('Đã gửi yêu cầu tham gia thành công.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể gửi yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondInvite = async (invitationId: string, status: 'ACCEPTED' | 'REJECTED') => {
    if (!token) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.respondToInvitation(token, invitationId, { status });
      await refreshAll();
      setNotice(`Đã ${status.toLowerCase() === 'accepted' ? 'chấp nhận' : 'từ chối'} lời mời thành công.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể phản hồi lời mời.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async (member: TeamMember) => {
    if (!token || !teamContext.team) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.updateTeamMember(token, teamContext.team.id, member.userId, {
        teamRole: memberRoleDraft[member.userId],
        preferredPosition: memberPositionDraft[member.userId] || null,
      });

      await refreshTeamContext();
      const nextMembers = await teamService.getTeamMembers(token, teamContext.team.id);
      setMembers(nextMembers);
      setNotice('Đã cập nhật thành viên thành công.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể cập nhật thành viên.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !teamContext.team) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.inviteToTeam(token, teamContext.team.id, {
        receiverId: inviteReceiverId,
        message: inviteMessage || undefined,
      });

      setInviteReceiverId('');
      setInviteMessage('');
      setNotice('Đã gửi lời mời thành công.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể gửi lời mời.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!teamContext.team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Đội hình và khởi tạo</h1>
          <p className="text-gray-500">Tạo đội hoặc gửi yêu cầu tham gia một đội.</p>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form
            onSubmit={handleCreateTeam}
            className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-4"
          >
            <h2 className="text-lg font-semibold text-[var(--color-dark)]">Tạo đội</h2>
            <input
              placeholder="Tên đội"
              required
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="URL logo (không bắt buộc)"
              value={teamLogo}
              onChange={(event) => setTeamLogo(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Mô tả"
              value={teamDescription}
              onChange={(event) => setTeamDescription(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm min-h-24"
            />
            <button
              disabled={isSubmitting}
              type="submit"
              className="px-4 py-2.5 rounded-md bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
            >
              Tạo đội với vai trò đội trưởng
            </button>
          </form>

          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--color-dark)]">Tìm đội và gửi yêu cầu</h2>
            <div className="flex gap-2">
              <input
                placeholder="Tìm theo tên đội"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  void handleSearchTeam();
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold"
              >
                Tìm kiếm
              </button>
            </div>

            <input
              placeholder="Lời nhắn (không bắt buộc)"
              value={joinMessage}
              onChange={(event) => setJoinMessage(event.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            />

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {searchResults.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-md p-3"
                >
                  <div>
                    <p className="font-semibold text-[var(--color-dark)]">{team.name}</p>
                    <p className="text-xs text-gray-500">{team.description || 'Chưa có mô tả'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSendJoinRequest(team.id);
                    }}
                    className="px-3 py-2 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold"
                  >
                    Gửi yêu cầu tham gia
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Lời mời đang chờ</h2>

          {pendingInvites.length === 0 ? (
            <p className="text-sm text-gray-600">Không có lời mời nào đang chờ. Hãy tìm một đội và gửi yêu cầu tham gia.</p>
          ) : (
            pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white border border-gray-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-[var(--color-dark)]">{invite.team?.name || 'Đội không xác định'}</p>
                  <p className="text-xs text-gray-500">Từ {invite.sender?.full_name || invite.sender?.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleRespondInvite(invite.id, 'REJECTED');
                    }}
                    className="px-3 py-2 rounded-md bg-white border border-gray-200 text-xs font-semibold"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleRespondInvite(invite.id, 'ACCEPTED');
                    }}
                    className="px-3 py-2 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold"
                  >
                    Chấp nhận
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Quản lý đội hình</h1>
        <p className="text-gray-500">
          Đội: {teamContext.team.name} | Vai trò của bạn: {teamContext.membership?.teamRole}
        </p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      {canManageRoster && (
        <form onSubmit={handleInvite} className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <input
            placeholder="UUID người nhận"
            required
            value={inviteReceiverId}
            onChange={(event) => setInviteReceiverId(event.target.value)}
            className="lg:col-span-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Lời nhắn lời mời"
            value={inviteMessage}
            onChange={(event) => setInviteMessage(event.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2"
          >
            Gửi lời mời
          </button>
        </form>
      )}

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-white/60 border-b border-gray-200/70">
            <tr className="text-left text-sm text-gray-600">
              <th className="px-4 py-3">Cầu thủ</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Vị trí ưu tiên</th>
              <th className="px-4 py-3">Ngày vào đội</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-b border-gray-200/60 last:border-none">
                <td className="px-4 py-3 font-semibold text-[var(--color-dark)]">{member.profile.fullName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{member.profile.email}</td>
                <td className="px-4 py-3">
                  <select
                    disabled={!canManageRoster}
                    value={memberRoleDraft[member.userId] || member.teamRole}
                    onChange={(event) =>
                      setMemberRoleDraft((prev) => ({
                        ...prev,
                        [member.userId]: event.target.value as TeamRole,
                      }))
                    }
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                  >
                    {TEAM_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={!canManageRoster}
                    value={memberPositionDraft[member.userId] || ''}
                    onChange={(event) =>
                      setMemberPositionDraft((prev) => ({
                        ...prev,
                        [member.userId]: event.target.value as PreferredPosition | '',
                      }))
                    }
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="">Chưa phân công</option>
                    {POSITION_OPTIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(member.joinedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {canManageRoster ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleUpdateMember(member);
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs font-semibold"
                    >
                      Lưu
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">Chỉ xem</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Squad;
