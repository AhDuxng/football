import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Squad from './pages/Squad';
import Tactics from './pages/Tactics';
import Matches from './pages/Matches';
import Finance from './pages/Finance';
import Inbox from './pages/Inbox';
import Auth from './pages/Auth';
import { ROUTES } from './constants/routes';
import { useAppState } from './hooks/useAppState';

function App() {
  const { token, isBootstrapping } = useAppState();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--color-main)] text-[var(--color-dark)]">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Quản lý đội bóng</p>
          <p className="text-sm text-gray-500">Đang tải dữ liệu phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path={ROUTES.AUTH}
        element={token ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Auth />}
      />

      <Route
        path={ROUTES.HOME}
        element={token ? <AppLayout /> : <Navigate to={ROUTES.AUTH} replace />}
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.PROFILE} element={<Profile />} />
        <Route path={ROUTES.SQUAD} element={<Squad />} />
        <Route path={ROUTES.TACTICS} element={<Tactics />} />
        <Route path={ROUTES.MATCHES} element={<Matches />} />
        <Route path={ROUTES.FINANCE} element={<Finance />} />
        <Route path={ROUTES.INBOX} element={<Inbox />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={token ? ROUTES.DASHBOARD : ROUTES.AUTH} replace />}
      />
    </Routes>
  );
}

export default App;
