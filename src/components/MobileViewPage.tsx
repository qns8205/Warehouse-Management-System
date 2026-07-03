import React, { useState, useMemo, useEffect, useRef } from "react";
import { InventoryItem, RentLog } from "../types";
import {
  ArrowLeft,
  Search,
  X,
  Package,
  Sun,
  Moon,
  Minus,
  Plus,
  MapPin,
  ChevronRight,
  Check,
  ImageOff,
} from "lucide-react";
import { getGoogleDriveImageUrl, isFuzzyMatch, formatTimestampLocal } from "../utils/drive";

interface MobileViewPageProps {
  inventory: InventoryItem[];
  onAddRentLog: (log: RentLog) => Promise<void>;
  onBack: () => void;
  isLightMode: boolean;
  toggleLightMode: () => void;
  connected: boolean;
}

type SheetMode = "detail" | "form" | null;

/**
 * 모바일 전용 "열람용 모드" 화면.
 * PC 레이아웃을 그대로 축소한 것이 아니라, 검색 -> 아이템 확인(사진 포함) -> 대여/반납
 * 흐름에만 집중한 터치 친화적 UI. 불량로그, 랙 위치도(모니터링)는 노출하지 않는다.
 */
export default function MobileViewPage({
  inventory,
  onAddRentLog,
  onBack,
  isLightMode,
  toggleLightMode,
  connected,
}: MobileViewPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [actionType, setActionType] = useState<"대여" | "반납">("대여");
  const [formUser, setFormUser] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [formNote, setFormNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<{ msg: string; type: "ok" | "error" | "warn" } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (msg: string, type: "ok" | "error" | "warn" = "ok") => {
    setLocalToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setLocalToast(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ---------- 색상 토큰 (기존 데스크탑 배색과 동일하게 유지) ----------
  const ACCENT = "#4f46e5";
  const ACCENT_LIGHT = "#818cf8";
  const GREEN = "#10b981";
  const GREEN_LIGHT = "#34d399";
  const DANGER = "#ef4444";
  const BG = isLightMode ? "#f8fafc" : "#0b0f19";
  const HEADER_BG = isLightMode ? "#ffffff" : "#151d30";
  const CARD_BG = isLightMode ? "#ffffff" : "#151d30";
  const BORDER = isLightMode ? "#e2e8f0" : "#222f4b";
  const TEXT_MAIN = isLightMode ? "#0f172a" : "#f1f5f9";
  const TEXT_DIM = isLightMode ? "#64748b" : "#94a3b8";
  const INPUT_BG = isLightMode ? "#f8fafc" : "#0f172a";

  // ---------- 검색 필터 ----------
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    return inventory.filter(
      (item) =>
        isFuzzyMatch(item.name || "", searchQuery) ||
        isFuzzyMatch(item.location || "", searchQuery) ||
        (item.spec && isFuzzyMatch(item.spec, searchQuery))
    );
  }, [inventory, searchQuery]);

  const isRentDisabled = (item: InventoryItem) =>
    item.stock === null || (typeof item.stock === "number" ? item.stock <= 0 : false);

  const openDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setSheetMode("detail");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setTimeout(() => setSelectedItem(null), 200);
  };

  const openForm = (type: "대여" | "반납") => {
    if (!selectedItem) return;
    setActionType(type);
    setFormUser("");
    setFormQty(1);
    setFormNote("");
    setSheetMode("form");
  };

  const backToDetail = () => setSheetMode("detail");

  const maxQty =
    actionType === "대여" && selectedItem && typeof selectedItem.stock === "number"
      ? selectedItem.stock
      : undefined;

  const handleSubmit = async () => {
    if (!selectedItem) return;
    if (!formUser.trim()) {
      notify("이름을 입력해 주세요.", "warn");
      return;
    }
    if (formQty <= 0) {
      notify("수량은 1개 이상이어야 합니다.", "warn");
      return;
    }
    if (maxQty !== undefined && formQty > maxQty) {
      notify(`현재고(${maxQty}개)를 초과할 수 없습니다.`, "warn");
      return;
    }

    setSubmitting(true);
    try {
      const log: RentLog = {
        timestamp: formatTimestampLocal(),
        location: selectedItem.location,
        name: selectedItem.name,
        type: actionType,
        qty: formQty,
        user: formUser.trim(),
        note: formNote.trim() || `${actionType} 신청 (모바일 열람용 모드)`,
      };
      await onAddRentLog(log);
      notify(
        actionType === "대여"
          ? `${selectedItem.name} ${formQty}개 대여 신청이 접수되었습니다.`
          : `${selectedItem.name} ${formQty}개 반납이 접수되었습니다.`,
        "ok"
      );
      closeSheet();
    } catch (err: any) {
      notify("처리에 실패했습니다: " + (err?.message || "알 수 없는 오류"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: TEXT_MAIN,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .mvp-btn { cursor: pointer; border: none; transition: all 0.15s ease-in-out; }
        .mvp-btn:active { transform: scale(0.97); }
        .mvp-card:active { transform: scale(0.985); }
        .mvp-input:focus { border-color: ${ACCENT} !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.15) !important; }
        @keyframes mvpSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes mvpFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mvpToastIn { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        ::-webkit-scrollbar { width: 0px; height: 0px; }
      `}</style>

      {/* ===== 상단 헤더 (고정) ===== */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: HEADER_BG,
          borderBottom: `1px solid ${BORDER}`,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <button
            className="mvp-btn"
            onClick={onBack}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: isLightMode ? "#f1f5f9" : "#1e293b",
              color: TEXT_MAIN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: TEXT_MAIN, whiteSpace: "nowrap" }}>
              👀 열람용 모드
            </div>
            <div
              style={{
                fontSize: "10.5px",
                color: connected ? GREEN_LIGHT : "#f59e0b",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: connected ? GREEN : "#f59e0b",
                  display: "inline-block",
                }}
              />
              {connected ? "실시간 연동 중" : "데모 모드"}
            </div>
          </div>
        </div>

        <button
          className="mvp-btn"
          onClick={toggleLightMode}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: isLightMode ? "#f1f5f9" : "#1e293b",
            color: TEXT_MAIN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      {/* ===== 검색창 (고정) ===== */}
      <div
        style={{
          position: "sticky",
          top: "60px",
          zIndex: 19,
          background: BG,
          padding: "12px 14px 10px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: TEXT_DIM }}
          />
          <input
            className="mvp-input"
            type="text"
            inputMode="search"
            placeholder="품목명, 위치, 규격으로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: "12px",
              padding: "12px 14px 12px 38px",
              color: TEXT_MAIN,
              fontSize: "14px",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              className="mvp-btn"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                color: TEXT_DIM,
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div style={{ fontSize: "11px", color: TEXT_DIM, marginTop: "8px", fontWeight: 600 }}>
          총 {filteredItems.length}개 품목
        </div>
      </div>

      {/* ===== 아이템 리스트 ===== */}
      <main style={{ flex: 1, padding: "10px 14px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredItems.length === 0 ? (
          <div
            style={{
              marginTop: "40px",
              textAlign: "center",
              color: TEXT_DIM,
              fontSize: "13px",
            }}
          >
            <Package size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const hasImage = !!item.photo;
            const imageUrl = hasImage ? getGoogleDriveImageUrl(item.photo) : "";
            const stockLabel = item.stock === null ? "N/A" : `${item.stock}개`;
            const stockColor =
              item.stock === null ? TEXT_DIM : item.stock === 0 ? DANGER : GREEN;

            return (
              <div
                key={`${item.rowIndex}-${idx}`}
                className="mvp-card"
                onClick={() => openDetail(item)}
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "16px",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: isLightMode ? "#f1f5f9" : "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {hasImage ? (
                    <img
                      src={imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Package size={20} color={TEXT_DIM} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 800,
                      color: TEXT_MAIN,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name || "(이름 없음)"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: TEXT_DIM,
                      marginTop: "3px",
                    }}
                  >
                    <MapPin size={10} />
                    <span className="mono">{item.location || "위치 미지정"}</span>
                    {item.spec && (
                      <>
                        <span>·</span>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.spec}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: stockColor,
                      background: item.stock === 0 ? "rgba(239,68,68,0.1)" : item.stock === null ? "transparent" : "rgba(16,185,129,0.1)",
                      padding: "3px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {stockLabel}
                  </span>
                  <ChevronRight size={16} color={TEXT_DIM} />
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ===== 상세/신청 바텀시트 ===== */}
      {sheetMode && selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            animation: "mvpFadeIn 0.15s ease-out",
          }}
        >
          {/* 배경 오버레이 */}
          <div
            onClick={closeSheet}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(2, 6, 17, 0.6)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* 시트 본체 */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxHeight: "88vh",
              background: isLightMode ? "#ffffff" : "#101827",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.3)",
              animation: "mvpSheetUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* 손잡이 바 */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "999px", background: BORDER }} />
            </div>

            <div style={{ overflowY: "auto", padding: "8px 20px 20px" }}>
              {sheetMode === "detail" ? (
                <>
                  {/* 사진 */}
                  <div
                    onClick={() => selectedItem.photo && setLightbox(getGoogleDriveImageUrl(selectedItem.photo))}
                    style={{
                      width: "100%",
                      aspectRatio: "1.4 / 1",
                      borderRadius: "18px",
                      overflow: "hidden",
                      background: isLightMode ? "#f1f5f9" : "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      cursor: selectedItem.photo ? "zoom-in" : "default",
                    }}
                  >
                    {selectedItem.photo ? (
                      <img
                        src={getGoogleDriveImageUrl(selectedItem.photo)}
                        alt={selectedItem.name}
                        referrerPolicy="no-referrer"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", color: TEXT_DIM }}>
                        <ImageOff size={32} />
                        <span style={{ fontSize: "12px" }}>등록된 사진이 없습니다</span>
                      </div>
                    )}
                  </div>

                  {/* 이름 & 정보 */}
                  <h2 style={{ fontSize: "19px", fontWeight: 800, color: TEXT_MAIN, marginBottom: "6px" }}>
                    {selectedItem.name || "(이름 없음)"}
                  </h2>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: ACCENT_LIGHT,
                        background: "rgba(99,102,241,0.12)",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <MapPin size={11} />
                      {selectedItem.location || "위치 미지정"}
                    </span>
                    {selectedItem.spec && (
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          color: TEXT_DIM,
                          background: isLightMode ? "#f1f5f9" : "#1e293b",
                          padding: "4px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {selectedItem.spec}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 800,
                        color:
                          selectedItem.stock === null ? TEXT_DIM : selectedItem.stock === 0 ? DANGER : GREEN,
                        background:
                          selectedItem.stock === 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                        padding: "4px 10px",
                        borderRadius: "999px",
                      }}
                    >
                      현재고: {selectedItem.stock === null ? "N/A" : `${selectedItem.stock}개`}
                    </span>
                  </div>

                  {selectedItem.note && (
                    <div
                      style={{
                        background: isLightMode ? "#f8fafc" : "#0f172a",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "12px",
                        padding: "12px 14px",
                        fontSize: "12.5px",
                        color: TEXT_DIM,
                        marginBottom: "16px",
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: TEXT_MAIN }}>📝 비고 · </span>
                      {selectedItem.note}
                    </div>
                  )}

                  {selectedItem.manager && (
                    <div style={{ fontSize: "11px", color: TEXT_DIM, marginBottom: "16px" }}>
                      관리 담당자: <b style={{ color: TEXT_MAIN }}>{selectedItem.manager}</b>
                      {selectedItem.updatedAt && <> · 최종수정 {selectedItem.updatedAt.split(" ")[0]}</>}
                    </div>
                  )}

                  {/* 대여/반납 버튼 */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    <button
                      className="mvp-btn"
                      onClick={() => openForm("대여")}
                      disabled={isRentDisabled(selectedItem)}
                      style={{
                        flex: 1,
                        background: ACCENT,
                        color: "#ffffff",
                        borderRadius: "14px",
                        padding: "14px",
                        fontSize: "14.5px",
                        fontWeight: 800,
                        opacity: isRentDisabled(selectedItem) ? 0.4 : 1,
                        cursor: isRentDisabled(selectedItem) ? "not-allowed" : "pointer",
                        boxShadow: "0 6px 16px rgba(79,70,229,0.3)",
                      }}
                    >
                      📥 대여하기
                    </button>
                    <button
                      className="mvp-btn"
                      onClick={() => openForm("반납")}
                      style={{
                        flex: 1,
                        background: GREEN,
                        color: "#ffffff",
                        borderRadius: "14px",
                        padding: "14px",
                        fontSize: "14.5px",
                        fontWeight: 800,
                        boxShadow: "0 6px 16px rgba(16,185,129,0.3)",
                      }}
                    >
                      🔄 반납하기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* ===== 대여/반납 신청 폼 ===== */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <button
                      className="mvp-btn"
                      onClick={backToDetail}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: isLightMode ? "#f1f5f9" : "#1e293b",
                        color: TEXT_MAIN,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <h2
                      style={{
                        fontSize: "17px",
                        fontWeight: 800,
                        color: actionType === "대여" ? ACCENT_LIGHT : GREEN,
                        margin: 0,
                      }}
                    >
                      {actionType === "대여" ? "📥 물품 대여 신청" : "🔄 물품 반납 접수"}
                    </h2>
                  </div>

                  <div
                    style={{
                      background: isLightMode ? "#f8fafc" : "#0f172a",
                      border: `1px solid ${BORDER}`,
                      borderRadius: "12px",
                      padding: "12px 14px",
                      marginBottom: "18px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {selectedItem.photo ? (
                      <img
                        src={getGoogleDriveImageUrl(selectedItem.photo)}
                        alt={selectedItem.name}
                        referrerPolicy="no-referrer"
                        style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          background: isLightMode ? "#e2e8f0" : "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Package size={16} color={TEXT_DIM} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: TEXT_MAIN, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {selectedItem.name}
                      </div>
                      <div style={{ fontSize: "11px", color: TEXT_DIM }}>
                        위치: {selectedItem.location} · 현재고: {selectedItem.stock === null ? "N/A" : `${selectedItem.stock}개`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: TEXT_DIM }}>
                        {actionType === "대여" ? "대여자 이름" : "반납자 이름"} <span style={{ color: DANGER }}>*</span>
                      </label>
                      <input
                        className="mvp-input"
                        type="text"
                        placeholder="예: 홍길동"
                        value={formUser}
                        onChange={(e) => setFormUser(e.target.value)}
                        style={{
                          width: "100%",
                          background: INPUT_BG,
                          border: `1px solid ${BORDER}`,
                          borderRadius: "12px",
                          padding: "13px 14px",
                          color: TEXT_MAIN,
                          fontSize: "15px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: TEXT_DIM }}>
                        수량 <span style={{ color: DANGER }}>*</span>
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                          className="mvp-btn"
                          onClick={() => setFormQty((q) => Math.max(1, q - 1))}
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            background: isLightMode ? "#f1f5f9" : "#1e293b",
                            color: TEXT_MAIN,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={18} />
                        </button>
                        <div
                          className="mono"
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: "20px",
                            fontWeight: 800,
                            color: TEXT_MAIN,
                          }}
                        >
                          {formQty}
                        </div>
                        <button
                          className="mvp-btn"
                          onClick={() => setFormQty((q) => (maxQty !== undefined ? Math.min(maxQty, q + 1) : q + 1))}
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            background: isLightMode ? "#f1f5f9" : "#1e293b",
                            color: TEXT_MAIN,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      {maxQty !== undefined && formQty >= maxQty && (
                        <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                          현재고({maxQty}개)까지 대여할 수 있습니다.
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: TEXT_DIM }}>
                        메모 (선택)
                      </label>
                      <input
                        className="mvp-input"
                        type="text"
                        placeholder="예: 테스트 목적 대여"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        style={{
                          width: "100%",
                          background: INPUT_BG,
                          border: `1px solid ${BORDER}`,
                          borderRadius: "12px",
                          padding: "13px 14px",
                          color: TEXT_MAIN,
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <button
                      className="mvp-btn"
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{
                        width: "100%",
                        background: actionType === "대여" ? ACCENT : GREEN,
                        color: "#ffffff",
                        borderRadius: "14px",
                        padding: "15px",
                        fontSize: "15px",
                        fontWeight: 800,
                        opacity: submitting ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        marginTop: "4px",
                        boxShadow: `0 8px 20px ${actionType === "대여" ? "rgba(79,70,229,0.3)" : "rgba(16,185,129,0.3)"}`,
                      }}
                    >
                      <Check size={17} />
                      {submitting ? "제출 중..." : actionType === "대여" ? "대여 신청 제출" : "반납 접수 제출"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 사진 라이트박스 ===== */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            animation: "mvpFadeIn 0.15s ease-out",
          }}
        >
          <button
            className="mvp-btn"
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="확대 이미지"
            referrerPolicy="no-referrer"
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "12px", objectFit: "contain" }}
          />
        </div>
      )}

      {/* ===== 로컬 토스트 ===== */}
      {localToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            background:
              localToast.type === "ok" ? "#10b981" : localToast.type === "error" ? "#ef4444" : "#f59e0b",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: 700,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            maxWidth: "90vw",
            textAlign: "center",
            animation: "mvpToastIn 0.2s ease-out",
          }}
        >
          {localToast.msg}
        </div>
      )}
    </div>
  );
}
