import React, { useState, useMemo } from "react";
import { InventoryItem, RentLog } from "../types";
import { Calendar, User, MapPin, Clipboard, Plus, Search, ArrowLeft, FileText, Check, ArrowRightLeft } from "lucide-react";

interface RentLogsPageProps {
  rentLogs: RentLog[];
  inventory: InventoryItem[];
  onAddRentLog: (log: RentLog) => Promise<void>;
  onClose: () => void;
  isLightMode: boolean;
  isAdmin: boolean;
}

const PANEL_BORDER = "var(--panel-border, #334155)";
const TEXT_MAIN = "var(--text-main, #f1f5f9)";
const TEXT_DIM = "var(--text-dim, #94a3b8)";
const ACCENT = "#6366f1";
const DANGER = "#f43f5e";
const OK = "#10b981";

function formatTimestampToMinutes(tsStr: string): string {
  if (!tsStr) return "실시간 동기화";
  const clean = tsStr.trim();
  
  try {
    const parsedPart = clean.replace(/-/g, "/");
    const d = new Date(parsedPart);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch (e) {
    // ignore
  }
  return clean;
}

export default function RentLogsPage({
  rentLogs,
  inventory,
  onAddRentLog,
  onClose,
  isLightMode,
  isAdmin,
}: RentLogsPageProps) {
  // Search and Filter states
  const [filterQuery, setFilterQuery] = useState("");
  const [filterType, setFilterType] = useState("전체");

  // Filter logs
  const filteredLogs = useMemo(() => {
    return rentLogs.filter((log) => {
      const matchesQuery =
        !filterQuery ||
        log.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (log.location && log.location.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (log.note && log.note.toLowerCase().includes(filterQuery.toLowerCase()));

      const matchesType = filterType === "전체" || log.type === filterType;

      return matchesQuery && matchesType;
    });
  }, [rentLogs, filterQuery, filterType]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--canvas-bg, #020617)",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${PANEL_BORDER}`,
          background: "var(--panel-bg, #0f172a)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: TEXT_DIM,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
            }}
          >
            <ArrowLeft size={16} />
            돌아가기
          </button>
          <div style={{ width: 1, height: 16, background: PANEL_BORDER }} />
          <h1 style={{ fontSize: 16, fontWeight: 800, color: TEXT_MAIN, display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowRightLeft size={18} style={{ color: ACCENT }} />
            📦 물품 대여 및 반납 대장
          </h1>
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM }}>
          스프레드시트 연동 중
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "column" }}>
        {/* Right Side: Logs Search Table */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px", overflow: "hidden" }}>
          {/* Filters Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: TEXT_DIM }} />
              <input
                type="text"
                placeholder="품목명, 신청자, 위치, 사유 검색..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 30px",
                  borderRadius: 6,
                  background: "var(--panel-bg, #0f172a)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                }}
              />
            </div>

            {/* Type buttons */}
            <div style={{ display: "flex", gap: 6, background: "var(--panel-bg, #0f172a)", padding: 3, borderRadius: 6, border: `1px solid ${PANEL_BORDER}` }}>
              {["전체", "대여", "반납"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: filterType === t ? (t === "대여" ? "rgba(99,102,241,0.2)" : t === "반납" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)") : "transparent",
                    color: filterType === t ? (t === "대여" ? ACCENT : t === "반납" ? OK : TEXT_MAIN) : TEXT_DIM,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              flex: 1,
              background: "var(--panel-bg, #0f172a)",
              border: `1px solid ${PANEL_BORDER}`,
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--input-bg, #020617)", zIndex: 1, borderBottom: `1px solid ${PANEL_BORDER}` }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>기록 시각</th>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>구분</th>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>품목명</th>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>위치</th>
                    <th style={{ textAlign: "center", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>수량</th>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>신청자</th>
                    <th style={{ textAlign: "left", padding: "10px 14px", color: TEXT_DIM, fontWeight: 600 }}>사유 / 비고</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: TEXT_DIM }}>
                        <FileText size={24} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />
                        조회된 대여/반납 로그 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: `1px solid ${PANEL_BORDER}`,
                          background: index % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "11px 14px", color: TEXT_DIM, whiteSpace: "nowrap" }}>
                          {formatTimestampToMinutes(log.timestamp)}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              background: log.type === "대여" ? "rgba(99, 102, 241, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: log.type === "대여" ? ACCENT : OK,
                            }}
                          >
                            {log.type === "대여" ? "대여" : "반납"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", color: TEXT_MAIN, fontWeight: 600 }}>
                          {log.name}
                        </td>
                        <td style={{ padding: "11px 14px", color: TEXT_DIM }}>
                          <span className="mono" style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", padding: "2px 5px", borderRadius: 3 }}>
                            {log.location || "-"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", textAlign: "center", color: TEXT_MAIN, fontWeight: 700 }}>
                          {log.qty}개
                        </td>
                        <td style={{ padding: "11px 14px", color: TEXT_MAIN }}>
                          {log.user}
                        </td>
                        <td style={{ padding: "11px 14px", color: TEXT_DIM, maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.note}>
                          {log.note || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${PANEL_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--input-bg, #020617)", fontSize: 11, color: TEXT_DIM }}>
              <div>전체 로그: {rentLogs.length}건 / 필터 결과: {filteredLogs.length}건</div>
              <div>대여 로그는 구글 스프레드시트의 <strong>RentLog</strong> 시트에 실시간 동기화됩니다.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
