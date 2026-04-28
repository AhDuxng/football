import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Users,
  Crosshair,
  CalendarDays,
  Inbox,
  Wallet,
} from 'lucide-react';
import { NAVIGATION } from '../../constants/routes';
import { useAppState } from '../../hooks/useAppState';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  User: <User size={20} />,
  Users: <Users size={20} />,
  Crosshair: <Crosshair size={20} />,
  CalendarDays: <CalendarDays size={20} />,
  Wallet: <Wallet size={20} />,
  Inbox: <Inbox size={20} />,
};

const Sidebar: React.FC = () => {
  const { profile, teamContext } = useAppState();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[var(--color-sidebar)] text-gray-500 border-r border-gray-200">
      <div className="flex items-center gap-3 px-6 pt-8 pb-6">
        <div className="w-10 h-10 bg-[var(--color-dark)] rounded-full flex items-center justify-center border-2 border-yellow-500 overflow-hidden">
          <span className="text-white text-xs font-bold">FTM</span>
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-[var(--color-dark)] leading-tight">
            {teamContext.team?.name || 'Chưa có đội'}
          </h1>
          <p className="text-xs text-gray-500">{profile?.fullName || 'Người dùng khách'}</p>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {NAVIGATION.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-6 py-3 transition-all duration-200 border-l-4 ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-dark)] font-semibold bg-white/50'
                  : 'border-transparent text-gray-500 hover:text-[var(--color-dark)] hover:bg-white/30'
              }`
            }
          >
            {iconMap[item.icon] || <LayoutDashboard size={20} />}
            <span className="text-[15px]">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="text-xs text-gray-500 leading-relaxed">
          Quản lý đội bóng, chiến thuật, trận đấu, tài chính và thông báo trong một không gian làm việc.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
