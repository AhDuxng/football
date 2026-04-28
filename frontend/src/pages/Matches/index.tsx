import { useEffect, useMemo, useState } from 'react';

import { useAppState } from '../../hooks/useAppState';
import { matchService } from '../../services/match.service';
import { teamService } from '../../services/team.service';
import type { Match, MatchEvent, MatchEventType, TeamMember } from '../../types';
import { formatDateTime } from '../../utils/format';

const EVENT_TYPES: MatchEventType[] = ['GOAL', 'ASSIST', 'MVP', 'YELLOW_CARD', 'RED_CARD'];

const Matches = () => {
  const { token, teamContext } = useAppState();

  const [matches, setMatches] = useState<Match[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [hallOfFame, setHallOfFame] = useState<
    {
      userId: string;
      fullName: string;
      goals: number;
      assists: number;
      mvp: number;
      score: number;
    }[]
  >([]);
  const [eventsByMatch, setEventsByMatch] = useState<Record<string, MatchEvent[]>>({});

  const [newOpponent, setNewOpponent] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const [completeMatchId, setCompleteMatchId] = useState('');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const [eventMatchId, setEventMatchId] = useState('');
  const [eventUserId, setEventUserId] = useState('');
  const [eventType, setEventType] = useState<MatchEventType>('GOAL');
  const [eventMinute, setEventMinute] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManageMatch = useMemo(() => {
    return teamContext.membership?.teamRole === 'CAPTAIN' || teamContext.membership?.teamRole === 'COACH';
  }, [teamContext.membership?.teamRole]);

  const completedMatches = useMemo(() => matches.filter((match) => match.status === 'COMPLETED'), [matches]);

  const loadAll = async () => {
    if (!token || !teamContext.team) return;

    const [matchData, memberData, hof] = await Promise.all([
      matchService.listTeamMatches(token, teamContext.team.id),
      teamService.getTeamMembers(token, teamContext.team.id),
      matchService.getHallOfFame(token, teamContext.team.id),
    ]);

    setMatches(matchData);
    setMembers(memberData);
    setHallOfFame(
      hof.map((row) => ({
        userId: row.userId,
        fullName: row.fullName,
        goals: row.goals,
        assists: row.assists,
        mvp: row.mvp,
        score: row.score,
      }))
    );
  };

  useEffect(() => {
    if (!token || !teamContext.team) return;

    const load = async () => {
      try {
        await loadAll();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải trung tâm trận đấu.');
      }
    };

    void load();
  }, [token, teamContext.team]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleCreateMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !teamContext.team) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await matchService.createMatch(token, teamContext.team.id, {
        opponentName: newOpponent,
        matchDate: newDate,
        location: newLocation || undefined,
      });

      setNewOpponent('');
      setNewDate('');
      setNewLocation('');
      await loadAll();
      setNotice('Đã tạo trận đấu sắp tới thành công.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo trận đấu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !completeMatchId) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await matchService.completeMatch(token, completeMatchId, {
        homeScore,
        awayScore,
      });
      setCompleteMatchId('');
      setHomeScore(0);
      setAwayScore(0);
      await loadAll();
      setNotice('Đã hoàn tất trận đấu và cập nhật tỷ số.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể hoàn tất trận đấu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !eventMatchId || !eventUserId) return;

    clearMessages();
    setIsSubmitting(true);

    try {
      await matchService.addMatchEvent(token, eventMatchId, {
        userId: eventUserId,
        eventType,
        minute: eventMinute ? Number(eventMinute) : undefined,
      });

      const events = await matchService.listMatchEvents(token, eventMatchId);
      setEventsByMatch((previous) => ({
        ...previous,
        [eventMatchId]: events,
      }));

      setNotice('Đã ghi nhận sự kiện trận đấu thành công.');
      setEventMinute('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể thêm sự kiện.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadEvents = async (matchId: string) => {
    if (!token) return;

    try {
      const events = await matchService.listMatchEvents(token, matchId);
      setEventsByMatch((previous) => ({
        ...previous,
        [matchId]: events,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải sự kiện.');
    }
  };

  if (!teamContext.team) {
    return (
      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-2">Trận đấu</h1>
        <p className="text-sm text-gray-600">Hãy tham gia hoặc tạo đội để quản lý lịch thi đấu và sự kiện.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Trung tâm trận đấu</h1>
        <p className="text-gray-500">Tạo lịch thi đấu, cập nhật tỷ số và ghi nhận sự kiện của cầu thủ.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <form
        onSubmit={handleCreateMatch}
        className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 xl:grid-cols-4 gap-3"
      >
        <input
          placeholder="Đối thủ"
          required
          value={newOpponent}
          onChange={(event) => setNewOpponent(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          required
          value={newDate}
          onChange={(event) => setNewDate(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <input
          placeholder="Địa điểm"
          value={newLocation}
          onChange={(event) => setNewLocation(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!canManageMatch || isSubmitting}
          className="rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2 disabled:opacity-60"
        >
          Tạo trận đấu
        </button>
      </form>

      <form
        onSubmit={handleCompleteMatch}
        className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <select
          required
          value={completeMatchId}
          onChange={(event) => setCompleteMatchId(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Chọn trận sắp tới</option>
          {matches
            .filter((match) => match.status === 'UPCOMING')
            .map((match) => (
              <option key={match.id} value={match.id}>
                {match.opponentName} - {formatDateTime(match.matchDate)}
              </option>
            ))}
        </select>
        <input
          type="number"
          min={0}
          value={homeScore}
          onChange={(event) => setHomeScore(Number(event.target.value))}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Tỷ số đội nhà"
        />
        <input
          type="number"
          min={0}
          value={awayScore}
          onChange={(event) => setAwayScore(Number(event.target.value))}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Tỷ số đội khách"
        />
        <button
          type="submit"
          disabled={!canManageMatch || isSubmitting}
          className="rounded-md bg-white border border-gray-200 text-sm font-semibold px-3 py-2 disabled:opacity-60"
        >
          Hoàn tất trận đấu
        </button>
      </form>

      <form
        onSubmit={handleAddEvent}
        className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 xl:grid-cols-5 gap-3"
      >
        <select
          required
          value={eventMatchId}
          onChange={(event) => setEventMatchId(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Trận đã hoàn tất</option>
          {completedMatches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.opponentName} ({formatDateTime(match.matchDate)})
            </option>
          ))}
        </select>
        <select
          required
          value={eventUserId}
          onChange={(event) => setEventUserId(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Cầu thủ</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.profile.fullName}
            </option>
          ))}
        </select>
        <select
          value={eventType}
          onChange={(event) => setEventType(event.target.value as MatchEventType)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {EVENT_TYPES.map((eventTypeOption) => (
            <option key={eventTypeOption} value={eventTypeOption}>
              {eventTypeOption}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={130}
          value={eventMinute}
          onChange={(event) => setEventMinute(event.target.value)}
          placeholder="Phút"
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!canManageMatch || isSubmitting}
          className="rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2 disabled:opacity-60"
        >
          Thêm sự kiện
        </button>
      </form>

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-dark)]">Danh sách trận đấu</h2>
        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[var(--color-dark)]">
                  {teamContext.team?.name} vs {match.opponentName}
                </p>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{match.status === 'UPCOMING' ? 'Sắp tới' : 'Đã hoàn tất'}</span>
              </div>
              <p className="text-xs text-gray-600">{formatDateTime(match.matchDate)}</p>
              <p className="text-xs text-gray-600">{match.location || 'Chưa đặt địa điểm'}</p>
              {match.status === 'COMPLETED' && (
                <p className="text-sm font-semibold text-[var(--color-dark)]">
                  Tỷ số: {match.homeScore} - {match.awayScore}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleLoadEvents(match.id);
                  }}
                  className="px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs font-semibold"
                >
                  Xem sự kiện
                </button>
              </div>

              {eventsByMatch[match.id] && (
                <div className="pt-2 border-t border-gray-200/80 space-y-1">
                  {eventsByMatch[match.id].length === 0 ? (
                    <p className="text-xs text-gray-500">Chưa có sự kiện nào được ghi nhận cho trận này.</p>
                  ) : (
                    eventsByMatch[match.id].map((eventItem) => (
                      <p key={eventItem.id} className="text-xs text-gray-700">
                        {eventItem.eventType} - {eventItem.player?.full_name || eventItem.userId}{' '}
                        {eventItem.minute !== null ? `(${eventItem.minute}')` : ''}
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-dark)]">Bảng danh dự</h2>
        {hallOfFame.length === 0 ? (
          <p className="text-sm text-gray-600">Chưa có thành tích nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="py-2 pr-3">Cầu thủ</th>
                  <th className="py-2 pr-3">Bàn thắng</th>
                  <th className="py-2 pr-3">Kiến tạo</th>
                  <th className="py-2 pr-3">MVP</th>
                  <th className="py-2 pr-3">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {hallOfFame.map((row) => (
                  <tr key={row.userId} className="border-b border-gray-200/70 last:border-none">
                    <td className="py-2 pr-3 font-semibold text-[var(--color-dark)]">{row.fullName}</td>
                    <td className="py-2 pr-3">{row.goals}</td>
                    <td className="py-2 pr-3">{row.assists}</td>
                    <td className="py-2 pr-3">{row.mvp}</td>
                    <td className="py-2 pr-3 font-semibold">{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
