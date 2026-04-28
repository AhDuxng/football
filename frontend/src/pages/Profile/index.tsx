import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { useAppState } from "../../hooks/useAppState";
import { authService } from "../../services/auth.service";
import type { PreferredPosition, TeamRole } from "../../types";

const ROLE_LABELS: Record<TeamRole, string> = {
  CAPTAIN: "Đội trưởng",
  COACH: "Huấn luyện viên",
  PLAYER: "Cầu thủ",
};

const POSITION_LABELS: Record<PreferredPosition, string> = {
  GK: "Thủ môn",
  RB: "Hậu vệ phải",
  RWB: "Hậu vệ cánh phải",
  CB: "Trung vệ",
  LB: "Hậu vệ trái",
  LWB: "Hậu vệ cánh trái",
  CDM: "Tiền vệ phòng ngự",
  CM: "Tiền vệ trung tâm",
  CAM: "Tiền vệ tấn công",
  RM: "Tiền vệ phải",
  LM: "Tiền vệ trái",
  RW: "Tiền đạo cánh phải",
  LW: "Tiền đạo cánh trái",
  CF: "Hộ công",
  ST: "Tiền đạo cắm",
};

const Profile = () => {
  const { token, profile, teamContext, refreshAll } = useAppState();

  const [fullName, setFullName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarPayload, setAvatarPayload] = useState<string | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFullName(profile.fullName || "");
    setAvatarPreview(profile.avatarUrl || "");
    setAvatarPayload(undefined);
  }, [profile]);

  const teamRoleLabel = useMemo(() => {
    const role = teamContext.membership?.teamRole;
    return role ? ROLE_LABELS[role] : "Chưa có";
  }, [teamContext.membership?.teamRole]);

  const preferredPositionLabel = useMemo(() => {
    const position = teamContext.membership?.preferredPosition;
    return position ? POSITION_LABELS[position] : "Chưa thiết lập";
  }, [teamContext.membership?.preferredPosition]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setAvatarPreview("");
      setAvatarPayload(null);
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
      setAvatarPayload(result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleClearAvatar = () => {
    setAvatarPreview("");
    setAvatarPayload(null);
  };

  const handleCopyId = async () => {
    if (!profile?.id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(profile.id);
      setNotice("Đã sao chép mã ID.");
    } catch {
      setError("Không thể sao chép mã ID.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setNotice("");
    setError("");
    setIsSubmitting(true);

    try {
      await authService.updateProfile(token, {
        fullName: fullName.trim(),
        avatarUrl: avatarPayload,
      });
      await refreshAll();
      setNotice("Đã cập nhật hồ sơ thành công.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể cập nhật hồ sơ."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-6">
        <p className="text-sm text-gray-600">Không tìm thấy hồ sơ người dùng.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-dark)] mb-1">Hồ sơ cá nhân</h1>
        <p className="text-gray-500">Quản lý thông tin, ảnh đại diện và mã ID của bạn.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={
                  avatarPreview ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.fullName || profile.email}`
                }
                alt="Ảnh đại diện"
                className="h-16 w-16 rounded-full border border-gray-200 object-cover bg-white"
              />
              <div className="space-y-2">
                <label className="block text-sm text-gray-600">
                  Ảnh đại diện
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleClearAvatar}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  Xóa ảnh đại diện
                </button>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-sm text-gray-600">Họ và tên</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength={2}
                maxLength={120}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-gray-600">Email</span>
              <input
                value={profile.email}
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-500"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-60"
              >
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold tracking-wider text-gray-500">MÃ ID</p>
            <p className="text-sm font-semibold text-[var(--color-dark)] break-all">{profile.id}</p>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-xs text-[var(--color-primary-dark)] font-semibold"
            >
              Sao chép mã ID
            </button>
          </div>

          <div className="bg-[var(--color-card)] border border-gray-200/70 rounded-xl p-5 space-y-2">
            <p className="text-xs font-bold tracking-wider text-gray-500">THÔNG TIN ĐỘI</p>
            <p className="text-sm text-gray-600">Đội hiện tại</p>
            <p className="text-sm font-semibold text-[var(--color-dark)]">
              {teamContext.team?.name || "Chưa có đội"}
            </p>
            <p className="text-sm text-gray-600">Vai trò</p>
            <p className="text-sm font-semibold text-[var(--color-dark)]">{teamRoleLabel}</p>
            <p className="text-sm text-gray-600">Vị trí ưu tiên</p>
            <p className="text-sm font-semibold text-[var(--color-dark)]">{preferredPositionLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
