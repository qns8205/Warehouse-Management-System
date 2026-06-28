import React, { useState } from "react";

interface SetupModalProps {
  scriptUrl: string;
  setScriptUrl: (url: string) => void;
  connecting: boolean;
  connectError: string;
  connected: boolean;
  onConnect: () => void;
  onClose: () => void;
  onDisconnect: () => void;
}

const PANEL = "var(--panel-bg, #1e293b)";
const PANEL_BORDER = "var(--panel-border, #334155)";
const TEXT_MAIN = "var(--text-main, #f1f5f9)";
const TEXT_DIM = "var(--text-dim, #94a3b8)";
const ACCENT = "#6366f1";
const DANGER = "#f43f5e";
const OK = "#10b981";

export default function SetupModal({
  scriptUrl,
  setScriptUrl,
  connecting,
  connectError,
  connected,
  onConnect,
  onClose,
  onDisconnect,
}: SetupModalProps) {
  const [copied, setCopied] = useState(false);

  const scriptCode = `// AppsScript_Code.gs
// 이 코드를 구글 스프레드시트의 [확장 프로그램] -> [Apps Script]에 붙여넣고 웹앱으로 배포하세요.

const INVENTORY_SHEET_NAME = "시트1"; // 실제 사용 중인 스프레드시트의 시트 탭 이름으로 변경하세요.
const DEFECT_SHEET_NAME = "불량로그";
const RENT_SHEET_NAME = "대여로그";

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INVENTORY_SHEET_NAME);
    if (!sheet) {
      return responseJSON({ success: false, error: "시트 '" + INVENTORY_SHEET_NAME + "'를 찾을 수 없습니다." });
    }
    
    // 불량로그 시트 가져오거나 없으면 자동 생성
    let defectSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEFECT_SHEET_NAME);
    if (!defectSheet) {
      defectSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(DEFECT_SHEET_NAME);
      defectSheet.getRange(1, 1, 1, 6).setValues([["제품명", "개수", "기록 시간", "불량 유형", "세부 사항", "대처 방안"]]);
    }
    
    // 대여로그 시트 가져오거나 없으면 자동 생성
    let rentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RENT_SHEET_NAME);
    if (!rentSheet) {
      rentSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(RENT_SHEET_NAME);
      rentSheet.getRange(1, 1, 1, 7).setValues([["기록 시간", "구분", "위치", "제품명", "수량", "대여자 성함", "메모"]]);
    }
    
    if (action === "getAll") {
      const inventory = getInventoryData(sheet);
      const sectors = getSectorLayout();
      const defectLogs = getDefectLogs(defectSheet);
      const rentLogs = getRentLogs(rentSheet);
      return responseJSON({ success: true, inventory: inventory, sectors: sectors, defectLogs: defectLogs, rentLogs: rentLogs });
    }
    
    return responseJSON({ success: false, error: "알 수 없는 GET 액션입니다." });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const payload = requestData.payload;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INVENTORY_SHEET_NAME);
    if (!sheet) {
      return responseJSON({ success: false, error: "시트 '" + INVENTORY_SHEET_NAME + "'를 찾을 수 없습니다." });
    }
    
    if (action === "addInventoryItem") {
      const newRowIndex = addInventoryItem(sheet, payload);
      return responseJSON({ success: true, rowIndex: newRowIndex });
    }
    
    if (action === "updateInventoryItem") {
      updateInventoryItem(sheet, payload);
      return responseJSON({ success: true });
    }
    
    if (action === "deleteInventoryItem") {
      deleteInventoryItem(sheet, payload.rowIndex);
      return responseJSON({ success: true });
    }
    
    if (action === "saveSectorLayout") {
      saveSectorLayout(payload.sectors);
      return responseJSON({ success: true });
    }
    
    if (action === "deleteSector") {
      deleteSector(payload.sectorId);
      return responseJSON({ success: true });
    }

    if (action === "addDefectLog") {
      let defectSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEFECT_SHEET_NAME);
      if (!defectSheet) {
        defectSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(DEFECT_SHEET_NAME);
        defectSheet.getRange(1, 1, 1, 6).setValues([["제품명", "개수", "기록 시간", "불량 유형", "세부 사항", "대처 방안"]]);
      }
      const newRowIndex = addDefectLog(defectSheet, payload);
      return responseJSON({ success: true, rowIndex: newRowIndex });
    }

    if (action === "rentInventoryItem") {
      let rentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RENT_SHEET_NAME);
      if (!rentSheet) {
        rentSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(RENT_SHEET_NAME);
        rentSheet.getRange(1, 1, 1, 7).setValues([["기록 시간", "구분", "위치", "제품명", "수량", "대여자 성함", "메모"]]);
      }
      const newRowIndex = addRentLog(rentSheet, payload);
      
      // Update inventory stock count
      const lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
        for (let i = 0; i < values.length; i++) {
          // Compare location (Col 1) and name (Col 3) to find unique match
          if (String(values[i][0]).trim() === String(payload.location).trim() && 
              String(values[i][2]).trim() === String(payload.name).trim()) {
            const rowIdx = i + 2;
            const stockCell = sheet.getRange(rowIdx, 5); // E열 (index 5, 1-indexed)
            let currentStock = Number(stockCell.getValue() || 0);
            const qtyChange = Number(payload.qty || 0);
            
            if (payload.type === "대여") {
              currentStock = Math.max(0, currentStock - qtyChange);
            } else if (payload.type === "반납") {
              currentStock = currentStock + qtyChange;
            }
            stockCell.setValue(currentStock);
            
            // F열 (수정일시) 및 G열 (담당자) 업데이트
            sheet.getRange(rowIdx, 6).setValue(formatDate(new Date()));
            sheet.getRange(rowIdx, 7).setValue(payload.user || "");
            break;
          }
        }
      }
      return responseJSON({ success: true, rowIndex: newRowIndex });
    }
    
    return responseJSON({ success: false, error: "알 수 없는 POST 액션입니다." });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function getInventoryData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const range = sheet.getRange(2, 1, lastRow - 1, 9);
  const values = range.getValues();
  const richTextValues = range.getRichTextValues();
  const inventory = [];
  
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const richRow = richTextValues[i];
    const rowIndex = i + 2;
    
    // I열 (index 8, 사진 링크용)에서 이미지 주소 추출 (B열은 참고하지 않음)
    let photoUrl = "";
    if (richRow && richRow[8]) {
      photoUrl = richRow[8].getLinkUrl() || "";
      if (!photoUrl && typeof richRow[8].getRuns === "function") {
        const runs = richRow[8].getRuns();
        for (let r = 0; r < runs.length; r++) {
          const runUrl = runs[r].getLinkUrl();
          if (runUrl) {
            photoUrl = runUrl;
            break;
          }
        }
      }
    }
    if (!photoUrl) {
      photoUrl = String(row[8] || "").trim();
    }
    if (photoUrl === "undefined") {
      photoUrl = "";
    }
    
    // 스마트 칩 링크 주소 추출 (D열 / index 3)
    let itemLink = "";
    if (richRow && richRow[3]) {
      itemLink = richRow[3].getLinkUrl() || "";
      if (!itemLink && typeof richRow[3].getRuns === "function") {
        const runs = richRow[3].getRuns();
        for (let r = 0; r < runs.length; r++) {
          const runUrl = runs[r].getLinkUrl();
          if (runUrl) {
            itemLink = runUrl;
            break;
          }
        }
      }
    }
    if (!itemLink) {
      itemLink = String(row[3] || "").trim();
    }
    
    inventory.push({
      rowIndex: rowIndex,
      location: String(row[0] || "").trim(),
      photo: photoUrl,
      name: String(row[2] || "").trim(),
      link: itemLink,
      stock: row[4] === "" ? null : Number(row[4]),
      updatedAt: row[5] ? (row[5] instanceof Date ? formatDate(row[5]) : String(row[5])) : "",
      manager: String(row[6] || "").trim(),
      note: String(row[7] || "").trim(),
      spec: "" // Column I가 사진 링크용이 되었으므로 규격 데이터는 비워둡니다.
    });
  }
  return inventory;
}

function getDefectLogs(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const logs = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    logs.push({
      rowIndex: i + 2,
      timestamp: row[2] ? (row[2] instanceof Date ? formatDate(row[2]) : String(row[2]).trim()) : "",
      location: "",
      name: String(row[0] || "").trim(),
      qty: row[1] === "" ? null : Number(row[1]),
      defectType: String(row[3] || "").trim(),
      manager: "",
      note: String(row[4] || "").trim(),
      actionTaken: String(row[5] || "").trim()
    });
  }
  return logs;
}

function addDefectLog(sheet, log) {
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow + 1;
  
  const nowStr = formatDate(new Date());
  const rowValues = [
    log.name || "",
    log.qty === "" || log.qty == null ? "" : Number(log.qty),
    log.timestamp || nowStr,
    log.defectType || "",
    log.note || "",
    log.actionTaken || ""
  ];
  
  sheet.getRange(nextRow, 1, 1, 6).setValues([rowValues]);
  return nextRow;
}

function getRentLogs(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const logs = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    logs.push({
      rowIndex: i + 2,
      timestamp: row[0] ? (row[0] instanceof Date ? formatDate(row[0]) : String(row[0]).trim()) : "",
      type: String(row[1] || "대여").trim(),
      location: String(row[2] || "").trim(),
      name: String(row[3] || "").trim(),
      qty: row[4] === "" ? 0 : Number(row[4]),
      user: String(row[5] || "").trim(),
      note: String(row[6] || "").trim()
    });
  }
  return logs;
}

function addRentLog(sheet, log) {
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow + 1;
  
  const nowStr = formatDate(new Date());
  const rowValues = [
    log.timestamp || nowStr,
    log.type || "대여",
    log.location || "",
    log.name || "",
    log.qty === "" || log.qty == null ? 0 : Number(log.qty),
    log.user || "",
    log.note || ""
  ];
  
  sheet.getRange(nextRow, 1, 1, 7).setValues([rowValues]);
  return nextRow;
}

function addInventoryItem(sheet, item) {
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow + 1;
  const nowStr = formatDate(new Date());
  
  const rowValues = [
    item.location || "",
    "", // Column B (B열은 참고하지 않으므로 비워둡니다)
    item.name || "",
    item.link || "",
    item.stock === "" || item.stock == null ? "" : Number(item.stock),
    nowStr,
    item.manager || "",
    item.note || "",
    item.photo || "" // Column I (사진 링크용)
  ];
  
  sheet.getRange(nextRow, 1, 1, 9).setValues([rowValues]);
  return nextRow;
}

function updateInventoryItem(sheet, item) {
  const rowIndex = Number(item.rowIndex);
  if (!rowIndex || rowIndex < 2) throw new Error("올바르지 않은 행 인덱스: " + rowIndex);
  
  const nowStr = formatDate(new Date());
  const range = sheet.getRange(rowIndex, 1, 1, 9);
  const currentValues = range.getValues()[0];
  
  if (item.location !== undefined) currentValues[0] = item.location;
  if (item.photo !== undefined) {
    currentValues[8] = item.photo; // Column I (사진 링크용)만 업데이트합니다.
  }
  if (item.name !== undefined) currentValues[2] = item.name;
  if (item.link !== undefined) currentValues[3] = item.link;
  if (item.stock !== undefined) currentValues[4] = (item.stock === "" || item.stock == null) ? "" : Number(item.stock);
  currentValues[5] = nowStr;
  if (item.manager !== undefined) currentValues[6] = item.manager;
  if (item.note !== undefined) currentValues[7] = item.note;
  
  range.setValues([currentValues]);
}

function deleteInventoryItem(sheet, rowIndex) {
  const idx = Number(rowIndex);
  if (!idx || idx < 2) throw new Error("올바르지 않은 행 인덱스: " + idx);
  sheet.deleteRow(idx);
}

function getSectorLayout() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const data = scriptProperties.getProperty("sector_layout");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveSectorLayout(sectors) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("sector_layout", JSON.stringify(sectors));
}

function deleteSector(sectorId) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const data = scriptProperties.getProperty("sector_layout");
  if (!data) return;
  try {
    let sectors = JSON.parse(data);
    sectors = sectors.filter(function(s) { return s.id !== sectorId; });
    scriptProperties.setProperty("sector_layout", JSON.stringify(sectors));
  } catch (e) {}
}

function formatDate(date) {
  const pad = function(n) { return String(n).padStart(2, "0"); };
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        style={{
          width: 560,
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>구글 스프레드시트 실시간 연동 설정</div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: TEXT_DIM, fontSize: 18, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.7, marginBottom: 16 }}>
          Google Apps Script 웹앱 URL을 입력하여 스프레드시트의 재고 목록을 실시간으로 관리할 수 있습니다. 
          아래 단계를 따라서 스크립트를 최초 1회 설치 및 배포해 주세요.
        </div>

        <div style={{ marginBottom: 16, background: "var(--input-bg, #0f172a)", padding: 12, borderRadius: 8, border: `1px solid ${PANEL_BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: OK }}>Apps Script 복사하기</span>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? OK : ACCENT,
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copied ? "✓ 복사 완료!" : "코드 복사하기"}
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: TEXT_DIM, margin: 0, lineHeight: 1.5 }}>
            이 코드에는 <b>Column H (특이사항)</b> 매핑, 구글 드라이브 사진 연동 지원, 그리고 <b>'불량로그' 자동 생성 및 실시간 동기화 기록 기능</b>이 완벽하게 반영되어 있습니다.
          </p>
        </div>

        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontSize: 12.5, color: ACCENT, fontWeight: 600, marginBottom: 8 }}>
            설치 가이드 (상세설명 펼치기)
          </summary>
          <ol style={{ fontSize: 12.5, color: TEXT_DIM, lineHeight: 1.9, paddingLeft: 18, marginTop: 10 }}>
            <li>
              구글 시트 접속 후 상단 메뉴의 <b>확장 프로그램 (Extensions) → Apps Script</b>를 선택합니다.
            </li>
            <li>
              위의 <b>[코드 복사하기]</b> 버튼을 눌러 복사한 스크립트를 전체 붙여넣기합니다.
            </li>
            <li>
              코드 상단의 <span className="mono" style={{ color: TEXT_MAIN }}>INVENTORY_SHEET_NAME</span> 값을 실제 시트 탭 이름(예: "시트1")으로 수정하고 저장합니다.
            </li>
            <li>
              우측 상단의 <b>배포 (Deploy) → 새 배포 (New Deployment)</b>를 누릅니다.
            </li>
            <li>
              유형 선택 톱니바퀴에서 <b>웹 앱 (Web App)</b>을 고르고, 실행 사용자는 <b>나 (Me)</b>, 액세스할 수 있는 사람은 <b>모든 사람 (Anyone)</b>으로 지정해 배포를 누릅니다.
            </li>
            <li>
              생성된 <b>웹 앱 URL</b>을 아래 입력란에 넣고 연동을 시작합니다.
            </li>
          </ol>
        </details>

        <label style={{ fontSize: 12, color: TEXT_DIM, display: "block", marginBottom: 6 }}>
          Apps Script 웹앱 URL (웹 앱 주소)
        </label>
        <input
          value={scriptUrl}
          onChange={(e) => setScriptUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/AKfycb.../exec"
          style={{
            width: "100%",
            marginBottom: 8,
            background: "var(--input-bg, #0f172a)",
            border: `1px solid ${PANEL_BORDER}`,
            color: "var(--text-main, #f1f5f9)",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "13px"
          }}
        />
        {connectError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 8 }}>{connectError}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onConnect}
            disabled={connecting}
            style={{
              flex: 1,
              background: OK,
              border: `1px solid ${OK}`,
              color: "#020617",
              borderRadius: 7,
              padding: "11px 0",
              fontSize: 13.5,
              fontWeight: 600,
              opacity: connecting ? 0.7 : 1,
              cursor: "pointer",
            }}
          >
            {connecting ? "연동 확인 중..." : connected ? "다시 연동하기" : "연동하기"}
          </button>
          {connected && (
            <button
              onClick={onDisconnect}
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
              연동 해제 (로컬 모드)
            </button>
          )}
        </div>

        {!connected && (
          <div style={{ fontSize: 11.5, color: TEXT_DIM, marginTop: 14, lineHeight: 1.6, textAlign: "center" }}>
            연동을 하지 않고도 우측 상단의 ✕ 를 눌러 데모 데이터로 가상 테스트를 진행할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
