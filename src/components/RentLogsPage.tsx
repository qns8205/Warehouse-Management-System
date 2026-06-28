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
  // Form states
  const [locationInput, setLocationInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [typeInput, setTypeInput] = useState<"대여" | "반납">("대여");
  const [userInput, setUserInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  
  // Search and Filter states
  const [filterQuery, setFilterQuery] = useState("");
  const [filterType, setFilterType] = useState("전체");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Extract unique items for dropdown selector
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    const items: { name: string; location: string; stock: number | null }[] = [];
    for (const item of inventory) {
      if (item.name && !seen.has(item.name)) {
        seen.add(item.name);
        items.push({
          name: item.name,
          location: item.location || "",
          stock: item.stock,
        });
      }
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory]);

  const handleItemSelectChange = (name: string) => {
    setNameInput(name);
    const found = inventory.find((item) => item.name === name);
    if (found) {
      setLocationInput(found.location || "-");
    } else {
      setLocationInput("-");
    }
  };

  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nameInput.trim()) {
      setFormError("품목명을 선택하거나 직접 입력하세요.");
      return;
    }
    if (!userInput.trim()) {
      setFormError("신청자 성함을 입력해 주세요.");
      return;
    }
    if (qtyInput <= 0) {
      setFormError("수량은 1개 이상이어야 합니다.");
      return;
    }

    // If renting, let's verify if inventory has enough stock
    if (typeInput === "대여") {
      const matchedItems = inventory.filter((item) => item.name === nameInput);
      const totalAvailable = matchedItems.reduce((acc, item) => acc + (item.stock || 0), 0);
      const hasAnyMatched = matchedItems.length > 0;
      
      if (hasAnyMatched && totalAvailable < qtyInput) {
        setFormError(`대여 가능 수량을 초과했습니다. (현재고 합계: ${totalAvailable}개)`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const tsStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      await onAddRentLog({
        timestamp: tsStr,
        location: locationInput || "-",
        name: nameInput,
        type: typeInput,
        qty: qtyInput,
        user: userInput,
        note: noteInput,
      });

      // Clear form
      setUserInput("");
      setNoteInput("");
      setQtyInput(1);
    } catch (err: any) {
      setFormError(err.message || "로그 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

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

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "row", flexWrap: "wrap" }}>
        {/* Left Side: Input Form */}
        <div
          style={{
            width: "350px",
            borderRight: `1px solid ${PANEL_BORDER}`,
            background: "var(--panel-bg, #0f172a)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            minWidth: "300px",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT_MAIN, marginBottom: 4 }}>
            📥 신규 대여/반납 수동 작성
          </h2>
          <p style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 20 }}>
            직원들이 기기를 수령하거나 복귀할 때 대여 수량과 목적을 기록합니다.
          </p>

          <form onSubmit={handleAddLogSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>구분</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTypeInput("대여")}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: typeInput === "대여" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                    border: typeInput === "대여" ? `1px solid ${ACCENT}` : `1px solid ${PANEL_BORDER}`,
                    color: typeInput === "대여" ? ACCENT : TEXT_DIM,
                  }}
                >
                  📦 대여하기
                </button>
                <button
                  type="button"
                  onClick={() => setTypeInput("반납")}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: typeInput === "반납" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                    border: typeInput === "반납" ? `1px solid ${OK}` : `1px solid ${PANEL_BORDER}`,
                    color: typeInput === "반납" ? OK : TEXT_DIM,
                  }}
                >
                  🔄 반납하기
                </button>
              </div>
            </div>

            {/* Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>대상 품목</label>
              <select
                value={nameInput}
                onChange={(e) => handleItemSelectChange(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--input-bg, #020617)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                }}
              >
                <option value="">-- 보관 목록에서 품목 선택 --</option>
                {uniqueItems.map((it) => (
                  <option key={it.name} value={it.name}>
                    {it.name} (재고: {it.stock ?? 0}개, 위치: {it.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Input Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>품목명 직접 입력</label>
              <input
                type="text"
                placeholder="또는 신규 품목 직접 기입"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--input-bg, #020617)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                }}
              />
            </div>

            {/* Location */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>보관 위치 (선택)</label>
              <input
                type="text"
                placeholder="예: A-1-3"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--input-bg, #020617)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                }}
              />
            </div>

            {/* Quantity */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>수량</label>
              <input
                type="number"
                min="1"
                value={qtyInput}
                onChange={(e) => setQtyInput(parseInt(e.target.value) || 1)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--input-bg, #020617)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                }}
              />
            </div>

            {/* Requester User */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>대여자 / 신청자 성함</label>
              <input
                type="text"
                placeholder="대여자 이름 입력 (예: 홍길동)"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--input-bg, #020617)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                }}
              />
            </div>

            {/* Note */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>대여 사유 / 메모</label>
              <textarea
                placeholder="대여 사유를 상세하게 남겨주세요."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={3}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--input-bg, #020617)",
                  border: `1px solid ${PANEL_BORDER}`,
                  color: TEXT_MAIN,
                  fontSize: 12,
                  resize: "none",
                }}
              />
            </div>

            {formError && (
              <div style={{ fontSize: 12, color: DANGER, fontWeight: 600, background: "rgba(244, 63, 94, 0.1)", padding: "8px 12px", borderRadius: 6 }}>
                ⚠️ {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: ACCENT,
                border: "none",
                color: "#ffffff",
                padding: "10px 0",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                marginTop: 6,
              }}
            >
              {submitting ? "기록 전송 중..." : "대여/반납 로그 등록하기"}
            </button>
          </form>
        </div>

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
