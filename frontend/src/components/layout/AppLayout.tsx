import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-main)] text-[var(--color-dark)] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 hide-scrollbar">
          <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export default AppLayout;
