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
  PlusCircle,
  MapPin,
  ChevronRight,
  Check,
  ImageOff,
  User,
  Clock,
} from "lucide-react";
import { getGoogleDriveImageUrl, isFuzzyMatch, formatTimestampLocal } from "../utils/drive";

interface MobileViewPageProps {
  inventory: InventoryItem[];
  rentLogs: RentLog[];
  onAddRentLog: (log: RentLog) => Promise<void>;
  onBack: () => void;
  isLightMode: boolean;
  toggleLightMode: () => void;
  connected: boolean;
}

type Mode = "대여" | "반납";
type SheetMode = "detail" | "form" | null;

interface OutstandingRental {
  key: string;
  name: string;
  location: string;
  user: string;
  qty: number;
  lastTimestamp: string;
}

/**
 * 모바일 전용 "열람용 모드" 화면.
 * PC 화면을 그대로 축소한 것이 아니라, 맨 위의 [대여]/[반납] 두 버튼으로 모드를 고른 뒤
 * - 대여: 전체 품목을 검색/열람하며 바로 대여
 * - 반납: 지금까지 대여했지만 아직 반납되지 않은 물품만 모아서 보여주고 바로 반납
 * 흐름에만 집중한 터치 친화적 UI. 불량로그, 랙 위치도(모니터링)는 노출하지 않는다.
 */
