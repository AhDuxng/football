export const ROUTES = {
  AUTH: '/auth',
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SQUAD: '/squad',
  TACTICS: '/tactics',
  MATCHES: '/matches',
  FINANCE: '/finance',
  INBOX: '/inbox',
};

export const NAVIGATION = [
  { name: 'Bảng điều khiển', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { name: 'Hồ sơ', path: ROUTES.PROFILE, icon: 'User' },
  { name: 'Đội hình', path: ROUTES.SQUAD, icon: 'Users' },
  { name: 'Chiến thuật', path: ROUTES.TACTICS, icon: 'Crosshair' },
  { name: 'Trận đấu', path: ROUTES.MATCHES, icon: 'CalendarDays' },
  { name: 'Tài chính', path: ROUTES.FINANCE, icon: 'Wallet' },
  { name: 'Hộp thư', path: ROUTES.INBOX, icon: 'Inbox' },
];
