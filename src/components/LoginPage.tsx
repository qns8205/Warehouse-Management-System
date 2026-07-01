import React, { useState } from "react";
import { WmsUser } from "../types";
import { ArrowLeft, Lock, User, RefreshCw, KeyRound } from "lucide-react";

interface LoginPageProps {
  users: WmsUser[];
  onLoginSuccess: () => void;
  isLightMode: boolean;
  onSyncUsers: () => Promise<void>;
  syncing: boolean;
}

export default function LoginPage({
  users,
  onLoginSuccess,
  isLightMode,
  onSyncUsers,
  syncing,
}: LoginPageProps) {
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

    // users 배열에서 대소문자 구분 없이 매칭 확인
    const matchedUser = users.find(
      (u) =>
        u.id.toLowerCase() === idInput.trim().toLowerCase() &&
        String(u.password) === passwordInput.trim()
    );

    if (matchedUser) {
      onLoginSuccess();
    } else {
      setLocalError("일치하는 계정 정보가 없습니다. 다시 입력해 주세요.");
    }
  };

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
        color: isLightMode ? "#0f172a" : "#f1f5f9",
        padding: "20px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: isLightMode ? "#ffffff" : "#1e293b",
          border: `1px solid ${isLightMode ? "#e2e8f0" : "#334155"}`,
          borderRadius: "20px",
          padding: "36px 32px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(99, 102, 241, 0.12)",
              color: "#6366f1",
              marginBottom: "16px",
            }}
          >
            <Lock size={22} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: isLightMode ? "#0f172a" : "#f1f5f9", marginBottom: "6px" }}>
            관리자 로그인
          </h2>
          <p style={{ fontSize: "12px", color: isLightMode ? "#64748b" : "#94a3b8" }}>
            스프레드시트에 등록된 아이디/비밀번호로 로그인하세요.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* ID 입력 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#cbd5e1" }}>
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
                  background: isLightMode ? "#f8fafc" : "#0f172a",
                  border: `1px solid ${isLightMode ? "#cbd5e1" : "#334155"}`,
                  borderRadius: "10px",
                  padding: "10px 12px 10px 38px",
                  color: isLightMode ? "#0f172a" : "#f1f5f9",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = isLightMode ? "#cbd5e1" : "#334155")}
              />
            </div>
          </div>

          {/* 비밀번호 입력 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#cbd5e1" }}>
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
                  background: isLightMode ? "#f8fafc" : "#0f172a",
                  border: `1px solid ${isLightMode ? "#cbd5e1" : "#334155"}`,
                  borderRadius: "10px",
                  padding: "10px 12px 10px 38px",
                  color: isLightMode ? "#0f172a" : "#f1f5f9",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = isLightMode ? "#cbd5e1" : "#334155")}
              />
            </div>
          </div>

          <div style={{ fontSize: "11px", color: isLightMode ? "#64748b" : "#94a3b8", display: "flex", justifyContent: "space-between" }}>
            <span>현재 동기화된 계정 수: <b style={{ color: "#6366f1" }}>{users.length}개</b></span>
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
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "11px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              marginTop: "4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4338ca")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#4f46e5")}
          >
            로그인 및 모니터링 진입
          </button>
        </form>

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
              color: "#6366f1",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: syncing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? "스프레드시트에서 동기화 중..." : "사용자 계정 목록 실시간 동기화"}
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