export default function MobileViewPage({
  inventory,
  rentLogs,
  onAddRentLog,
  onBack,
  isLightMode,
  toggleLightMode,
  connected,
}: MobileViewPageProps) {
  const [mode, setMode] = useState<Mode>("대여");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [outstandingContext, setOutstandingContext] = useState<OutstandingRental | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);

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
  const AMBER = "#f59e0b";
  const BG = isLightMode ? "#f8fafc" : "#0b0f19";
  const HEADER_BG = isLightMode ? "#ffffff" : "#151d30";
  const CARD_BG = isLightMode ? "#ffffff" : "#151d30";
  const BORDER = isLightMode ? "#e2e8f0" : "#222f4b";
  const TEXT_MAIN = isLightMode ? "#0f172a" : "#f1f5f9";
  const TEXT_DIM = isLightMode ? "#64748b" : "#94a3b8";
  const INPUT_BG = isLightMode ? "#f8fafc" : "#0f172a";
  const MODE_COLOR = mode === "대여" ? ACCENT : GREEN;
  const MODE_COLOR_LIGHT = mode === "대여" ? ACCENT_LIGHT : GREEN_LIGHT;

  // ---------- 대여 가능 여부: 숫자 재고가 0 이하일 때만 차단, N/A(문자/없음)는 항상 대여 가능 ----------
  const isRentDisabled = (item: InventoryItem) =>
    typeof item.stock === "number" && item.stock <= 0;

  // ---------- 대여 탭: 전체 재고 검색 ----------
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    return inventory.filter(
      (item) =>
        isFuzzyMatch(item.name || "", searchQuery) ||
        isFuzzyMatch(item.location || "", searchQuery) ||
        (item.spec && isFuzzyMatch(item.spec, searchQuery))
    );
  }, [inventory, searchQuery]);

  // ---------- 반납 탭: 아직 반납되지 않은(미반납) 대여 내역 집계 ----------
  const outstandingRentals = useMemo(() => {
    const map = new Map<string, OutstandingRental>();
    for (const log of rentLogs) {
      const name = (log.name || "").trim();
      const location = (log.location || "").trim();
      const user = (log.user || "").trim();
      if (!name) continue;
      const key = `${name}||${location}||${user}`;
      const qtyNum = Number(log.qty) || 0;
      const delta = log.type === "대여" ? qtyNum : -qtyNum;
      const existing = map.get(key);
      if (existing) {
        existing.qty += delta;
        if ((log.timestamp || "") > existing.lastTimestamp) existing.lastTimestamp = log.timestamp || "";
      } else {
        map.set(key, { key, name, location, user, qty: delta, lastTimestamp: log.timestamp || "" });
      }
    }
    return Array.from(map.values())
      .filter((o) => o.qty > 0)
      .sort((a, b) => (b.lastTimestamp || "").localeCompare(a.lastTimestamp || ""));
  }, [rentLogs]);

  const filteredOutstanding = useMemo(() => {
    if (!searchQuery.trim()) return outstandingRentals;
    return outstandingRentals.filter(
      (o) =>
        isFuzzyMatch(o.name, searchQuery) ||
        isFuzzyMatch(o.location, searchQuery) ||
        isFuzzyMatch(o.user, searchQuery)
    );
  }, [outstandingRentals, searchQuery]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSearchQuery("");
  };

  // ---------- 대여 탭에서 품목 탭 ----------
  const openItemDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setOutstandingContext(null);
    setSheetMode("detail");
  };

  // ---------- 반납 탭에서 미반납 내역 탭 ----------
  const openReturnDetail = (outstanding: OutstandingRental) => {
    const matched = inventory.find(
      (inv) => (inv.name || "").trim() === outstanding.name && (inv.location || "").trim() === outstanding.location
    );
    const item: InventoryItem =
      matched ||
      ({
        rowIndex: -1,
        location: outstanding.location,
        photo: "",
        name: outstanding.name,
        link: "N/A",
        stock: "N/A",
        updatedAt: "",
        manager: "",
        note: "",
        spec: "",
      } as InventoryItem);
    setSelectedItem(item);
    setOutstandingContext(outstanding);
    setSheetMode("detail");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setTimeout(() => {
      setSelectedItem(null);
      setOutstandingContext(null);
    }, 200);
  };

  const openForm = () => {
    if (!selectedItem) return;
    if (mode === "반납" && outstandingContext) {
      setFormUser(outstandingContext.user);
      setFormQty(outstandingContext.qty);
    } else {
      setFormUser("");
      setFormQty(1);
    }
    setFormNote("");
    setSheetMode("form");
  };

  const backToDetail = () => setSheetMode("detail");

  // ---------- 검색해도 리스트에 없는 품목을 "검색한 내용 그대로" 새 품목으로 등록 ----------
  // 대여 탭: 검색어를 품목명으로 그대로 사용해 새 품목 대여 신청 폼으로 바로 이동
  // 반납 탭: 미반납 목록에 없는 품목도 검색어 그대로 반납 접수 폼으로 바로 이동
  const startCustomEntryFromSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const customItem: InventoryItem = {
      rowIndex: -1,
      location: "",
      photo: "",
      name: trimmed,
      link: "N/A",
      stock: "N/A",
      updatedAt: "",
      manager: "",
      note: "",
      spec: "",
    };
    setSelectedItem(customItem);
    setOutstandingContext(null);
    setFormUser("");
    setFormQty(1);
    setFormNote("");
    setSheetMode("form");
  };

  const isCustomEntry = selectedItem?.rowIndex === -1;

  const maxQty =
    mode === "대여" && selectedItem && typeof selectedItem.stock === "number"
      ? selectedItem.stock
      : mode === "반납" && outstandingContext
      ? outstandingContext.qty
      : undefined;

  const handleSubmit = async () => {
    if (!selectedItem) return;
    if (isCustomEntry && !selectedItem.name.trim()) {
      notify("품목명을 입력해 주세요.", "warn");
      return;
    }
    if (!formUser.trim()) {
      notify("이름을 입력해 주세요.", "warn");
      return;
    }
    if (formQty <= 0) {
      notify("수량은 1개 이상이어야 합니다.", "warn");
      return;
    }
    if (maxQty !== undefined && formQty > maxQty) {
      notify(
        mode === "대여" ? `현재고(${maxQty}개)를 초과할 수 없습니다.` : `미반납 수량(${maxQty}개)을 초과할 수 없습니다.`,
        "warn"
      );
      return;
    }

    setSubmitting(true);
    try {
      const log: RentLog = {
        timestamp: formatTimestampLocal(),
        location: selectedItem.location.trim(),
        name: selectedItem.name.trim(),
        type: mode,
        qty: formQty,
        user: formUser.trim(),
        note: formNote.trim() || `${mode} 처리 (모바일 열람용 모드)`,
      };
      await onAddRentLog(log);
      notify(
        mode === "대여"
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

  const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    background: INPUT_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: "12px",
    padding: "13px 14px",
    color: TEXT_MAIN,
    fontSize: "15px",
    outline: "none",
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
        .mvp-btn:disabled { cursor: not-allowed; }
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
                color: connected ? GREEN_LIGHT : AMBER,
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
                  background: connected ? GREEN : AMBER,
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

      {/* ===== 대여/반납 모드 탭 + 검색창 (고정) ===== */}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            background: isLightMode ? "#f1f5f9" : "#111827",
            padding: "4px",
            borderRadius: "14px",
            marginBottom: "10px",
          }}
        >
          <button
            className="mvp-btn"
            onClick={() => switchMode("대여")}
            style={{
              padding: "13px",
              borderRadius: "11px",
              fontSize: "14.5px",
              fontWeight: 800,
              background: mode === "대여" ? ACCENT : "transparent",
              color: mode === "대여" ? "#ffffff" : TEXT_DIM,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: mode === "대여" ? "0 6px 14px rgba(79,70,229,0.3)" : "none",
            }}
          >
            📥 대여
          </button>
          <button
            className="mvp-btn"
            onClick={() => switchMode("반납")}
            style={{
              padding: "13px",
              borderRadius: "11px",
              fontSize: "14.5px",
              fontWeight: 800,
              background: mode === "반납" ? GREEN : "transparent",
              color: mode === "반납" ? "#ffffff" : TEXT_DIM,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: mode === "반납" ? "0 6px 14px rgba(16,185,129,0.3)" : "none",
            }}
          >
            🔄 반납
            {outstandingRentals.length > 0 && (
              <span
                style={{
                  background: mode === "반납" ? "rgba(255,255,255,0.25)" : DANGER,
                  color: "#ffffff",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  borderRadius: "999px",
                  padding: "1px 7px",
                }}
              >
                {outstandingRentals.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: TEXT_DIM }}
          />
          <input
            className="mvp-input"
            type="text"
            inputMode="search"
            placeholder={mode === "대여" ? "품목명, 위치, 규격으로 검색" : "품목명, 위치, 대여자 이름으로 검색"}
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
          {mode === "대여" ? `총 ${filteredInventory.length}개 품목` : `미반납 ${filteredOutstanding.length}건`}
        </div>
      </div>

      {/* ===== 리스트 ===== */}
      <main style={{ flex: 1, padding: "10px 14px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {mode === "대여" ? (
          filteredInventory.length === 0 ? (
            <div style={{ marginTop: "40px", textAlign: "center", color: TEXT_DIM, fontSize: "13px" }}>
              <Package size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
              검색 결과가 없습니다.
              {searchQuery.trim() && (
                <div style={{ marginTop: "16px" }}>
                  <button
                    className="mvp-btn"
                    onClick={startCustomEntryFromSearch}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: ACCENT,
                      color: "#ffffff",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      fontSize: "13px",
                      fontWeight: 800,
                      boxShadow: "0 6px 16px rgba(79,70,229,0.3)",
                    }}
                  >
                    <PlusCircle size={15} />"{searchQuery.trim()}" 새 품목으로 등록하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredInventory.map((item, idx) => {
              const hasImage = !!item.photo;
              const imageUrl = hasImage ? getGoogleDriveImageUrl(item.photo) : "";
              const stockLabel = item.stock === null || item.stock === "N/A" ? "N/A" : `${item.stock}개`;
              const stockColor =
                item.stock === null || item.stock === "N/A"
                  ? TEXT_DIM
                  : item.stock === 0
                  ? DANGER
                  : GREEN;

              return (
                <div
                  key={`${item.rowIndex}-${idx}`}
                  className="mvp-card"
                  onClick={() => openItemDetail(item)}
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
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                        background:
                          item.stock === 0 ? "rgba(239,68,68,0.1)" : item.stock === null || item.stock === "N/A" ? "transparent" : "rgba(16,185,129,0.1)",
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
          )
        ) : filteredOutstanding.length === 0 ? (
          <div style={{ marginTop: "40px", textAlign: "center", color: TEXT_DIM, fontSize: "13px" }}>
            <Check size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            {searchQuery ? "검색 결과가 없습니다." : "현재 반납할 물품이 없습니다."}
            {searchQuery.trim() && (
              <div style={{ marginTop: "16px" }}>
                <button
                  className="mvp-btn"
                  onClick={startCustomEntryFromSearch}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: GREEN,
                    color: "#ffffff",
                    borderRadius: "999px",
                    padding: "11px 18px",
                    fontSize: "13px",
                    fontWeight: 800,
                    boxShadow: "0 6px 16px rgba(16,185,129,0.3)",
                  }}
                >
                  <PlusCircle size={15} />"{searchQuery.trim()}" 직접 반납 접수하기
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredOutstanding.map((o) => {
            const matched = inventory.find(
              (inv) => (inv.name || "").trim() === o.name && (inv.location || "").trim() === o.location
            );
            const hasImage = !!matched?.photo;
            const imageUrl = hasImage ? getGoogleDriveImageUrl(matched!.photo) : "";

            return (
              <div
                key={o.key}
                className="mvp-card"
                onClick={() => openReturnDetail(o)}
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
                      alt={o.name}
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
                    {o.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: TEXT_DIM, marginTop: "3px" }}>
                    <MapPin size={10} />
                    <span className="mono">{o.location || "위치 미지정"}</span>
                    <span>·</span>
                    <User size={10} />
                    <span>{o.user || "이름 미상"}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: AMBER,
                      background: "rgba(245,158,11,0.12)",
                      padding: "3px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    미반납 {o.qty}개
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
          <div
            onClick={closeSheet}
            style={{ position: "absolute", inset: 0, background: "rgba(2, 6, 17, 0.6)", backdropFilter: "blur(2px)" }}
          />

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

                    {mode === "대여" ? (
                      <>
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
                              selectedItem.stock === null || selectedItem.stock === "N/A"
                                ? TEXT_DIM
                                : selectedItem.stock === 0
                                ? DANGER
                                : GREEN,
                            background: selectedItem.stock === 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                            padding: "4px 10px",
                            borderRadius: "999px",
                          }}
                        >
                          현재고: {selectedItem.stock === null || selectedItem.stock === "N/A" ? "N/A" : `${selectedItem.stock}개`}
                        </span>
                      </>
                    ) : (
                      outstandingContext && (
                        <>
                          <span
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 700,
                              color: TEXT_DIM,
                              background: isLightMode ? "#f1f5f9" : "#1e293b",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <User size={11} />
                            {outstandingContext.user || "이름 미상"}
                          </span>
                          <span
                            style={{
                              fontSize: "11.5px",
                              fontWeight: 800,
                              color: AMBER,
                              background: "rgba(245,158,11,0.12)",
                              padding: "4px 10px",
                              borderRadius: "999px",
                            }}
                          >
                            미반납 수량: {outstandingContext.qty}개
                          </span>
                        </>
                      )
                    )}
                  </div>

                  {mode === "반납" && outstandingContext?.lastTimestamp && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11px",
                        color: TEXT_DIM,
                        marginBottom: "14px",
                      }}
                    >
                      <Clock size={11} />
                      최근 대여일시: {outstandingContext.lastTimestamp}
                    </div>
                  )}

                  {mode === "대여" && selectedItem.note && (
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

                  <button
                    className="mvp-btn"
                    onClick={openForm}
                    disabled={mode === "대여" && isRentDisabled(selectedItem)}
                    style={{
                      width: "100%",
                      background: MODE_COLOR,
                      color: "#ffffff",
                      borderRadius: "14px",
                      padding: "14px",
                      fontSize: "14.5px",
                      fontWeight: 800,
                      opacity: mode === "대여" && isRentDisabled(selectedItem) ? 0.4 : 1,
                      cursor: mode === "대여" && isRentDisabled(selectedItem) ? "not-allowed" : "pointer",
                      boxShadow: `0 6px 16px ${mode === "대여" ? "rgba(79,70,229,0.3)" : "rgba(16,185,129,0.3)"}`,
                    }}
                  >
                    {mode === "대여" ? "📥 대여하기" : "🔄 반납하기"}
                  </button>
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
                    <h2 style={{ fontSize: "17px", fontWeight: 800, color: MODE_COLOR_LIGHT, margin: 0 }}>
                      {mode === "대여" ? "📥 물품 대여 신청" : "🔄 물품 반납 접수"}
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
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: TEXT_MAIN,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {selectedItem.name}
                      </div>
                      <div style={{ fontSize: "11px", color: TEXT_DIM }}>
                        {mode === "대여"
                          ? `위치: ${selectedItem.location} · 현재고: ${
                              selectedItem.stock === null || selectedItem.stock === "N/A" ? "N/A" : `${selectedItem.stock}개`
                            }`
                          : `위치: ${selectedItem.location} · 미반납: ${outstandingContext?.qty ?? formQty}개`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {isCustomEntry && (
                      <div
                        style={{
                          background: mode === "대여" ? "rgba(79,70,229,0.08)" : "rgba(16,185,129,0.08)",
                          border: `1px solid ${mode === "대여" ? "rgba(79,70,229,0.25)" : "rgba(16,185,129,0.25)"}`,
                          borderRadius: "12px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ fontSize: "11.5px", fontWeight: 800, color: MODE_COLOR_LIGHT, display: "flex", alignItems: "center", gap: "5px" }}>
                          <PlusCircle size={13} />
                          리스트에 없는 새 품목 · 검색하신 내용으로 등록됩니다
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 700, color: TEXT_DIM }}>
                            품목명 <span style={{ color: DANGER }}>*</span>
                          </label>
                          <input
                            className="mvp-input"
                            type="text"
                            placeholder="품목명 입력"
                            value={selectedItem.name}
                            onChange={(e) =>
                              setSelectedItem((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                            }
                            style={inputBaseStyle}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 700, color: TEXT_DIM }}>위치 (선택)</label>
                          <input
                            className="mvp-input"
                            type="text"
                            placeholder="예: A-1 랙"
                            value={selectedItem.location}
                            onChange={(e) =>
                              setSelectedItem((prev) => (prev ? { ...prev, location: e.target.value } : prev))
                            }
                            style={inputBaseStyle}
                          />
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: TEXT_DIM }}>
                        {mode === "대여" ? "대여자 이름" : "반납자 이름"} <span style={{ color: DANGER }}>*</span>
                      </label>
                      <input
                        className="mvp-input"
                        type="text"
                        placeholder="예: 홍길동"
                        value={formUser}
                        onChange={(e) => setFormUser(e.target.value)}
                        style={inputBaseStyle}
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
                        <div className="mono" style={{ flex: 1, textAlign: "center", fontSize: "20px", fontWeight: 800, color: TEXT_MAIN }}>
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
                        <span style={{ fontSize: "11px", color: AMBER }}>
                          {mode === "대여" ? `현재고(${maxQty}개)까지 대여할 수 있습니다.` : `미반납 수량(${maxQty}개)까지 반납할 수 있습니다.`}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: TEXT_DIM }}>메모 (선택)</label>
                      <input
                        className="mvp-input"
                        type="text"
                        placeholder="예: 테스트 목적 대여"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                        style={{ ...inputBaseStyle, fontSize: "14px" }}
                      />
                    </div>

                    <button
                      className="mvp-btn"
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{
                        width: "100%",
                        background: MODE_COLOR,
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
                        boxShadow: `0 8px 20px ${mode === "대여" ? "rgba(79,70,229,0.3)" : "rgba(16,185,129,0.3)"}`,
                      }}
                    >
                      <Check size={17} />
                      {submitting ? "제출 중..." : mode === "대여" ? "대여 신청 제출" : "반납 접수 제출"}
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
            background: localToast.type === "ok" ? "#10b981" : localToast.type === "error" ? "#ef4444" : "#f59e0b",
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
