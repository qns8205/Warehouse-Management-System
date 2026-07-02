import React, { useState, useEffect } from "react";
import { InventoryItem, Rack } from "../types";
import { parseLocation } from "../utils/drive";

interface ItemFormModalProps {
  item: InventoryItem | null;
  defaultRackId: string;
  defaultLocation?: string | null;
  defaultSpec?: string | null;
  racks: Rack[];
  onSave: (item: any) => void;
  onClose: () => void;
  defaultManager?: string;
}

const PANEL = "var(--panel-bg, #1e293b)";
const PANEL_BORDER = "var(--panel-border, #334155)";
const TEXT_MAIN = "var(--text-main, #f1f5f9)";
const TEXT_DIM = "var(--text-dim, #94a3b8)";
const ACCENT = "#6366f1";
const ACCENT_SOFT = "#818cf8";

export default function ItemFormModal({
  item,
  defaultRackId,
  defaultLocation,
  defaultSpec,
  racks,
  onSave,
  onClose,
  defaultManager,
}: ItemFormModalProps) {
  const parsedLoc = defaultLocation ? parseLocation(defaultLocation) : null;
  const initialRack = item 
    ? parseLocation(item.location).rack 
    : (parsedLoc ? parsedLoc.rack : defaultRackId || (racks[0] && racks[0].id) || "");
  const initialShelfPick = item
    ? item.location
    : (defaultLocation || "");
  const initialNewShelfNum = item 
    ? parseLocation(item.location).shelf 
    : (parsedLoc ? parsedLoc.shelf : "");

  const [form, setForm] = useState<Omit<InventoryItem, "rowIndex"> & { rowIndex?: number }>(
    item
      ? { ...item, manager: defaultManager || item.manager || "관리자" }
      : {
          location: "",
          photo: "",
          name: "",
          link: "N/A",
          stock: 0,
          updatedAt: "",
          manager: defaultManager || "관리자",
          note: "",
          spec: defaultSpec || "",
        }
  );

  const [rackId, setRackId] = useState(initialRack);
  const [shelfMode, setShelfMode] = useState<"existing" | "new">("existing");
  const [shelfPick, setShelfPick] = useState(initialShelfPick);
  const [newShelfNum, setNewShelfNum] = useState(initialNewShelfNum);

  const currentRack = racks.find((r) => r.id === rackId);
  const existingShelves = currentRack && currentRack.shelves ? currentRack.shelves : [];

  useEffect(() => {
    if (existingShelves.length === 0) {
      setShelfMode("new");
    } else if (!item) {
      setShelfMode("existing");
    }
  }, [rackId]); // eslint-disable-line

  function update(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function composedLocation() {
    if (shelfMode === "existing" && shelfPick) {
      // Picked shelves already have format like "A-01"
      return shelfPick;
    }
    if (shelfMode === "new" && newShelfNum.trim()) {
      return `${rackId}-${newShelfNum.trim()}`;
    }
    return "";
  }

  const location = item ? form.location : composedLocation();
  const canSave = location.trim() !== "" && form.name.trim() !== "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,11,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        backdropFilter: "blur(2px)",
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="item-modal"
        style={{
          width: 480,
          maxWidth: "92vw",
          maxHeight: "86vh",
          overflowY: "auto",
          background: PANEL,
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <style>{`
          .item-modal input, .item-modal select, .item-modal textarea {
            background: var(--input-bg, #0f172a) !important;
            color: var(--text-main, #f1f5f9) !important;
            border: 1px solid var(--panel-border, #334155) !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            font-size: 13px !important;
            outline: none !important;
            transition: border-color 0.15s ease-in-out !important;
          }
          .item-modal input:focus, .item-modal select:focus, .item-modal textarea:focus {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
          }
        `}</style>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{item ? "품목 수정" : "품목 추가"}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: TEXT_DIM, fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {item ? (
            <Field label="위치 (코드)">
              <input
                className="mono"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                style={{ width: "100%" }}
              />
            </Field>
          ) : (
            <>
              <Field label="랙 구역 선택">
                <select
                  value={rackId}
                  onChange={(e) => {
                    setRackId(e.target.value);
                    setShelfPick("");
                  }}
                  style={{ width: "100%", background: "#101114", color: TEXT_MAIN, border: `1px solid ${PANEL_BORDER}`, padding: "6px 10px", borderRadius: 6 }}
                >
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} 랙 ({r.name})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="선반(Shelf) 위치">
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShelfMode("existing")}
                    style={{
                      flex: 1,
                      background: shelfMode === "existing" ? "rgba(168,166,160,0.12)" : "transparent",
                      border: `1px solid ${shelfMode === "existing" ? ACCENT_SOFT : PANEL_BORDER}`,
                      color: shelfMode === "existing" ? TEXT_MAIN : TEXT_DIM,
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    기존 선반 위치에 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => setShelfMode("new")}
                    style={{
                      flex: 1,
                      background: shelfMode === "new" ? "rgba(168,166,160,0.12)" : "transparent",
                      border: `1px solid ${shelfMode === "new" ? ACCENT_SOFT : PANEL_BORDER}`,
                      color: shelfMode === "new" ? TEXT_MAIN : TEXT_DIM,
                      borderRadius: 6,
                      padding: "6px 8px",
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    새 선반 위치 만들기
                  </button>
                </div>
                {shelfMode === "existing" ? (
                  existingShelves.length > 0 ? (
                    <select
                      value={shelfPick}
                      onChange={(e) => setShelfPick(e.target.value)}
                      style={{ width: "100%", background: "#101114", color: TEXT_MAIN, border: `1px solid ${PANEL_BORDER}`, padding: "6px 10px", borderRadius: 6 }}
                    >
                      <option value="">선반을 선택하세요</option>
                      {existingShelves.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 12, color: TEXT_DIM }}>
                      이 랙에는 아직 활성 선반 위치가 없습니다. "새 선반 위치 만들기"를 진행해주세요.
                    </div>
                  )
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="mono" style={{ fontSize: 13, color: TEXT_DIM }}>
                      {rackId}-
                    </span>
                    <input
                      value={newShelfNum}
                      onChange={(e) => setNewShelfNum(e.target.value)}
                      placeholder="예: 05"
                      style={{ flex: 1 }}
                    />
                  </div>
                )}
              </Field>
            </>
          )}

          <Field label="품목명">
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="품목 이름 입력"
              style={{ width: "100%" }}
            />
          </Field>

          <Field label="선반 내 서브 분류 (예: 공구, M2 규격, M3 규격 등)">
            <input
              value={form.spec}
              onChange={(e) => update("spec", e.target.value)}
              placeholder="선반 내에서 구분할 서브 분류 입력 (미입력 시 '기타')"
              style={{ width: "100%" }}
            />
          </Field>

          <Field label="특이사항">
            <input
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              placeholder="특이사항 또는 주의사항 입력"
              style={{ width: "100%" }}
            />
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="재고 수량" style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={form.stock === null ? "" : String(form.stock)}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val.toUpperCase() === "N/A") {
                      update("stock", "N/A");
                    } else if (val === "") {
                      update("stock", null);
                    } else {
                      const num = Number(val);
                      update("stock", isNaN(num) ? val : num);
                    }
                  }}
                  placeholder="숫자 또는 N/A"
                  style={{ width: "100%", flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => update("stock", "N/A")}
                  style={{
                    background: form.stock === "N/A" ? "#6366f1" : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--panel-border, #334155)",
                    borderRadius: "6px",
                    padding: "0 10px",
                    fontSize: "11px",
                    color: form.stock === "N/A" ? "#ffffff" : "var(--text-dim, #94a3b8)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    height: "36px"
                  }}
                >
                  N/A 지정
                </button>
              </div>
            </Field>
            <Field label="담당자" style={{ flex: 1 }}>
              <input
                value={form.manager}
                onChange={(e) => update("manager", e.target.value)}
                placeholder="담당자명"
                style={{
                  width: "100%",
                  height: "36px"
                }}
              />
            </Field>
          </div>

          <Field label="사진 링크 (구글 드라이브 주소 또는 일반 이미지 URL)">
            <input
              value={form.photo}
              onChange={(e) => update("photo", e.target.value)}
              placeholder="구글 드라이브 공유 링크나 이미지 URL 주소를 입력하세요"
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4, display: "block" }}>
              * 구글 드라이브 사진의 공유 범위를 '링크가 있는 모든 사용자'로 설정하여 붙여넣으시면 실시간 사진 연동이 작동합니다.
            </span>
          </Field>

          <Field label="구매링크">
            <input
              value={form.link}
              onChange={(e) => update("link", e.target.value)}
              placeholder="N/A 또는 구매 URL"
              style={{ width: "100%" }}
            />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            onClick={() => onSave({ ...form, location })}
            disabled={!canSave}
            style={{
              flex: 1,
              background: ACCENT,
              border: `1px solid ${ACCENT}`,
              color: "#15161A",
              borderRadius: 7,
              padding: "11px 0",
              fontSize: 13.5,
              fontWeight: 600,
              opacity: !canSave ? 0.5 : 1,
              cursor: "pointer",
            }}
          >
            저장
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "transparent",
              border: `1px solid ${PANEL_BORDER}`,
              color: TEXT_DIM,
              borderRadius: 7,
              padding: "11px 0",
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 11.5, color: TEXT_DIM, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
