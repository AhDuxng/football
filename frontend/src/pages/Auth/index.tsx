import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { ROUTES } from "../../constants/routes";
import { useAppState } from "../../hooks/useAppState";

type AuthMode = "LOGIN" | "SIGNUP";

const Auth = () => {
  const { token, login, signUp } = useAppState();

  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (token) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setAvatarPreview("");
      setAvatarDataUrl("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp ảnh hợp lệ.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ảnh phải nhỏ hơn 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAvatarPreview(result);
      setAvatarDataUrl(result);
      setError("");
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      if (mode === "LOGIN") {
        await login({ email, password });
      } else {
        await signUp({
          email,
          password,
          fullName,
          avatarUrl: avatarDataUrl || undefined,
        });
        setSuccess("Đăng ký thành công. Bạn đã được đăng nhập.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Xác thực thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--color-main)] px-4">
      <div className="w-full max-w-md bg-[var(--color-card)] border border-gray-200/70 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">Quản lý đội bóng</h1>
          <p className="text-sm text-gray-500">
            Đăng nhập để quản lý đội hình, trận đấu, chiến thuật, tài chính và hộp thư của đội.
          </p>
        </div>

        <div className="grid grid-cols-2 mb-6 bg-white rounded-lg p-1 border border-gray-200">
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setMode("LOGIN");
            }}
            className={`rounded-md py-2 text-sm font-semibold transition-colors ${
              mode === "LOGIN"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-500 hover:text-[var(--color-dark)]"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setMode("SIGNUP");
            }}
            className={`rounded-md py-2 text-sm font-semibold transition-colors ${
              mode === "SIGNUP"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-500 hover:text-[var(--color-dark)]"
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "SIGNUP" && (
            <label className="block space-y-1">
              <span className="text-sm text-gray-600">Họ và tên</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength={2}
                maxLength={120}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-gray-600">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-gray-600">Mật khẩu</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={8}
              maxLength={72}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
            />
          </label>

          {mode === "SIGNUP" && (
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="text-sm text-gray-600">Ảnh đại diện</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60"
                />
              </label>

              {avatarPreview && (
                <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-14 w-14 rounded-full border border-gray-200 object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-dark)]">Đã chọn ảnh</p>
                    <p className="text-xs text-gray-500">Sẽ được lưu trong cơ sở dữ liệu dưới dạng avatar_url.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Vui lòng chờ..." : mode === "LOGIN" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;