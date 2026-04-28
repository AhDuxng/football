import { useEffect, useMemo, useState } from 'react';

import { useAppState } from '../../hooks/useAppState';
import { teamService } from '../../services/team.service';
import type { TeamMember } from '../../types';
import { formatDate } from '../../utils/format';

const Tactics = () => {
  const { token, teamContext } = useAppState();

  const [formation, setFormation] = useState('4-4-2');
  const [instructions, setInstructions] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedForTeamA, setSelectedForTeamA] = useState<string[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<
    {
      id: string;
      sessionDate: string;
      teamARoster: { userId: string; fullName: string }[];
      teamBRoster: { userId: string; fullName: string }[];
    }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManageTactics = useMemo(() => {
    return teamContext.membership?.teamRole === 'CAPTAIN' || teamContext.membership?.teamRole === 'COACH';
  }, [teamContext.membership?.teamRole]);

  useEffect(() => {
    if (!token || !teamContext.team) {
      return;
    }

    const load = async () => {
      setError('');

      try {
        const [tacticsData, memberData, sessions] = await Promise.all([
          teamService.getTactics(token, teamContext.team!.id),
          teamService.getTeamMembers(token, teamContext.team!.id),
          teamService.listPracticeSessions(token, teamContext.team!.id),
        ]);

        setMembers(memberData);
        setPracticeSessions(
          sessions.map((session) => ({
            id: session.id,
            sessionDate: session.sessionDate,
            teamARoster: session.teamARoster.map((member) => ({
              userId: member.userId,
              fullName: member.fullName,
            })),
            teamBRoster: session.teamBRoster.map((member) => ({
              userId: member.userId,
              fullName: member.fullName,
            })),
          }))
        );

        if (tacticsData) {
          setFormation(tacticsData.formation);
          setInstructions(tacticsData.instructions || '');
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải mục chiến thuật.');
      }
    };

    void load();
  }, [token, teamContext.team]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleSaveTactics = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !teamContext.team) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.saveTactics(token, teamContext.team.id, {
        formation,
        instructions,
      });
      setNotice('Đã lưu chiến thuật thành công.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu chiến thuật.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshSessions = async () => {
    if (!token || !teamContext.team) return;

    const sessions = await teamService.listPracticeSessions(token, teamContext.team.id);
    setPracticeSessions(
      sessions.map((session) => ({
        id: session.id,
        sessionDate: session.sessionDate,
        teamARoster: session.teamARoster.map((member) => ({
          userId: member.userId,
          fullName: member.fullName,
        })),
        teamBRoster: session.teamBRoster.map((member) => ({
          userId: member.userId,
          fullName: member.fullName,
        })),
      }))
    );
  };

  const handleRandomSplit = async () => {
    if (!token || !teamContext.team) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await teamService.createPracticeSplit(token, teamContext.team.id, {
        mode: 'RANDOM',
      });
      await refreshSessions();
      setNotice('Đã tạo buổi chia đội ngẫu nhiên.');
    } catch (splitError) {
      setError(splitError instanceof Error ? splitError.message : 'Không thể tạo buổi chia đội ngẫu nhiên.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSplit = async () => {
    if (!token || !teamContext.team) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      const teamA = selectedForTeamA;
      const teamB = members
        .map((member) => member.userId)
        .filter((memberId) => !selectedForTeamA.includes(memberId));

      await teamService.createPracticeSplit(token, teamContext.team.id, {
        mode: 'MANUAL',
        teamARoster: teamA,
        teamBRoster: teamB,
      });
      await refreshSessions();
      setNotice('Đã tạo buổi chia đội thủ công.');
    } catch (splitError) {
      setError(splitError instanceof Error ? splitError.message : 'Không thể tạo buổi chia đội thủ công.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!teamContext.team) {
    return (
      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-2">Chiến thuật</h1>
        <p className="text-sm text-gray-600">Bạn cần tham gia hoặc tạo đội trước khi chỉnh sửa chiến thuật.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Chiến thuật và luyện tập</h1>
        <p className="text-gray-500">Đội: {teamContext.team.name}</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <form
        onSubmit={handleSaveTactics}
        className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <label className="space-y-1">
          <span className="text-sm text-gray-600">Sơ đồ đội hình</span>
          <input
            value={formation}
            onChange={(event) => setFormation(event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 lg:col-span-2">
          <span className="text-sm text-gray-600">Chỉ dẫn</span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm min-h-24"
          />
        </label>
        <div className="lg:col-span-3">
          <button
            type="submit"
            disabled={!canManageTactics || isSubmitting}
            className="px-4 py-2.5 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-60"
          >
            Lưu chiến thuật
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Chia đội luyện tập</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleRandomSplit();
              }}
              disabled={!canManageTactics || isSubmitting}
              className="px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold disabled:opacity-60"
            >
              Tạo chia đội ngẫu nhiên
            </button>
            <button
              type="button"
              onClick={() => {
                void handleManualSplit();
              }}
              disabled={!canManageTactics || isSubmitting}
              className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-60"
            >
              Lưu chia đội thủ công
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200/70 rounded-md bg-white p-3">
            {members.map((member) => {
              const selected = selectedForTeamA.includes(member.userId);
              return (
                <label key={member.userId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-[var(--color-dark)]">{member.profile.fullName}</span>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      setSelectedForTeamA((previous) => {
                        if (event.target.checked) {
                          return [...previous, member.userId];
                        }
                        return previous.filter((id) => id !== member.userId);
                      });
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Các buổi đã lưu</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {practiceSessions.length === 0 ? (
              <p className="text-sm text-gray-600">Chưa có buổi chia đội luyện tập nào.</p>
            ) : (
              practiceSessions.map((session) => (
                <div key={session.id} className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-semibold text-[var(--color-dark)]">{formatDate(session.sessionDate)}</p>
                  <p className="text-xs text-gray-600">
                    Team A: {session.teamARoster.map((member) => member.fullName).join(', ') || '-'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Team B: {session.teamBRoster.map((member) => member.fullName).join(', ') || '-'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tactics;
