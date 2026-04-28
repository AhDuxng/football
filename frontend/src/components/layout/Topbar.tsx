import React from 'react';
import { Bell, RefreshCcw, LogOut, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAppState } from '../../hooks/useAppState';

const Topbar: React.FC = () => {
  const {
    pendingInboxCount,
    profile,
    teamContext,
    logout,
    refreshAll,
  } = useAppState();

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-4 md:px-8 z-40">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="hidden md:flex items-center gap-2 bg-[var(--color-sidebar)] px-3 py-2 rounded-md">
          <Users size={16} />
          <span className="text-sm font-medium">{teamContext.team?.name || 'Chế độ khởi tạo'}</span>
        </div>
      </div>

      <div className="flex items-center gap-5 ml-auto">
        <button
          onClick={() => {
            void refreshAll();
          }}
          className="bg-white hover:bg-gray-100 text-[var(--color-dark)] font-medium px-3 py-2 rounded-md transition-colors text-sm hidden md:flex items-center gap-2 border border-gray-200"
        >
          <RefreshCcw size={16} />
          <span>Làm mới</span>
        </button>

        <div className="flex items-center gap-4 text-gray-500">
          <Link to={ROUTES.INBOX} className="relative hover:text-[var(--color-dark)] transition-colors">
            <Bell size={20} className="fill-current" />
            {pendingInboxCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-rose-500 rounded-full border border-white text-[10px] text-white font-bold grid place-items-center">
                {pendingInboxCount > 9 ? '9+' : pendingInboxCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center ml-2 cursor-pointer gap-2">
          <img
            src={
              profile?.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.fullName || 'Manager'}`
            }
            alt="Quản lý"
            className="w-9 h-9 rounded-full bg-blue-100 border border-gray-200"
          />
          <button
            onClick={logout}
            className="text-xs text-gray-600 hover:text-rose-600 transition-colors hidden md:flex items-center gap-1"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
