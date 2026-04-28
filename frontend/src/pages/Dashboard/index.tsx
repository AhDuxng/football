import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useAppState } from '../../hooks/useAppState';
import { financeService } from '../../services/finance.service';
import { matchService } from '../../services/match.service';
import type { FinanceSummary, Match } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const Dashboard = () => {
  const { token, profile, teamContext, pendingInboxCount } = useAppState();

  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !teamContext.team) {
      setUpcomingMatch(null);
      setFinanceSummary(null);
      return;
    }

    const teamId = teamContext.team.id;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [matches, finances] = await Promise.all([
          matchService.listTeamMatches(token, teamId, { status: 'UPCOMING' }),
          financeService.listEntries(token, teamId),
        ]);

        setUpcomingMatch(matches[0] || null);
        setFinanceSummary(finances);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu bảng điều khiển.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [token, teamContext.team]);

  if (!teamContext.team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Chào mừng, {profile?.fullName}</h1>
          <p className="text-gray-500">Bạn đã xác thực nhưng chưa tham gia đội nào.</p>
        </div>

        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-[var(--color-dark)]">Bắt đầu khởi tạo</h2>
          <p className="text-sm text-gray-600">
            Tạo một đội mới với vai trò đội trưởng, hoặc gửi yêu cầu tham gia một đội hiện có.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to={ROUTES.SQUAD}
              className="px-4 py-2.5 rounded-md bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Mở đội hình và khởi tạo
            </Link>
            <Link
              to={ROUTES.INBOX}
              className="px-4 py-2.5 rounded-md bg-white border border-gray-200 text-[var(--color-dark)] font-semibold hover:bg-gray-50 transition-colors"
            >
              Mở hộp thư ({pendingInboxCount})
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Tổng quan</h1>
        <p className="text-gray-500">Bản tóm tắt theo thời gian thực cho {teamContext.team.name}</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
          <h2 className="text-xs font-bold tracking-wider text-gray-500 mb-4">TRẬN TIẾP THEO</h2>

          {isLoading ? (
            <p className="text-sm text-gray-500">Đang tải lịch trận đấu...</p>
          ) : upcomingMatch ? (
            <div className="space-y-3">
              <p className="text-2xl font-bold text-[var(--color-dark)]">
                {teamContext.team.name} vs {upcomingMatch.opponentName}
              </p>
              <p className="text-sm text-gray-600">{formatDateTime(upcomingMatch.matchDate)}</p>
              <p className="text-sm text-gray-600">{upcomingMatch.location || 'Chưa đặt địa điểm'}</p>
              <Link
                to={ROUTES.MATCHES}
                className="inline-flex px-4 py-2 rounded-md bg-white border border-gray-200 text-sm font-semibold text-[var(--color-dark)] hover:bg-gray-50"
              >
                Mở trung tâm trận đấu
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Chưa có trận đấu sắp tới.</p>
              <Link
                to={ROUTES.MATCHES}
                className="inline-flex px-4 py-2 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-dark)]"
              >
                Tạo trận đầu tiên
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 mb-3">THÀNH VIÊN ĐỘI</h3>
            <p className="text-3xl font-black text-[var(--color-dark)]">{teamContext.team.membersCount || 0}</p>
          </div>

          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 mb-3">QUỸ ĐỘI</h3>
            <p className="text-3xl font-black text-[var(--color-dark)]">
              {formatCurrency(financeSummary?.totalFund || teamContext.team.totalFund || 0)}
            </p>
            <Link to={ROUTES.FINANCE} className="text-sm text-[var(--color-primary-dark)] font-medium">
              Mở mục tài chính
            </Link>
          </div>

          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 mb-3">HỘP THƯ CHỜ XỬ LÝ</h3>
            <p className="text-3xl font-black text-[var(--color-dark)]">{pendingInboxCount}</p>
            <Link to={ROUTES.INBOX} className="text-sm text-[var(--color-primary-dark)] font-medium">
              Xem lời mời và yêu cầu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
