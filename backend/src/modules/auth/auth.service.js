import AppError from "../../core/AppError.js";

class AuthService {
  constructor({ supabaseClient, supabaseAdminClient }) {
    this.supabaseClient = supabaseClient;
    this.supabaseAdminClient = supabaseAdminClient;
  }

  formatSession(session) {
    if (!session) {
      return null;
    }

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      tokenType: session.token_type,
      expiresAt: session.expires_at,
      expiresIn: session.expires_in,
    };
  }

  async upsertProfile(user, profileOverrides = {}) {
    const fallbackName =
      profileOverrides.fullName ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Cầu thủ";

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: fallbackName,
      avatar_url:
        profileOverrides.avatarUrl ?? user.user_metadata?.avatar_url ?? null,
      system_role: "USER",
    };

    const { data, error } = await this.supabaseAdminClient
      .from("users")
      .upsert(profilePayload, { onConflict: "id" })
      .select("id, email, full_name, avatar_url, system_role")
      .single();

    if (error) {
      throw new AppError("Không thể lưu hồ sơ người dùng.", 500, {
        code: error.code,
        details: error.details,
      });
    }

    return data;
  }

  async signUp({ email, password, fullName, avatarUrl }) {
    const { data, error } = await this.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          avatar_url: avatarUrl ?? null,
        },
      },
    });

    if (error) {
      const statusCode =
        error.message?.toLowerCase().includes("already") ? 409 : 400;
      throw new AppError(error.message, statusCode, { code: error.code });
    }

    if (!data?.user) {
      throw new AppError("Không thể tạo tài khoản người dùng.", 500);
    }

    const profile = await this.upsertProfile(data.user, { fullName, avatarUrl });

    return {
      user: profile,
      session: this.formatSession(data.session),
    };
  }

  async login({ email, password }) {
    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      throw new AppError("Thông tin đăng nhập không hợp lệ.", 401, { code: error?.code });
    }

    const profile = await this.upsertProfile(data.user);

    return {
      user: profile,
      session: this.formatSession(data.session),
    };
  }

  async updateProfile(userId, payload) {
    const updates = {};

    if (payload.fullName !== undefined) {
      updates.full_name = payload.fullName;
    }

    if (payload.avatarUrl !== undefined) {
      updates.avatar_url = payload.avatarUrl;
    }

    const { data, error } = await this.supabaseAdminClient
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, email, full_name, avatar_url, system_role")
      .single();

    if (error) {
      throw new AppError("Không thể cập nhật hồ sơ người dùng.", 500, {
        code: error.code,
        details: error.details,
      });
    }

    return data;
  }
}

export default AuthService;