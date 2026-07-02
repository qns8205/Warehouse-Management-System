import React, { useState } from "react";
import { WmsUser } from "../types";
import { Lock, User, RefreshCw, KeyRound, Eye, ShieldAlert } from "lucide-react";

interface LoginPageProps {
  users: WmsUser[];
  onLoginSuccess: (user: WmsUser) => void;
  onViewOnlyMode: () => void;
  isLightMode: boolean;
  onSyncUsers: () => Promise<void>;
  syncing: boolean;
}

export default function LoginPage({
  users,
  onLoginSuccess,
  onViewOnlyMode,
  isLightMode,
  onSyncUsers,
  syncing,
}: LoginPageProps) {
  const [selectedMode, setSelectedMode] = useState<"view" | "admin">("view");
  const [idInput, setIdInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [localError, setLocalError] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!idInput.trim() || !passwordInput.trim()) {
      setLocalError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }

    const matchedUser = users.find(
      (u) =>
        u.id.toLowerCase() === idInput.trim().toLowerCase() &&
        String(u.password) === passwordInput.trim()
    );

    if (matchedUser) {
      onLoginSuccess(matchedUser);
    } else {
      setLocalError("일치하는 계정 정보가 없습니다. 다시 입력해 주세요.");
    }
  };

  const ACCENT = "#6366f1";
  const ACCENT_LIGHT = "rgba(99, 102, 241, 0.08)";
  const TEXT_MAIN = isLightMode ? "#0f172a" : "#f1f5f9";
  const TEXT_DIM = isLightMode ? "#475569" : "#94a3b8";
  const PANEL_BG = isLightMode ? "#ffffff" : "#1e293b";
  const INPUT_BG = isLightMode ? "#f8fafc" : "#0f172a";
  const BORDER_COLOR = isLightMode ? "#cbd5e1" : "#334155";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: isLightMode
          ? "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
          : "linear-gradient(135deg, #0f172a 0%, #020617 100%)",
        color: TEXT_MAIN,
        padding: "24px 16px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          background: PANEL_BG,
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: "24px",
          padding: "40px 32px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Header App Title */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(99, 102, 241, 0.12)",
              color: ACCENT,
              marginBottom: "16px",
            }}
          >
            <Lock size={26} />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: TEXT_MAIN, marginBottom: "8px", letterSpacing: "-0.03em" }}>
            창고 보관구역 관리 시스템
          </h1>
          <p style={{ fontSize: "13px", color: TEXT_DIM }}>
            원하시는 서비스 이용 권한을 선택하여 시작하세요.
          </p>
        </div>

        {/* Permissions Choice Cards: Side-by-Side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            marginBottom: selectedMode === "admin" ? "28px" : "12px",
          }}
        >
          {/* Left Choice Card: View-Only Mode */}
          <button
            type="button"
            onClick={() => {
              setSelectedMode("view");
              // Immediately prompt view-only or let them click again?
              // To make it extremely responsive and intuitive, let's keep it highlighted or offer immediate enter
            }}
            style={{
              background: selectedMode === "view"
                ? (isLightMode ? "rgba(99, 102, 241, 0.05)" : "rgba(99, 102, 241, 0.15)")
                : "transparent",
              border: `2px solid ${selectedMode === "view" ? ACCENT : BORDER_COLOR}`,
              borderRadius: "16px",
              padding: "24px 16px",
              cursor: "pointer",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease-in-out",
              boxShadow: selectedMode === "view" ? `0 4px 20px ${isLightMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.3)"}` : "none",
            }}
            onMouseEnter={(e) => {
              if (selectedMode !== "view") {
                e.currentTarget.style.borderColor = ACCENT;
                e.currentTarget.style.background = isLightMode ? "rgba(99, 102, 241, 0.02)" : "rgba(255, 255, 255, 0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedMode !== "view") {
                e.currentTarget.style.borderColor = BORDER_COLOR;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: selectedMode === "view" ? ACCENT : (isLightMode ? "#e2e8f0" : "#334155"),
                color: selectedMode === "view" ? "#ffffff" : TEXT_DIM,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <Eye size={22} />
            </div>
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: 800, color: TEXT_MAIN, marginBottom: "4px" }}>
                열람용 모드
              </div>
              <div style={{ fontSize: "11px", color: TEXT_DIM, lineHeight: "1.4" }}>
                실시간 현황 조회 전용<br />(수정/대여 불가)
              </div>
            </div>
          </button>

          {/* Right Choice Card: Admin Mode */}
          <button
            type="button"
            onClick={() => {
              setSelectedMode("admin");
              setLocalError("");
            }}
            style={{
              background: selectedMode === "admin"
                ? (isLightMode ? "rgba(99, 102, 241, 0.05)" : "rgba(99, 102, 241, 0.15)")
                : "transparent",
              border: `2px solid ${selectedMode === "admin" ? ACCENT : BORDER_COLOR}`,
              borderRadius: "16px",
              padding: "24px 16px",
              cursor: "pointer",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease-in-out",
              boxShadow: selectedMode === "admin" ? `0 4px 20px ${isLightMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.3)"}` : "none",
            }}
            onMouseEnter={(e) => {
              if (selectedMode !== "admin") {
                e.currentTarget.style.borderColor = ACCENT;
                e.currentTarget.style.background = isLightMode ? "rgba(99, 102, 241, 0.02)" : "rgba(255, 255, 255, 0.03)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedMode !== "admin") {
                e.currentTarget.style.borderColor = BORDER_COLOR;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: selectedMode === "admin" ? ACCENT : (isLightMode ? "#e2e8f0" : "#334155"),
                color: selectedMode === "admin" ? "#ffffff" : TEXT_DIM,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: 800, color: TEXT_MAIN, marginBottom: "4px" }}>
                관리자 모드
              </div>
              <div style={{ fontSize: "11px", color: TEXT_DIM, lineHeight: "1.4" }}>
                재고 정보 수정 및 등록<br />대여/반납 전용 기능
              </div>
            </div>
          </button>
        </div>

        {/* Dynamic Panel based on selection */}
        {selectedMode === "view" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <button
              type="button"
              onClick={onViewOnlyMode}
              style={{
                width: "100%",
                background: ACCENT,
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "15px 12px",
                fontSize: "14.5px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 6px 18px rgba(99, 102, 241, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#4f46e5";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ACCENT;
                e.currentTarget.style.transform = "none";
              }}
            >
              👀 열람용 모드로 즉시 진입하기
            </button>
            <p style={{ fontSize: "11.5px", color: TEXT_DIM, textAlign: "center", marginTop: "6px" }}>
              * 별도의 로그인 없이 실시간 보관구역 상태와 수량을 조회할 수 있습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* ID Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: TEXT_DIM }}>
                관리자 ID
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: isLightMode ? "#94a3b8" : "#64748b",
                  }}
                />
                <input
                  type="text"
                  placeholder="ID 입력"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  style={{
                    width: "100%",
                    background: INPUT_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: "10px",
                    padding: "10px 12px 10px 38px",
                    color: TEXT_MAIN,
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: TEXT_DIM }}>
                비밀번호
              </label>
              <div style={{ position: "relative" }}>
                <KeyRound
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: isLightMode ? "#94a3b8" : "#64748b",
                  }}
                />
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  style={{
                    width: "100%",
                    background: INPUT_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: "10px",
                    padding: "10px 12px 10px 38px",
                    color: TEXT_MAIN,
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                  onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
                />
              </div>
            </div>

            <div style={{ fontSize: "11px", color: TEXT_DIM, display: "flex", justifyContent: "space-between" }}>
              <span>현재 동기화된 관리자 계정 수: <b style={{ color: ACCENT }}>{users.length}개</b></span>
            </div>

            {localError && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#ef4444",
                  background: "rgba(239, 68, 68, 0.08)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                  textAlign: "center",
                }}
              >
                {localError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                background: ACCENT,
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.2s",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
                marginTop: "4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#4f46e5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
            >
              🔐 관리자 로그인 및 모니터링 진입
            </button>
          </form>
        )}

        {/* Sync Area at the bottom */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: `1px solid ${isLightMode ? "#f1f5f9" : "#334155"}`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onSyncUsers}
            disabled={syncing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "none",
              color: ACCENT,
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: syncing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "스프레드시트에서 동기화 중..." : "관리자 계정 실시간 수동 동기화"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
