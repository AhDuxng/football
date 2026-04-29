import { useEffect, useMemo, useState } from 'react';

import { useAppState } from '../../hooks/useAppState';
import { financeService } from '../../services/finance.service';
import type { FinanceSummary, FundMonthSummary, TeamRole } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const ROLE_LABELS: Record<TeamRole, string> = {
  CAPTAIN: 'Đội trưởng',
  COACH: 'Huấn luyện viên',
  TREASURER: 'Thủ quỹ',
  PLAYER: 'Cầu thủ',
};

const getCurrentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

const formatMonthLabel = (month: string) => {
  if (!month) return '';
  return `${month.slice(5, 7)}/${month.slice(0, 4)}`;
};

const Finance = () => {
  const { token, teamContext } = useAppState();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [fundMonth, setFundMonth] = useState<FundMonthSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [monthAmount, setMonthAmount] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canEditFinance = useMemo(() => {
    return ['CAPTAIN', 'TREASURER'].includes(teamContext.membership?.teamRole || '');
  }, [teamContext.membership?.teamRole]);

  const applyFundMonth = (data: FundMonthSummary) => {
    setFundMonth(data);
    setMonthAmount(String(data.amountPerMember ?? 0));
    const nextAmounts: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};
    data.members.forEach((member) => {
      nextAmounts[member.userId] = String(member.amount ?? 0);
      nextNotes[member.userId] = member.note ?? '';
    });
    setAmountDrafts(nextAmounts);
    setNoteDrafts(nextNotes);
  };

  const loadSummary = async () => {
    if (!token || !teamContext.team) return;

    const data = await financeService.listEntries(token, teamContext.team.id);
    setSummary(data);
  };

  const loadContributions = async () => {
    if (!token || !teamContext.team) return;

    const data = await financeService.getMonthlyContributions(
      token,
      teamContext.team.id,
      selectedMonth
    );
    applyFundMonth(data);
  };

  useEffect(() => {
    if (!token || !teamContext.team) return;

    const load = async () => {
      try {
        await Promise.all([loadSummary(), loadContributions()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu tài chính.');
      }
    };

    void load();
  }, [token, teamContext.team, selectedMonth]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !teamContext.team) return;

    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await financeService.addEntry(token, teamContext.team.id, {
        amount: Number(amount),
        type,
        description,
      });

      setAmount('');
      setDescription('');
      await loadSummary();
      setNotice('Đã thêm khoản tài chính thành công.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể thêm khoản tài chính.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetMonthlyAmount = async () => {
    if (!token || !teamContext.team) return;

    setError('');
    setNotice('');
    setIsUpdating('month');

    try {
      await financeService.setMonthlyAmount(token, teamContext.team.id, {
        month: selectedMonth,
        amountPerMember: Number(monthAmount || 0),
        applyToAll,
      });

      await loadContributions();
      setNotice('Đã cập nhật mức quỹ tháng.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật quỹ tháng.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateMemberAmount = async (userId: string) => {
    if (!token || !teamContext.team) return;

    setError('');
    setNotice('');
    setIsUpdating(userId);

    try {
      const data = await financeService.updateContribution(token, teamContext.team.id, userId, {
        month: selectedMonth,
        amount: Number(amountDrafts[userId] || 0),
      });

      applyFundMonth(data);
      setNotice('Đã cập nhật mức đóng quỹ.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật đóng quỹ.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleTogglePaid = async (userId: string, nextPaid: boolean) => {
    if (!token || !teamContext.team) return;

    const noteValue = noteDrafts[userId]?.trim();
    if (nextPaid && (!noteValue || noteValue.length < 2)) {
      setError('Vui lòng nhập ghi chú cho khoản thu quỹ.');
      return;
    }

    setError('');
    setNotice('');
    setIsUpdating(userId);

    try {
      const data = await financeService.updateContribution(token, teamContext.team.id, userId, {
        month: selectedMonth,
        isPaid: nextPaid,
        note: noteValue || undefined,
      });

      applyFundMonth(data);
      await loadSummary();
      setNotice(nextPaid ? 'Đã ghi nhận thành viên đóng quỹ.' : 'Đã hủy ghi nhận đóng quỹ.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật trạng thái đóng quỹ.');
    } finally {
      setIsUpdating(null);
    }
  };

  if (!teamContext.team) {
    return (
      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-2">Tài chính</h1>
        <p className="text-sm text-gray-600">Hãy tham gia hoặc tạo đội trước khi quản lý tài chính.</p>
      </div>
    );
  }

  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Quản lý tài chính</h1>
        <p className="text-gray-500">Minh bạch thu chi, quỹ tháng và đóng góp của từng thành viên.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
          <p className="text-xs tracking-wider font-bold text-gray-500 mb-2">QUỸ HIỆN TẠI</p>
          <p className="text-3xl font-black text-[var(--color-dark)]">
            {formatCurrency(summary?.totalFund || teamContext.team.totalFund || 0)}
          </p>
        </div>
        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
          <p className="text-xs tracking-wider font-bold text-gray-500 mb-2">DỰ THU THÁNG {monthLabel}</p>
          <p className="text-2xl font-bold text-[var(--color-dark)]">
            {formatCurrency(fundMonth?.totals.expectedAmount || 0)}
          </p>
        </div>
        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
          <p className="text-xs tracking-wider font-bold text-gray-500 mb-2">ĐÃ THU THÁNG {monthLabel}</p>
          <p className="text-2xl font-bold text-emerald-700">
            {formatCurrency(fundMonth?.totals.collectedAmount || 0)}
          </p>
        </div>
        <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
          <p className="text-xs tracking-wider font-bold text-gray-500 mb-2">CÒN THIẾU</p>
          <p className="text-2xl font-bold text-rose-600">
            {formatCurrency(fundMonth?.totals.outstandingAmount || 0)}
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs tracking-wider font-bold text-gray-500 mb-2">QUỸ THÁNG</p>
            <p className="text-lg font-semibold text-[var(--color-dark)]">Thiết lập mức đóng góp</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="text-sm text-gray-600">
              <span className="block mb-1">Chọn tháng</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-600">
              <span className="block mb-1">Mức đóng / người</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={monthAmount}
                onChange={(event) => setMonthAmount(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                disabled={!canEditFinance}
              />
            </label>
            <button
              type="button"
              onClick={handleSetMonthlyAmount}
              disabled={!canEditFinance || isUpdating === 'month'}
              className="h-10 mt-6 sm:mt-auto rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold px-4 disabled:opacity-60"
            >
              Cập nhật
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 mt-4">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(event) => setApplyToAll(event.target.checked)}
            disabled={!canEditFinance}
          />
          Áp dụng mức này cho tất cả thành viên chưa đóng
        </label>
      </div>

      {!canEditFinance && (
        <p className="text-sm text-amber-700">
          Chỉ đội trưởng hoặc thủ quỹ mới có thể chỉnh sửa tài chính. Bạn đang ở chế độ chỉ xem.
        </p>
      )}

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs tracking-wider font-bold text-gray-500">DANH SÁCH ĐÓNG QUỸ</p>
            <p className="text-sm text-gray-500">Tháng {monthLabel}</p>
          </div>
        </div>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-2 pr-3">Thành viên</th>
              <th className="py-2 pr-3">Vai trò</th>
              <th className="py-2 pr-3">Mức đóng</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3">Ghi chú</th>
              <th className="py-2 pr-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {(fundMonth?.members || []).map((member) => {
              const {
                profile,
                teamRole,
                preferredPosition,
                userId,
                amount: memberAmount,
                isPaid,
                paidAt,
              } = member;
              const roleLabel = ROLE_LABELS[teamRole] || 'Thành viên';
              const isBusy = isUpdating === userId;

              return (
                <tr key={userId} className="border-b border-gray-200/70 last:border-none">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-[var(--color-dark)]">
                      {profile?.full_name || 'Không xác định'}
                    </p>
                    <p className="text-xs text-gray-500">{profile?.email || 'Không rõ email'}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-sm text-gray-700">{roleLabel}</p>
                    {preferredPosition && (
                      <p className="text-xs text-gray-500">{preferredPosition}</p>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={amountDrafts[userId] ?? memberAmount}
                      onChange={(event) =>
                        setAmountDrafts((prev) => ({
                          ...prev,
                          [userId]: event.target.value,
                        }))
                      }
                      disabled={!canEditFinance}
                      className="w-32 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      disabled={!canEditFinance || isBusy}
                      onClick={() => handleUpdateMemberAmount(userId)}
                      className="mt-2 text-xs font-semibold text-[var(--color-primary)] disabled:opacity-60"
                    >
                      Lưu mức đóng
                    </button>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isPaid ? 'Đã đóng' : 'Chưa đóng'}
                    </span>
                    {paidAt && (
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(paidAt)}</p>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <input
                      value={noteDrafts[userId] ?? ''}
                      onChange={(event) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [userId]: event.target.value,
                        }))
                      }
                      disabled={!canEditFinance}
                      placeholder="Ghi chú khoản thu"
                      className="w-56 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      disabled={!canEditFinance || isBusy}
                      onClick={() => handleTogglePaid(userId, !isPaid)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold text-white disabled:opacity-60 ${
                        isPaid ? 'bg-gray-400' : 'bg-emerald-600'
                      }`}
                    >
                      {isPaid ? 'Hủy đã đóng' : 'Xác nhận đã đóng'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <select
          value={type}
          onChange={(event) => setType(event.target.value as 'INCOME' | 'EXPENSE')}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          disabled={!canEditFinance}
        >
          <option value="INCOME">Thu nhập</option>
          <option value="EXPENSE">Chi tiêu</option>
        </select>
        <input
          type="number"
          min={0}
          step={1000}
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Số tiền (VND)"
          disabled={!canEditFinance}
        />
        <input
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Mô tả"
          disabled={!canEditFinance}
        />
        <button
          type="submit"
          disabled={!canEditFinance || isSubmitting}
          className="rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2 disabled:opacity-60"
        >
          Thêm khoản
        </button>
      </form>

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-2 pr-3">Ngày</th>
              <th className="py-2 pr-3">Loại</th>
              <th className="py-2 pr-3">Số tiền</th>
              <th className="py-2 pr-3">Mô tả</th>
              <th className="py-2 pr-3">Ghi nhận bởi</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.entries || []).map((entry) => (
              <tr key={entry.id} className="border-b border-gray-200/70 last:border-none">
                <td className="py-2 pr-3">{formatDateTime(entry.createdAt)}</td>
                <td className="py-2 pr-3">{entry.type === 'INCOME' ? 'Thu' : 'Chi'}</td>
                <td className="py-2 pr-3 font-semibold">{formatCurrency(Number(entry.amount))}</td>
                <td className="py-2 pr-3">{entry.description}</td>
                <td className="py-2 pr-3">{entry.users?.full_name || 'Không xác định'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Finance;