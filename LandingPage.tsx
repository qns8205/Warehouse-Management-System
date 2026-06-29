import React, { useState, useEffect } from "react";
import { InventoryItem, Rack } from "../types";
import { parseLocation, hexToRgba, getGoogleDriveImageUrl } from "../utils/drive";
import { Trash2, Edit3, Plus, ExternalLink, Image, Package } from "lucide-react";

interface SidePanelProps {
  rack: Rack | undefined;
  shelvesWithItems: { shelf: string; items: InventoryItem[] }[];
  onClose: () => void;
  onUpdateRack: (fields: Partial<Rack>) => void;
  onDeleteRack: () => void;
  onEditItem: (item: InventoryItem) => void;
  onAddItem: () => void;
  onDeleteItem: (rowIndex: number) => void;
  highlightShelf: string | null;
  highlightedItemRowIndex?: number | null;
  onChangeStock: (item: InventoryItem, delta: number) => void;
  isAdmin?: boolean;
  onRentItem?: (item: InventoryItem, actionType: "대여" | "반납") => void;
  isLightMode?: boolean;
}

const PANEL = "var(--panel-bg, #1e293b)";
const PANEL_BORDER = "var(--panel-border, #334155)";
const TEXT_MAIN = "var(--text-main, #f1f5f9)";
const TEXT_DIM = "var(--text-dim, #94a3b8)";
const ACCENT = "#6366f1";
const DANGER = "#f43f5e";
const OK = "#10b981";
const WARN = "#f59e0b";

const PALETTE = ["#9CAF97", "#8FA3B8", "#D4A98C", "#AFA3C4", "#C9A0A0", "#C4B89C", "#7FB0AC", "#B8A88F"];

