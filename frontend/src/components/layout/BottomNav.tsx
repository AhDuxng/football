import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Users, Crosshair, CalendarDays, Wallet, Inbox } from 'lucide-react';
import { NAVIGATION } from '../../constants/routes';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={24} />,
  User: <User size={24} />,
  Users: <Users size={24} />,
  Crosshair: <Crosshair size={24} />,
  CalendarDays: <CalendarDays size={24} />,
  Wallet: <Wallet size={24} />,
  Inbox: <Inbox size={24} />,
};

const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16 overflow-x-auto">
        {NAVIGATION.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-[var(--color-primary)]' : 'text-gray-400 hover:text-[var(--color-dark)]'
              }`
            }
          >
            {iconMap[item.icon]}
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
