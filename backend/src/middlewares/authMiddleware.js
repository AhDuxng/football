import { supabaseAdmin } from "../config/supabase.js";
import AppError from "../core/AppError.js";
import catchAsync from "../core/catchAsync.js";

const extractBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export const authMiddleware = catchAsync(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new AppError("Không được phép: cần có Bearer token.", 401);
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user) {
    throw new AppError("Không được phép: token không hợp lệ hoặc đã hết hạn.", 401, {
      code: authError?.code,
    });
  }

  const user = authData.user;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, avatar_url, system_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    throw new AppError("Không thể tải hồ sơ người dùng.", 500, {
      code: profileError.code,
    });
  }

  let resolvedProfile = profile;
  if (!resolvedProfile) {
    const fallbackName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Cầu thủ";

    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fallbackName,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          system_role: "USER",
        },
        { onConflict: "id" }
      )
      .select("id, email, full_name, avatar_url, system_role")
      .single();

    if (createError) {
      throw new AppError("Không thể khởi tạo hồ sơ người dùng.", 500, {
        code: createError.code,
        details: createError.details,
      });
    }

    resolvedProfile = createdProfile;
  }

  req.accessToken = token;
  req.user = user;
  req.profile = resolvedProfile;
  next();
});