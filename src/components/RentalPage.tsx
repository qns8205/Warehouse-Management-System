import React, { useState, useMemo, useEffect, useRef } from "react";
import { InventoryItem, RentLog } from "../types";
import { ArrowLeft, Search, Check, ChevronDown, Package, User, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import { formatTimestampLocal, getGoogleDriveImageUrl } from "../utils/drive";

interface RentalPageProps {
  inventory: InventoryItem[];
  onAddRentLog: (log: RentLog) => Promise<void>;
  onBack: () => void;
  isLightMode: boolean;
  showToast: (msg: string, type: "ok" | "error" | "info" | "warn") => void;
}

export default function RentalPage({
  inventory,
  onAddRentLog,
  onBack,
  isLightMode,
  showToast,
}: RentalPageProps) {
  // 상태 선언
  const [rentUser, setRentUser] = useState("");
  const [actionType, setActionType] = useState<"대여" | "반납">("대여");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [rentQty, setRentQty] = useState(1);
  const [noteInput, setNoteInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지하여 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 검색 쿼리에 따라 물품 필터링
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return inventory;
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.spec && item.spec.toLowerCase().includes(q))
    );
  }, [inventory, searchQuery]);

  // 아이템 선택 시 기본 대여량 조절
  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setRentQty(1);
    setNoteInput("");
    setIsDropdownOpen(false);
  };

  // 대여/반납 신청서 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rentUser.trim()) {
      showToast("대여자(담당자) 이름을 입력해 주세요.", "warn");
      return;
    }
    if (!selectedItem) {
      showToast("대여 또는 반납할 품목을 선택해 주세요.", "warn");
      return;
    }
    if (rentQty <= 0) {
      showToast("수량은 1개 이상이어야 합니다.", "warn");
      return;
    }

    // 대여 수량 검증
    if (actionType === "대여") {
      const currentStock = selectedItem.stock ?? 0;
      if (currentStock <= 0) {
        showToast("선택한 물품의 현재고가 부족하여 대여할 수 없습니다.", "error");
        return;
      }
      if (rentQty > currentStock) {
        showToast(`현재고(${currentStock}개)를 초과하여 대여할 수 없습니다.`, "warn");
        return;
      }
    }

    setSubmitting(true);
    try {
      const log: RentLog = {
        timestamp: formatTimestampLocal(),
        location: selectedItem.location,
        name: selectedItem.name,
        type: actionType,
        qty: rentQty,
        user: rentUser.trim(),
        note: noteInput.trim() || `${actionType} 접수`,
      };

      await onAddRentLog(log);
      
      // 입력값 리셋
      setRentQty(1);
      setNoteInput("");
      setSearchQuery("");
      setSelectedItem(null);
      showToast(`${selectedItem.name} ${rentQty}개 ${actionType} 접수가 완료되었습니다!`, "ok");
    } catch (err: any) {
      showToast("대여 처리에 실패했습니다: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isLightMode ? "#f8fafc" : "#0b0f19",
        color: isLightMode ? "#0f172a" : "#f1f5f9",
        padding: "40px 20px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* 뒤로가기 버튼 */}
      <div style={{ maxWidth: "1000px", width: "100%", marginBottom: "24px", display: "flex", justifyContent: "flex-start" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: isLightMode ? "#ffffff" : "#1e293b",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "#334155"}`,
            color: isLightMode ? "#475569" : "#94a3b8",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            padding: "10px 16px",
            borderRadius: "12px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          <ArrowLeft size={16} />
          처음 화면으로
        </button>
      </div>

      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "32px",
        }}
      >
        {/* 왼쪽: 대여/반납 신청 폼 */}
        <div
          style={{
            background: isLightMode ? "#ffffff" : "#151d30",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "#222f4b"}`,
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: isLightMode ? "#0f172a" : "#f1f5f9", marginBottom: "8px" }}>
            📋 대여 및 반납 신청서
          </h2>
          <p style={{ fontSize: "12px", color: isLightMode ? "#64748b" : "#94a3b8", marginBottom: "24px" }}>
            필요한 자재의 대여 또는 반납을 신청하면 실시간으로 재고가 정산됩니다.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 대여 / 반납 토글 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#94a3b8" }}>
                구분
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: isLightMode ? "#f1f5f9" : "#0f172a", padding: "4px", borderRadius: "10px" }}>
                <button
                  type="button"
                  onClick={() => setActionType("대여")}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: actionType === "대여" ? "#4f46e5" : "transparent",
                    color: actionType === "대여" ? "#ffffff" : (isLightMode ? "#475569" : "#94a3b8"),
                    transition: "all 0.2s",
                  }}
                >
                  📥 자재 대여
                </button>
                <button
                  type="button"
                  onClick={() => setActionType("반납")}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: actionType === "반납" ? "#10b981" : "transparent",
                    color: actionType === "반납" ? "#ffffff" : (isLightMode ? "#475569" : "#94a3b8"),
                    transition: "all 0.2s",
                  }}
                >
                  🔄 자재 반납
                </button>
              </div>
            </div>

            {/* 대여자 담당자 이름 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#94a3b8" }}>
                대여/반납 담당자 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: isLightMode ? "#94a3b8" : "#64748b" }} />
                <input
                  type="text"
                  placeholder="예: 홍길동 대리"
                  value={rentUser}
                  onChange={(e) => setRentUser(e.target.value)}
                  style={{
                    width: "100%",
                    background: isLightMode ? "#f8fafc" : "#0f172a",
                    border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                    borderRadius: "10px",
                    padding: "10px 12px 10px 38px",
                    color: isLightMode ? "#0f172a" : "#f1f5f9",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* 대여 품목 선택 드롭다운 및 검색창 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#94a3b8" }}>
                품목 검색 및 선택 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              
              <div ref={dropdownRef} style={{ position: "relative" }}>
                {/* 검색 필드 */}
                <div style={{ position: "relative", marginBottom: "4px" }}>
                  <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: isLightMode ? "#94a3b8" : "#64748b" }} />
                  <input
                    type="text"
                    placeholder="품목 이름, 규격 또는 위치 검색..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    style={{
                      width: "100%",
                      background: isLightMode ? "#f8fafc" : "#0f172a",
                      border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                      borderRadius: "10px",
                      padding: "10px 12px 10px 38px",
                      color: isLightMode ? "#0f172a" : "#f1f5f9",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* 선택된 품목 트리거 버튼 (드롭다운 열기/닫기) */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isLightMode ? "#f8fafc" : "#0f172a",
                    border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                    borderRadius: "10px",
                    padding: "12px",
                    color: selectedItem ? (isLightMode ? "#0f172a" : "#f1f5f9") : (isLightMode ? "#94a3b8" : "#64748b"),
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {selectedItem ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {selectedItem.photo ? (
                        <img
                          src={getGoogleDriveImageUrl(selectedItem.photo)}
                          alt={selectedItem.name}
                          referrerPolicy="no-referrer"
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            objectFit: "cover",
                            border: "1px solid rgba(0,0,0,0.1)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            background: "rgba(99,102,241,0.1)",
                            color: "#6366f1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Package size={16} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{selectedItem.name}</div>
                        <div style={{ fontSize: "11px", color: isLightMode ? "#64748b" : "#94a3b8" }}>
                          위치: {selectedItem.location} | 재고: {selectedItem.stock ?? 0}개
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span>--- 대여할 품목을 선택해 주세요 ---</span>
                  )}
                  <ChevronDown size={16} style={{ color: isLightMode ? "#64748b" : "#94a3b8" }} />
                </button>

                {/* 커스텀 이미지 드롭다운 메뉴 */}
                {isDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: isLightMode ? "#ffffff" : "#1e293b",
                      border: `1px solid ${isLightMode ? "#cbd5e1" : "#334155"}`,
                      borderRadius: "12px",
                      marginTop: "6px",
                      maxHeight: "260px",
                      overflowY: "auto",
                      zIndex: 1000,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    {filteredItems.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: isLightMode ? "#64748b" : "#94a3b8" }}>
                        일치하는 자재 품목이 없습니다.
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = selectedItem?.rowIndex === item.rowIndex;
                        return (
                          <div
                            key={item.rowIndex}
                            onClick={() => handleSelectItem(item)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              borderBottom: `1px solid ${isLightMode ? "#f1f5f9" : "#222f4b"}`,
                              cursor: "pointer",
                              background: isSelected
                                ? "rgba(99,102,241,0.08)"
                                : "transparent",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = isLightMode ? "#f8fafc" : "#273549";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {item.photo ? (
                                <img
                                  src={getGoogleDriveImageUrl(item.photo)}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    objectFit: "cover",
                                    border: "1px solid rgba(0,0,0,0.1)",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    background: "rgba(99,102,241,0.08)",
                                    color: "#6366f1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Package size={18} />
                                </div>
                              )}
                              <div style={{ textAlign: "left" }}>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: isLightMode ? "#1e293b" : "#f1f5f9" }}>{item.name}</div>
                                <div style={{ fontSize: "11px", color: isLightMode ? "#64748b" : "#94a3b8" }}>
                                  위치: <span style={{ color: "#6366f1", fontWeight: 600 }}>{item.location}</span> | 재고: <span style={{ color: "#10b981", fontWeight: 600 }}>{item.stock ?? 0}개</span>
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check size={16} style={{ color: "#6366f1" }} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 수량 입력 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#94a3b8" }}>
                대여/반납 수량 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setRentQty((prev) => Math.max(1, prev - 1))}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    background: isLightMode ? "#f1f5f9" : "#0f172a",
                    border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                    color: isLightMode ? "#475569" : "#f1f5f9",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    width: "40px",
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={rentQty}
                  onChange={(e) => setRentQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: isLightMode ? "#f8fafc" : "#0f172a",
                    border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                    borderRadius: "10px",
                    padding: "10px 12px",
                    color: isLightMode ? "#0f172a" : "#f1f5f9",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (actionType === "대여" && selectedItem && rentQty >= (selectedItem.stock ?? 0)) {
                      showToast("재고를 초과할 수 없습니다.", "warn");
                      return;
                    }
                    setRentQty((prev) => prev + 1);
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    background: isLightMode ? "#f1f5f9" : "#0f172a",
                    border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                    color: isLightMode ? "#475569" : "#f1f5f9",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    width: "40px",
                  }}
                >
                  +
                </button>
              </div>
              {actionType === "대여" && selectedItem && (selectedItem.stock ?? 0) < rentQty && (
                <span style={{ fontSize: "11px", color: "#ef4444", marginTop: "2px" }}>
                  ⚠️ 현재고({selectedItem.stock ?? 0}개)를 초과했습니다. 대여 신청을 완료할 수 없습니다.
                </span>
              )}
            </div>

            {/* 특이사항 / 대여 용도 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#94a3b8" }}>
                특이사항 / 용도 입력
              </label>
              <div style={{ position: "relative" }}>
                <FileText size={16} style={{ position: "absolute", left: "12px", top: "12px", color: isLightMode ? "#94a3b8" : "#64748b" }} />
                <textarea
                  placeholder="예: 프로젝트 테스트 장비 세팅용 대여 또는 파손 흔적 있음 등"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  style={{
                    width: "100%",
                    background: isLightMode ? "#f8fafc" : "#0f172a",
                    border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                    borderRadius: "10px",
                    padding: "10px 12px 10px 38px",
                    color: isLightMode ? "#0f172a" : "#f1f5f9",
                    fontSize: "13px",
                    outline: "none",
                    height: "80px",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={submitting || (actionType === "대여" && selectedItem && (selectedItem.stock ?? 0) < rentQty)}
              style={{
                width: "100%",
                background: actionType === "대여" ? "#4f46e5" : "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: `0 4px 14px ${actionType === "대여" ? "rgba(79, 70, 229, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                opacity: (submitting || (actionType === "대여" && selectedItem && (selectedItem.stock ?? 0) < rentQty)) ? 0.5 : 1,
                pointerEvents: (submitting || (actionType === "대여" && selectedItem && (selectedItem.stock ?? 0) < rentQty)) ? "none" : "auto",
                marginTop: "10px",
              }}
            >
              {submitting ? "처리 중..." : `${actionType} 신청서 제출하기`}
            </button>
          </form>
        </div>

        {/* 오른쪽: 선택한 품목 상세 설명 창 (Description Area) */}
        <div
          style={{
            background: isLightMode ? "#ffffff" : "#151d30",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "#222f4b"}`,
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: isLightMode ? "#0f172a" : "#f1f5f9", marginBottom: "8px" }}>
            🔍 선택한 품목 정보 상세
          </h2>
          <p style={{ fontSize: "12px", color: isLightMode ? "#64748b" : "#94a3b8", marginBottom: "24px" }}>
            품목을 선택하면 해당 자재의 실물 사진과 구글 시트에 기록된 특이사항을 한눈에 볼 수 있습니다.
          </p>

          {selectedItem ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
              {/* 이미지 영역 */}
              <div
                style={{
                  width: "100%",
                  height: "220px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: `1px solid ${isLightMode ? "#e2e8f0" : "#222f4b"}`,
                  background: isLightMode ? "#f8fafc" : "#0f172a",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selectedItem.photo ? (
                  <img
                    src={getGoogleDriveImageUrl(selectedItem.photo)}
                    alt={selectedItem.name}
                    referrerPolicy="no-referrer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: isLightMode ? "#94a3b8" : "#475569" }}>
                    <ImageIcon size={48} strokeWidth={1.2} />
                    <span style={{ fontSize: "12px" }}>등록된 물품 사진이 없습니다</span>
                  </div>
                )}
                {selectedItem.location && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      background: "rgba(79, 70, 229, 0.9)",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    위치: {selectedItem.location}
                  </span>
                )}
              </div>

              {/* 품목명과 규격 */}
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: isLightMode ? "#0f172a" : "#ffffff", marginBottom: "6px" }}>
                  {selectedItem.name}
                </h3>
                {selectedItem.spec && (
                  <div
                    style={{
                      fontSize: "12px",
                      background: isLightMode ? "#f1f5f9" : "rgba(255, 255, 255, 0.05)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      color: isLightMode ? "#475569" : "#cbd5e1",
                      display: "inline-block",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    규격: {selectedItem.spec}
                  </div>
                )}
              </div>

              {/* 디테일 메타 정보 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  background: isLightMode ? "#f8fafc" : "#0f172a",
                  padding: "16px",
                  borderRadius: "14px",
                  border: `1px solid ${isLightMode ? "#e2e8f0" : "#222f4b"}`,
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: isLightMode ? "#64748b" : "#94a3b8", marginBottom: "4px" }}>현재 재고 수량</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: (selectedItem.stock ?? 0) > 0 ? "#10b981" : "#ef4444" }}>
                    {selectedItem.stock ?? 0} 개
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: isLightMode ? "#64748b" : "#94a3b8", marginBottom: "4px" }}>최종 업데이트 시간</div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: isLightMode ? "#334155" : "#cbd5e1" }}>
                    {selectedItem.updatedAt || "N/A"}
                  </div>
                </div>
              </div>

              {/* 비고 / 특이사항 영역 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: isLightMode ? "#475569" : "#94a3b8" }}>
                  📋 시트 등록 특이사항 및 상세설명
                </span>
                <div
                  style={{
                    padding: "14px",
                    background: isLightMode ? "rgba(241, 245, 249, 0.5)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isLightMode ? "#e2e8f0" : "#222f4b"}`,
                    borderRadius: "12px",
                    fontSize: "12.5px",
                    lineHeight: 1.6,
                    color: selectedItem.note ? (isLightMode ? "#334155" : "#cbd5e1") : (isLightMode ? "#94a3b8" : "#64748b"),
                    minHeight: "70px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedItem.note || "스프레드시트에 등록된 별도의 특이사항이 없습니다."}
                </div>
              </div>

              {selectedItem.link && (
                <a
                  href={selectedItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    borderRadius: "10px",
                    background: "rgba(99, 102, 241, 0.1)",
                    color: "#818cf8",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                    marginTop: "auto",
                  }}
                >
                  🔗 구매 상세 링크 바로가기
                </a>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                minHeight: "300px",
                border: `2px dashed ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                borderRadius: "16px",
                padding: "24px",
                color: isLightMode ? "#94a3b8" : "#475569",
              }}
            >
              <Package size={48} strokeWidth={1.2} style={{ marginBottom: "12px" }} />
              <p style={{ fontSize: "13px", fontWeight: 600 }}>선택된 품목이 없습니다</p>
              <p style={{ fontSize: "11px", textAlign: "center", marginTop: "4px" }}>
                좌측의 품목 검색 또는 드롭다운을 통해 품목을 선택하면<br />
                해당 품목의 사진과 세부 명세가 노출됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