export default function SidePanel({
  rack,
  shelvesWithItems,
  onClose,
  onUpdateRack,
  onDeleteRack,
  onEditItem,
  onAddItem,
  onDeleteItem,
  highlightShelf,
  highlightedItemRowIndex = null,
  onChangeStock,
  isAdmin = false,
  onRentItem,
  isLightMode = false,
}: SidePanelProps) {
  const [nameInput, setNameInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedShelves, setExpandedShelves] = useState<{ [key: string]: boolean }>({});
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomImageName, setZoomImageName] = useState<string>("");

  useEffect(() => {
    if (rack) {
      setNameInput(rack.name);
      setConfirmDelete(false);
      // Auto-expand all shelves when a new rack is selected
      const initialExpanded: { [key: string]: boolean } = {};
      shelvesWithItems.forEach((s) => {
        initialExpanded[s.shelf] = true;
      });
      setExpandedShelves(initialExpanded);
    }
  }, [rack, shelvesWithItems.length]); // eslint-disable-line

  useEffect(() => {
    if (highlightShelf) {
      setExpandedShelves((prev) => ({ ...prev, [highlightShelf]: true }));
      // Wait a little for the side panel expansion to complete, then scroll smoothly
      setTimeout(() => {
        const element = document.getElementById(`shelf-container-${highlightShelf}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [highlightShelf]);

  useEffect(() => {
    if (highlightedItemRowIndex !== null) {
      // Find the shelf containing this item
      let foundShelf: string | null = null;
      for (const s of shelvesWithItems) {
        if (s.items.some((it) => it.rowIndex === highlightedItemRowIndex)) {
          foundShelf = s.shelf;
          break;
        }
      }

      if (foundShelf) {
        // Expand the corresponding shelf
        setExpandedShelves((prev) => ({ ...prev, [foundShelf!]: true }));
      }

      // Smooth scroll to the specific item card
      setTimeout(() => {
        const element = document.getElementById(`item-card-${highlightedItemRowIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
    }
  }, [highlightedItemRowIndex, shelvesWithItems]);

  if (!rack) {
    return (
      <aside
        style={{
          width: 350,
          background: PANEL,
          borderLeft: `1px solid ${PANEL_BORDER}`,
          padding: 24,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 12,
        }}
      >
        <Package size={48} style={{ opacity: 0.2, color: TEXT_MAIN }} />
        <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
          배치 지도에서 랙을 클릭하면
          <br />
          <b>상세 선반 단수 및 실시간 재고 정보</b>가
          <br />
          여기에 표시됩니다.
        </div>
      </aside>
    );
  }

  const totalStock = shelvesWithItems.reduce(
    (sum, s) => sum + s.items.reduce((isum, it) => isum + (typeof it.stock === "number" ? it.stock : 0), 0),
    0
  );
  const totalItems = shelvesWithItems.reduce((sum, s) => sum + s.items.length, 0);

  const toggleShelf = (shelf: string) => {
    setExpandedShelves((prev) => ({ ...prev, [shelf]: !prev[shelf] }));
  };

  return (
    <aside
      style={{
        width: 350,
        background: PANEL,
        borderLeft: `1px solid ${PANEL_BORDER}`,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Rack Panel Header */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: `1px solid ${PANEL_BORDER}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: rack.color,
                display: "inline-block",
              }}
            />
            <span className="mono" style={{ fontSize: 11, color: TEXT_DIM }}>
              {rack.id} 랙 구역
            </span>
          </div>
          {isAdmin ? (
            <input
              className="mono"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => {
                if (nameInput.trim() && nameInput !== rack.name) {
                  onUpdateRack({ name: nameInput.trim() });
                }
              }}
              style={{
                width: "100%",
                fontSize: 16,
                fontWeight: 700,
                padding: "5px 8px",
                background: "var(--input-bg, #0f172a)",
                border: `1px solid ${PANEL_BORDER}`,
                borderRadius: 6,
                color: TEXT_MAIN,
              }}
            />
          ) : (
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_MAIN, padding: "5px 0" }}>
              {rack.name || `${rack.id} 랙`}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: TEXT_DIM,
            fontSize: 18,
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Theme Color Settings Section Header */}
      {isAdmin && (
        <>
          <div
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            style={{
              padding: "10px 18px",
              borderBottom: `1px solid ${PANEL_BORDER}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              background: "var(--input-bg, #0f172a)",
              userSelect: "none"
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 600, color: TEXT_DIM }}>
              🎨 보관랙 테마 컬러 설정
            </span>
            <span style={{ fontSize: "11px", color: TEXT_DIM }}>{isSettingsExpanded ? "접기 ▲" : "펼치기 ▼"}</span>
          </div>

          {/* Theme Color Settings */}
          {isSettingsExpanded && (
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${PANEL_BORDER}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 2 }}>
                보관 구역의 강조 테마 색상을 선택하세요.
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdateRack({ color: c })}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: c,
                      border: rack.color === c ? `2px solid ${TEXT_MAIN}` : "2px solid transparent",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Stock Items List by Shelf */}
      <div
        style={{
          padding: "14px 18px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "12.5px", fontWeight: 600 }}>
          선반별 품목 정보 <span style={{ color: TEXT_DIM }}>({totalItems}개 품목)</span>
        </div>
        {isAdmin && (
          <button
            onClick={onAddItem}
            style={{
              background: "transparent",
              border: `1px solid ${ACCENT}`,
              color: ACCENT,
              fontSize: "11.5px",
              padding: "4px 9px",
              borderRadius: 5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={13} />
            품목 등록
          </button>
        )}
      </div>

      {/* Scrollable shelves */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 18px" }}>
        {shelvesWithItems.length === 0 ? (
          <div style={{ fontSize: "12.5px", color: TEXT_DIM, padding: "20px 0", textAlign: "center" }}>
            이 랙에 등록된 선반/품목 데이터가 존재하지 않습니다. 우측 상단의 '품목 등록'을 눌러 새로 생성해보세요.
          </div>
        ) : (
          shelvesWithItems.map(({ shelf, items }) => {
            const shelfStock = items.reduce((s, it) => s + (typeof it.stock === "number" ? it.stock : 0), 0);
            const isHighlighted = highlightShelf === shelf;
            const isExpanded = !!expandedShelves[shelf];

            return (
              <div id={`shelf-container-${shelf}`} key={shelf} style={{ marginBottom: 12, position: "relative" }}>
                {/* Shelf Title Button */}
                <button
                  onClick={() => toggleShelf(shelf)}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: isHighlighted 
                      ? "rgba(245, 158, 11, 0.95)" 
                      : (isLightMode ? "rgba(241, 245, 249, 0.95)" : "rgba(30, 41, 59, 0.95)"),
                    backdropFilter: "blur(4px)",
                    border: `2px solid ${isHighlighted ? "#f59e0b" : hexToRgba(rack.color, 0.4)}`,
                    boxShadow: isHighlighted ? "0 4px 12px rgba(245, 158, 11, 0.4)" : "0 2px 6px rgba(0, 0, 0, 0.08)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    marginBottom: 6,
                    transition: "all 0.3s ease-in-out",
                    cursor: "pointer",
                  }}
                >
                  <span className="mono" style={{ fontSize: "12.5px", fontWeight: 700, color: isHighlighted ? "#ffffff" : (isLightMode ? "#0f172a" : TEXT_MAIN) }}>
                    {isHighlighted ? `🔍 ${shelf} (검색됨)` : shelf}
                  </span>
                  <span style={{ fontSize: "11px", color: isHighlighted ? "#ffffff" : TEXT_DIM, display: "flex", alignItems: "center", gap: 4 }}>
                    {items.length}개 품목 {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Shelf Items List */}
                {isExpanded && (
                  <div style={{ paddingLeft: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((item) => {
                      const hasImage = !!item.photo;
                      const imageUrl = hasImage ? getGoogleDriveImageUrl(item.photo) : "";
                      const isItemHighlighted = highlightedItemRowIndex === item.rowIndex;

                      return (
                        <div
                          id={`item-card-${item.rowIndex}`}
                          key={item.rowIndex}
                          style={{
                            background: isItemHighlighted ? "rgba(245, 158, 11, 0.12)" : "var(--input-bg, #0f172a)",
                            border: isItemHighlighted ? "2px solid #f59e0b" : `1px solid ${PANEL_BORDER}`,
                            boxShadow: isItemHighlighted ? "0 0 14px rgba(245, 158, 11, 0.45)" : "none",
                            borderRadius: 8,
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            transition: "all 0.3s ease-in-out",
                          }}
                        >
                          {/* Photo and basic info row */}
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            {/* Image Visualizer */}
                            <div
                              onClick={() => {
                                if (hasImage) {
                                  setZoomImageUrl(imageUrl);
                                  setZoomImageName(item.name || "(이름 없음)");
                                }
                              }}
                              title={hasImage ? "클릭하여 사진 확대" : undefined}
                              style={{
                                width: 56,
                                height: 56,
                                background: "var(--app-bg, #1b1c21)",
                                border: `1px solid ${PANEL_BORDER}`,
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                flexShrink: 0,
                                position: "relative",
                                cursor: hasImage ? "pointer" : "default",
                              }}
                            >
                              {hasImage ? (
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    // Fallback to placeholder if image load fails (e.g. invalid url/permissions)
                                    (e.target as HTMLElement).style.display = "none";
                                    const sibling = (e.target as HTMLElement).nextElementSibling;
                                    if (sibling) (sibling as HTMLElement).style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                style={{
                                  display: hasImage ? "none" : "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                <Image size={18} style={{ color: TEXT_DIM }} />
                              </div>
                            </div>

                            {/* Item name, note (Column H), and links */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: TEXT_MAIN,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={item.name}
                              >
                                {item.name || "(이름 없음)"}
                              </div>

                              {/* Column H note display */}
                              <div style={{ display: "block", marginTop: 4 }}>
                                {item.note ? (
                                  <div
                                    style={{
                                      fontSize: "11.5px",
                                      fontWeight: 500,
                                      color: TEXT_MAIN,
                                      background: "rgba(245, 158, 11, 0.08)",
                                      border: "1px solid rgba(245, 158, 11, 0.2)",
                                      padding: "3px 8px",
                                      borderRadius: 5,
                                      display: "inline-block",
                                      maxWidth: "100%",
                                      wordBreak: "break-all",
                                    }}
                                    title={`특이사항: ${item.note}`}
                                  >
                                    📝 {item.note}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: "10.5px", color: TEXT_DIM, fontStyle: "italic" }}>
                                    특이사항 없음
                                  </div>
                                )}
                              </div>

                              {item.link && item.link !== "N/A" ? (
                                <div style={{ display: "block", marginTop: 6 }}>
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "10.5px",
                                      color: ACCENT,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                      textDecoration: "none",
                                    }}
                                  >
                                    구매 링크
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Footer action row: +/- adjustments or 대여/반납 buttons */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              borderTop: `1px solid ${PANEL_BORDER}`,
                              paddingTop: 8,
                              marginTop: 2,
                            }}
                          >
                            {isAdmin ? (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                {/* Stock modifier buttons */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <button
                                    onClick={() => onChangeStock(item, -1)}
                                    disabled={typeof item.stock !== "number" || item.stock <= 0}
                                    style={{
                                      ...stepBtnStyle,
                                      opacity: typeof item.stock !== "number" || item.stock <= 0 ? 0.35 : 1,
                                      cursor: typeof item.stock !== "number" || item.stock <= 0 ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    −
                                  </button>
                                  <span
                                    className="mono"
                                    style={{
                                      fontSize: "12.5px",
                                      fontWeight: 700,
                                      minWidth: 26,
                                      textAlign: "center",
                                      color: item.stock === 0 ? DANGER : item.stock === null ? TEXT_DIM : OK,
                                    }}
                                  >
                                    {item.stock === null ? "N/A" : item.stock}
                                  </span>
                                  <button
                                    onClick={() => onChangeStock(item, 1)}
                                    disabled={typeof item.stock !== "number"}
                                    style={{
                                      ...stepBtnStyle,
                                      opacity: typeof item.stock !== "number" ? 0.35 : 1,
                                      cursor: typeof item.stock !== "number" ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Manager/Date and buttons */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                    <span style={{ fontSize: "10px", color: TEXT_DIM }}>
                                      {item.manager || "담당자 없음"}
                                    </span>
                                    <span style={{ fontSize: "9px", color: TEXT_DIM, marginTop: 1 }}>
                                      {item.updatedAt ? item.updatedAt.split(" ")[0] : ""}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button
                                      onClick={() => onEditItem(item)}
                                      title="수정"
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: TEXT_DIM,
                                        cursor: "pointer",
                                        padding: 2,
                                      }}
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      onClick={() => onDeleteItem(item.rowIndex)}
                                      title="삭제"
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: DANGER,
                                        cursor: "pointer",
                                        padding: 2,
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                                {/* Stock count display */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: "11.5px", color: TEXT_DIM }}>
                                    현재고: <span className="mono" style={{ fontSize: "13px", fontWeight: 700, color: item.stock === 0 ? DANGER : OK }}>
                                      {item.stock === null ? "N/A" : `${item.stock} 개`}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: "10px", color: TEXT_DIM }}>
                                    최종수정: {item.updatedAt ? item.updatedAt.split(" ")[0] : "없음"}
                                  </span>
                                </div>
                                {/* Borrow and Return buttons */}
                                <div style={{ display: "flex", gap: 6, width: "100%" }}>
                                  <button
                                    onClick={() => onRentItem?.(item, "대여")}
                                    disabled={item.stock === null || item.stock <= 0}
                                    style={{
                                      flex: 1,
                                      background: "rgba(99, 102, 241, 0.12)",
                                      border: `1px solid ${ACCENT}`,
                                      color: ACCENT,
                                      borderRadius: "6px",
                                      padding: "6px 8px",
                                      fontSize: "11.5px",
                                      fontWeight: 700,
                                      cursor: (item.stock === null || item.stock <= 0) ? "not-allowed" : "pointer",
                                      opacity: (item.stock === null || item.stock <= 0) ? 0.4 : 1,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 4,
                                    }}
                                  >
                                    📦 대여하기
                                  </button>
                                  <button
                                    onClick={() => onRentItem?.(item, "반납")}
                                    style={{
                                      flex: 1,
                                      background: "rgba(16, 185, 129, 0.12)",
                                      border: `1px solid ${OK}`,
                                      color: OK,
                                      borderRadius: "6px",
                                      padding: "6px 8px",
                                      fontSize: "11.5px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 4,
                                    }}
                                  >
                                    🔄 반납하기
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rack Delete Action at Bottom */}
      {isAdmin && (
        <div style={{ padding: 18, borderTop: `1px solid ${PANEL_BORDER}` }}>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onDeleteRack}
                style={{
                  ...actionBtnStyle,
                  flex: 1,
                  background: DANGER,
                  borderColor: DANGER,
                  color: "#15161A",
                  cursor: "pointer",
                }}
              >
                삭제 확인
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ ...actionBtnStyle, flex: 1, cursor: "pointer" }}
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                ...actionBtnStyle,
                width: "100%",
                color: DANGER,
                borderColor: hexToRgba(DANGER, 0.4),
                background: "transparent",
                cursor: "pointer",
              }}
            >
              이 랙 삭제
            </button>
          )}
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {zoomImageUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 11, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 24,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "80vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              background: "#000",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomImageUrl}
              alt={zoomImageName}
              referrerPolicy="no-referrer"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
            {/* 닫기 버튼 */}
            <button
              onClick={() => setZoomImageUrl(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(0, 0, 0, 0.6)",
                border: "none",
                color: "#ffffff",
                width: 32,
                height: 32,
                borderRadius: "50%",
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              marginTop: 12,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              background: "rgba(0, 0, 0, 0.6)",
              padding: "6px 16px",
              borderRadius: 20,
              textAlign: "center",
            }}
          >
            {zoomImageName}
          </div>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--input-bg, #0f172a)", borderRadius: 6, padding: "7px 10px" }}>
      <div style={{ fontSize: "10px", color: TEXT_DIM }}>{label}</div>
      <div className="mono" style={{ fontSize: "13px", fontWeight: 600, marginTop: 2, color: TEXT_MAIN }}>
        {value}
      </div>
    </div>
  );
}

const actionBtnStyle = {
  background: PANEL,
  border: `1px solid ${PANEL_BORDER}`,
  color: TEXT_MAIN,
  borderRadius: 6,
  padding: "9px 14px",
  fontSize: "12.5px",
  fontWeight: 600,
  boxShadow: "none",
};

const stepBtnStyle = {
  width: 24,
  height: 24,
  background: "transparent",
  border: `1px solid ${PANEL_BORDER}`,
  color: TEXT_MAIN,
  borderRadius: 5,
  fontSize: "14px",
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};
