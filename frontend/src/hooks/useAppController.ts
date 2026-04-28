import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authService } from "../services/auth.service";
import { notificationService } from "../services/notification.service";
import { teamService } from "../services/team.service";
import type { TeamContextData, UserProfile } from "../types";

const TOKEN_STORAGE_KEY = "football_management_access_token";

const defaultTeamContext: TeamContextData = {
  membership: null,
  team: null,
};

export interface AppContextValue {
  token: string | null;
  profile: UserProfile | null;
  teamContext: TeamContextData;
  pendingInboxCount: number;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    fullName: string;
    avatarUrl?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshAll: () => Promise<void>;
  refreshTeamContext: () => Promise<void>;
  refreshPendingInboxCount: () => Promise<void>;
}

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

const persistToken = (token: string | null) => {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const useAppController = (): AppContextValue => {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamContext, setTeamContext] = useState<TeamContextData>(defaultTeamContext);
  const [pendingInboxCount, setPendingInboxCount] = useState(0);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const resetState = useCallback(() => {
    setProfile(null);
    setTeamContext(defaultTeamContext);
    setPendingInboxCount(0);
  }, []);

  const refreshPendingInboxCount = useCallback(async () => {
    if (!token) {
      setPendingInboxCount(0);
      return;
    }

    const count = await notificationService.getPendingCount(token);
    setPendingInboxCount(count);
  }, [token]);

  const refreshTeamContext = useCallback(async () => {
    if (!token) {
      setTeamContext(defaultTeamContext);
      return;
    }

    const nextContext = await teamService.getMyTeamContext(token);
    setTeamContext(nextContext);
  }, [token]);

  const bootstrap = useCallback(async () => {
    if (!token) {
      resetState();
      setIsBootstrapping(false);
      return;
    }

    setIsBootstrapping(true);

    try {
      const [nextProfile, nextTeamContext, nextPendingCount] = await Promise.all([
        authService.me(token),
        teamService.getMyTeamContext(token),
        notificationService.getPendingCount(token),
      ]);

      setProfile(nextProfile);
      setTeamContext(nextTeamContext);
      setPendingInboxCount(nextPendingCount);
    } catch {
      setToken(null);
      persistToken(null);
      resetState();
    } finally {
      setIsBootstrapping(false);
    }
  }, [token, resetState]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    const result = await authService.login(payload);

    if (!result.session?.accessToken) {
      throw new Error("Dang nhap khong thanh cong do thieu access token.");
    }

    persistToken(result.session.accessToken);
    setToken(result.session.accessToken);
    setProfile(result.user);
  }, []);

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      avatarUrl?: string;
    }) => {
      const result = await authService.signUp(payload);

      if (!result.session?.accessToken) {
        throw new Error(
          "Tai khoan da duoc tao. Neu da bat xac minh email, vui long xac minh roi dang nhap."
        );
      }

      persistToken(result.session.accessToken);
      setToken(result.session.accessToken);
      setProfile(result.user);
    },
    []
  );

  const logout = useCallback(() => {
    persistToken(null);
    setToken(null);
    resetState();
  }, [resetState]);

  const refreshAll = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  return useMemo<AppContextValue>(
    () => ({
      token,
      profile,
      teamContext,
      pendingInboxCount,
      isBootstrapping,
      login,
      signUp,
      logout,
      refreshAll,
      refreshTeamContext,
      refreshPendingInboxCount,
    }),
    [
      token,
      profile,
      teamContext,
      pendingInboxCount,
      isBootstrapping,
      login,
      signUp,
      logout,
      refreshAll,
      refreshTeamContext,
      refreshPendingInboxCount,
    ]
  );
};

