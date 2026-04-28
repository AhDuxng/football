import { useEffect, useMemo, useState } from 'react';

import { useAppState } from '../../hooks/useAppState';
import { financeService } from '../../services/finance.service';
import type { FinanceSummary } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const Finance = () => {
  const { token, teamContext } = useAppState();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canEditFinance = useMemo(() => {
    return teamContext.membership?.teamRole === 'CAPTAIN';
  }, [teamContext.membership?.teamRole]);

  const loadSummary = async () => {
    if (!token || !teamContext.team) return;

    const data = await financeService.listEntries(token, teamContext.team.id);
    setSummary(data);
  };

  useEffect(() => {
    if (!token || !teamContext.team) return;

    const load = async () => {
      try {
        await loadSummary();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải các khoản tài chính.');
      }
    };

    void load();
  }, [token, teamContext.team]);

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

  if (!teamContext.team) {
    return (
      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-2">Tài chính</h1>
        <p className="text-sm text-gray-600">Hãy tham gia hoặc tạo đội trước khi quản lý tài chính.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Quản lý tài chính</h1>
        <p className="text-gray-500">Theo dõi thu nhập, chi tiêu và quỹ hiện tại của đội.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
        <p className="text-xs tracking-wider font-bold text-gray-500 mb-2">QUỸ HIỆN TẠI</p>
        <p className="text-4xl font-black text-[var(--color-dark)]">
          {formatCurrency(summary?.totalFund || teamContext.team.totalFund || 0)}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <select
          value={type}
          onChange={(event) => setType(event.target.value as 'INCOME' | 'EXPENSE')}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="INCOME">Thu nhập</option>
          <option value="EXPENSE">Chi tiêu</option>
        </select>
        <input
          type="number"
          min={0.01}
          step={0.01}
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Số tiền"
        />
        <input
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder="Mô tả"
        />
        <button
          type="submit"
          disabled={!canEditFinance || isSubmitting}
          className="rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold px-3 py-2 disabled:opacity-60"
        >
          Thêm khoản
        </button>
      </form>

      {!canEditFinance && (
        <p className="text-sm text-amber-700">Chỉ đội trưởng mới có thể chỉnh sửa tài chính của đội. Bạn đang ở chế độ chỉ xem.</p>
      )}

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
                <td className="py-2 pr-3">{entry.type}</td>
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