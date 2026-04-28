import type { AuthResult, UserProfile } from "../types";
import { apiRequest } from "./http";

type RawUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  system_role: "ADMIN" | "USER";
};

const toUserProfile = (raw: RawUser): UserProfile => ({
  id: raw.id,
  email: raw.email,
  fullName: raw.full_name,
  avatarUrl: raw.avatar_url,
  systemRole: raw.system_role,
});

const toAuthResult = (raw: {
  user: RawUser;
  session: AuthResult["session"];
}): AuthResult => ({
  user: toUserProfile(raw.user),
  session: raw.session,
});

export const authService = {
  async signUp(payload: {
    email: string;
    password: string;
    fullName: string;
    avatarUrl?: string;
  }): Promise<AuthResult> {
    const data = await apiRequest<{
      user: RawUser;
      session: AuthResult["session"];
    }>("/auth/signup", {
      method: "POST",
      body: payload,
    });

    return toAuthResult(data);
  },

  async login(payload: { email: string; password: string }): Promise<AuthResult> {
    const data = await apiRequest<{
      user: RawUser;
      session: AuthResult["session"];
    }>("/auth/login", {
      method: "POST",
      body: payload,
    });

    return toAuthResult(data);
  },

  async me(token: string): Promise<UserProfile> {
    const data = await apiRequest<{ user: RawUser }>("/auth/me", {
      token,
    });

    return toUserProfile(data.user);
  },

  async updateProfile(
    token: string,
    payload: { fullName: string; avatarUrl?: string | null }
  ): Promise<UserProfile> {
    const data = await apiRequest<{ user: RawUser }>("/auth/profile", {
      method: "PUT",
      token,
      body: payload,
    });

    return toUserProfile(data.user);
  },
};