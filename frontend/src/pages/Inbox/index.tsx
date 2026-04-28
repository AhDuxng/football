import { useEffect, useMemo, useState } from 'react';

import { useAppState } from '../../hooks/useAppState';
import { notificationService } from '../../services/notification.service';
import { teamService } from '../../services/team.service';
import type { NotificationItem } from '../../types';
import { formatDateTime } from '../../utils/format';

const Inbox = () => {
  const { token, profile, refreshAll } = useAppState();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'PENDING').length, [items]);

  const loadInbox = async () => {
    if (!token) return;
    const data = await notificationService.getInbox(token);
    setItems(data);
  };

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        await loadInbox();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải hộp thư.');
      }
    };

    void load();
  }, [token]);

  const handleRespond = async (item: NotificationItem, status: 'ACCEPTED' | 'REJECTED') => {
    if (!token) return;

    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await teamService.respondToInvitation(token, item.id, { status });
      await refreshAll();
      await loadInbox();
      setNotice(`Đã ${status.toLowerCase() === 'accepted' ? 'chấp nhận' : 'từ chối'} yêu cầu thành công.`);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Không thể xử lý phản hồi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Hộp thư</h1>
        <p className="text-gray-500">Quản lý lời mời và yêu cầu tham gia. Đang chờ: {pendingCount}</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
            <p className="text-sm text-gray-600">Hộp thư đang trống.</p>
          </div>
        ) : (
          items.map((item) => {
            const canRespond = item.status === 'PENDING';
            const isOwnInvite = item.receiverId === profile?.id;

            return (
              <div
                key={item.id}
                className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--color-dark)]">
                    {item.type} - {item.team?.name || 'Đội không xác định'}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      item.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : item.status === 'ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600">Từ: {item.sender?.full_name || item.sender?.email || item.senderId}</p>
                <p className="text-sm text-gray-600">Đến: {item.receiver?.full_name || item.receiver?.email || item.receiverId}</p>
                <p className="text-xs text-gray-500">Tạo lúc: {formatDateTime(item.createdAt)}</p>
                {item.message && <p className="text-sm text-gray-700">Lời nhắn: {item.message}</p>}

                {canRespond && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleRespond(item, 'REJECTED');
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-md bg-white border border-gray-200 text-xs font-semibold disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRespond(item, 'ACCEPTED');
                      }}
                      disabled={isSubmitting || (item.type === 'INVITE' && !isOwnInvite)}
                      className="px-3 py-2 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold disabled:opacity-60"
                    >
                      Chấp nhận
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Inbox;