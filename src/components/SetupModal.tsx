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
  const [shareCopied, setShareCopied] = useState(false);

  const handleCopyShareLink = () => {
    if (!scriptUrl) return;
    try {
      const currentOrigin = window.location.origin + window.location.pathname;
      const shareLink = `${currentOrigin}?script_url=${encodeURIComponent(scriptUrl.trim())}`;
      navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  const scriptCode = `// AppsScript_Code.gs
// 이 코드를 구글 스프레드시트의 [확장 프로그램] -> [Apps Script]에 붙여넣고 웹앱으로 배포하세요.

const INVENTORY_SHEET_NAME = "시트1"; // 실제 사용 중인 스프레드시트의 시트 탭 이름으로 변경하세요.
const DEFECT_SHEET_NAME = "불량로그";
const RENT_SHEET_NAME = "대여로그";
const USERS_SHEET_NAME = "Users";

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
      defectSheet.getRange(1, 1, 1, 7).setValues([["제품명", "개수", "기록 시간", "불량 유형", "세부 사항", "대처 방안", "사진"]]);
    }
    
    // 대여로그 시트 가져오거나 없으면 자동 생성
    let rentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RENT_SHEET_NAME);
    if (!rentSheet) {
      rentSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(RENT_SHEET_NAME);
      rentSheet.getRange(1, 1, 1, 7).setValues([["기록 시간", "구분", "위치", "제품명", "수량", "대여자 성함", "메모"]]);
    }

    // Users 시트 가져오거나 없으면 자동 생성
    let usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
    if (!usersSheet) {
      usersSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(USERS_SHEET_NAME);
      usersSheet.getRange(1, 1, 1, 3).setValues([["아이디", "비밀번호", "이름"]]);
      usersSheet.getRange(2, 1, 1, 3).setValues([["admin", "1234", "관리자"]]);
    }
    
    if (action === "getAll") {
      const inventory = getInventoryData(sheet);
      const sectors = getSectorLayout();
      const defectLogs = getDefectLogs(defectSheet);
      const rentLogs = getRentLogs(rentSheet);
      const users = getUsersData(usersSheet);
      let robotObjects = [];
      try {
        robotObjects = getRobotObjects(SpreadsheetApp.getActiveSpreadsheet());
      } catch (err) {}
      return responseJSON({
        success: true,
        inventory: inventory,
        sectors: sectors,
        defectLogs: defectLogs,
        rentLogs: rentLogs,
        users: users,
        robotObjects: robotObjects
      });
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
        defectSheet.getRange(1, 1, 1, 7).setValues([["제품명", "개수", "기록 시간", "불량 유형", "세부 사항", "대처 방안", "사진"]]);
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
            
            if (payload.type === "대여" || payload.type === "소모") {
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
  const displayValues = range.getDisplayValues();
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
      stock: (row[4] === "" || isNaN(Number(row[4]))) ? null : Number(row[4]),
      updatedAt: displayValues[i][5] || "",
      manager: String(row[6] || "").trim(),
      note: String(row[7] || "").trim(),
      spec: String(row[1] || "").trim() // Column B (서브 분류로 사용)
    });
  }
  return inventory;
}

function getDefectLogs(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastCol = Math.min(sheet.getLastColumn(), 7);
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const logs = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rawTs = displayValues[i][2] ? String(displayValues[i][2]).trim() : (row[2] instanceof Date ? formatDate(row[2]) : String(row[2] || "").trim());
    const photoUrl = lastCol >= 7 ? String(row[6] || "").trim() : "";
    
    logs.push({
      rowIndex: i + 2,
      timestamp: rawTs.replace(/^'/, ""),
      location: "",
      name: String(row[0] || "").trim(),
      qty: row[1] === "" ? null : Number(row[1]),
      defectType: String(row[3] || "").trim(),
      manager: "",
      note: String(row[4] || "").trim(),
      actionTaken: String(row[5] || "").trim(),
      photo: photoUrl
    });
  }
  return logs;
}

function addDefectLog(sheet, log) {
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow + 1;
  
  if (sheet.getLastColumn() < 7) {
    sheet.getRange(1, 7).setValue("사진");
  }
  
  // Use original log name exactly as-is (parentheses processing is removed)
  let pName = String(log.name || "알수없음").trim();
  
  let photoVal = log.photo || "";
  if (photoVal.indexOf("data:image/") === 0) {
    try {
      const parts = photoVal.split(",");
      const mimeType = parts[0].split(";")[0].split(":")[1];
      const base64Data = parts[1];
      const decoded = Utilities.base64Decode(base64Data);
      const ext = mimeType.split("/")[1] || "jpeg";
      
      // Determine folder
      let folder;
      try {
        folder = DriveApp.getFolderById("1gs7NcJWgFY37OZ4aEuG6Z-PNlmAfz6_R");
      } catch (fErr) {
        const folders = DriveApp.getFoldersByName("Image for Broken Item");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("Image for Broken Item");
        }
      }

      // Rename file format: "제품명_기록 시간_불량 유형"
      const pType = String(log.defectType || "기타불량").trim();
      const rawTs = String(log.timestamp || formatDate(new Date())).replace(/'/g, "").trim();
      const safeTs = rawTs.replace(/[:\/]/g, "-");
      const filename = pName + "_" + safeTs + "_" + pType + "." + ext;

      const blob = Utilities.newBlob(decoded, mimeType, filename);
      const file = folder.createFile(blob);
      
      // Cascading setSharing: handles corporate security policies restricting public links
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        try {
          file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (domainShareErr) {
          // Keep private to the owner if sharing is completely locked down
        }
      }
      
      photoVal = "https://lh3.googleusercontent.com/d/" + file.getId();
    } catch (e) {
      photoVal = "업로드 실패: 구글 드라이브 접근 권한이 필요합니다. Apps Script 에디터 우측 상단 '실행(Run)'을 1회 실행하여 권한 승인을 완료해 주세요. (상세 오류: " + e.toString() + ")";
    }
  }
  
  const nowStr = formatDate(new Date());
  const ts = log.timestamp || nowStr;
  const rowValues = [
    pName,
    log.qty === "" || log.qty == null ? "" : Number(log.qty),
    ts.indexOf("'") === 0 ? ts : "'" + ts,
    log.defectType || "",
    log.note || "",
    log.actionTaken || "",
    photoVal
  ];
  
  sheet.getRange(nextRow, 1, 1, 7).setValues([rowValues]);
  return nextRow;
}

function getRobotObjects(ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) return [];
  const sheet = ss.getSheetByName("로봇 오브젝트");
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastCol = Math.max(sheet.getLastColumn(), 5);
  const range = sheet.getRange(1, 1, lastRow, lastCol); // Row 1 onwards to read headers dynamically
  const values = range.getValues();
  
  // Dynamic header parsing to identify the correct column index for each property
  const headers = values[0].map(function(h) {
    return String(h || "").trim().toLowerCase();
  });
  
  var nameColIdx = -1;
  var idColIdx = -1;
  var locColIdx = -1;
  var specColIdx = -1;
  var noteColIdx = -1;
  
  for (var j = 0; j < headers.length; j++) {
    var h = headers[j];
    if (!h) continue;
    // Look for name/품목명/제품명 column
    if (h === "name" || h.indexOf("품목") !== -1 || h.indexOf("제품") !== -1 || h === "이름" || h === "오브젝트" || h === "명칭") {
      nameColIdx = j;
    } else if (h === "id" || h === "코드" || h === "번호" || h.indexOf("아이디") !== -1) {
      idColIdx = j;
    } else if (h.indexOf("위치") !== -1 || h.indexOf("구역") !== -1 || h.indexOf("장소") !== -1 || h.indexOf("location") !== -1) {
      locColIdx = j;
    } else if (h.indexOf("규격") !== -1 || h.indexOf("서브") !== -1 || h.indexOf("spec") !== -1) {
      specColIdx = j;
    } else if (h.indexOf("비고") !== -1 || h.indexOf("메모") !== -1 || h.indexOf("note") !== -1 || h.indexOf("설명") !== -1) {
      noteColIdx = j;
    }
  }
  
  // Fallback default indices if header name did not match
  if (nameColIdx === -1) {
    nameColIdx = (idColIdx === 0) ? 1 : 0;
  }
  if (idColIdx === -1) {
    idColIdx = (nameColIdx === 0) ? 1 : 0;
  }
  if (locColIdx === -1) locColIdx = 2;
  if (specColIdx === -1) specColIdx = 3;
  if (noteColIdx === -1) noteColIdx = 4;

  const objects = [];
  // Row indices are 1-based, starting with row 2 (index 1 of values array)
  for (var i = 1; i < values.length; i++) {
    const row = values[i];
    const rawName = nameColIdx < row.length ? String(row[nameColIdx] || "").trim() : "";
    const rawId = idColIdx < row.length ? String(row[idColIdx] || "").trim() : "";
    if (!rawName && !rawId) continue;
    
    objects.push({
      rowIndex: i + 1,
      name: rawName || rawId, // fallback to ID if name is empty
      id: rawId,
      location: locColIdx < row.length ? String(row[locColIdx] || "로봇 구역").trim() : "로봇 구역",
      spec: specColIdx < row.length ? String(row[specColIdx] || "").trim() : "",
      note: noteColIdx < row.length ? String(row[noteColIdx] || "").trim() : "",
      stock: "N/A"
    });
  }
  return objects;
}

function getRentLogs(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const range = sheet.getRange(2, 1, lastRow - 1, 7);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const logs = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    logs.push({
      rowIndex: i + 2,
      timestamp: displayValues[i][0] || "",
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
  const ts = log.timestamp || nowStr;
  const rowValues = [
    ts.indexOf("'") === 0 ? ts : "'" + ts,
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
    item.spec || "", // Column B (서브 분류)
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
  if (item.spec !== undefined) currentValues[1] = item.spec; // Column B (서브 분류)
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

function getUsersData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [{ id: "admin", password: "1234", name: "관리자" }];
  
  const range = sheet.getRange(2, 1, lastRow - 1, 3);
  const values = range.getValues();
  const users = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const idVal = String(row[0] || "").trim();
    if (idVal) {
      users.push({
        id: idVal,
        password: String(row[1] || "").trim(),
        name: String(row[2] || "").trim()
      });
    }
  }
  return users;
}

function formatDate(date) {
  try {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(date, tz, "yyyy-MM-dd HH:mm:ss");
  } catch (err) {
    const pad = function(n) { return String(n).padStart(2, "0"); };
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testDrivePermission() {
  try {
    const folders = DriveApp.getFoldersByName("Image for Broken Item");
    if (folders.hasNext()) {
      Logger.log("성공: 구글 드라이브 권한이 정상 승인되었습니다! 기존 폴더를 감지했습니다.");
    } else {
      const folder = DriveApp.createFolder("Image for Broken Item");
      Logger.log("성공: 구글 드라이브 권한이 정상 승인되었습니다! 새 폴더를 생성했습니다.");
    }
  } catch (e) {
    Logger.log("실패: 권한 승인 중 오류가 발생했습니다. 에러: " + e.toString());
  }
}
`;

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
            이 코드에는 <b>Column H (특이사항)</b> 매핑, 구글 드라이브 사진 연동 지원, 그리고 <b>'불량로그' 사진 등록(7번째 열) 및 자동 생성, 실시간 양방향 동기화 기능</b>이 완벽하게 반영되어 있습니다. <span style={{ color: OK, fontWeight: "bold" }}>(이미 연동 중이신 분들은 아래의 코드를 다시 복사하여 확장 프로그램 → Apps Script에 붙여넣으신 후, [배포] → [새 배포(또는 새 버전)]로 반드시 업데이트하셔야 사진이 유실되지 않고 정상 저장됩니다!)</span>
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
              <b>[구글 드라이브 권한(DriveApp) 승인 팝업 띄우기 (필수)]</b>: 에디터 화면 상단 툴바의 함수 선택 창(기본값: doGet)에서 <b style={{ color: OK }}>testDrivePermission</b>을 선택한 뒤, 바로 왼쪽의 <b style={{ color: OK }}>실행(Run)</b> 단추를 누릅니다.
            </li>
            <li>
              화면에 <b>'권한 승인 필요(Authorization Required)'</b> 팝업창이 나타납니다. <b>[권한 검토]</b> → 계정 선택 → <b>[고급(Advanced)]</b> → <b>[Untitled project(으)로 이동]</b> → <b>[허용(Allow)]</b>을 순서대로 진행하여 권한을 꼭 승인해 주세요. (이 과정을 거쳐야 사진이 구글 드라이브에 정상 저장됩니다!)
            </li>
            <li>
              권한 허용 완료 후, 우측 상단의 <b>배포 (Deploy) → 새 배포 (New Deployment)</b>를 누릅니다. (이미 기존 배포가 있다면, <b>배포 관리 → 수정(연필) → 버전 선택에서 '새 버전' 선택</b>으로 교체하여 배포하셔도 됩니다.)
            </li>
            <li>
              유형 선택 톱니바퀴에서 <b>웹 앱 (Web App)</b>을 고르고, 실행 사용자는 <b>나 (Me)</b>, 액세스할 수 있는 사람은 <b>모든 사람 (Anyone)</b>으로 지정해 배포를 누릅니다.
            </li>
            <li>
              생성된 <b>웹 앱 URL</b>을 아래 입력란에 넣고 연동을 시작합니다.
            </li>
          </ol>
        </details>

        <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", borderRadius: "8px", padding: "12px 14px", fontSize: "11.5px", marginBottom: "16px", lineHeight: "1.6" }}>
          🚀 <b>[업데이트 완료: 구글 드라이브(DriveApp) 원본 화질 자동 저장 지원!]</b><br />
          불량로그 등록 시 사진을 선택하거나 드래그앤드롭하면, 무손실 원본 화질의 이미지가 구글 드라이브의 전용 폴더에 안전하게 업로드되어 스프레드시트에 고정 주소로 연동됩니다.<br />
          사내 보안 정책 등으로 인해 전체 공개 링크 생성이 제한되는 기업 계정 환경에서도 도메인 내 공유(setSharing) 권한을 자동으로 시도 및 처리하도록 완벽히 설계되어 안심하고 사용하실 수 있습니다!
        </div>

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
        {scriptUrl.includes("docs.google.com") && (
          <div style={{ background: "rgba(244, 63, 94, 0.12)", border: `1px solid ${DANGER}`, color: "#fca5a5", borderRadius: "6px", padding: "10px", fontSize: "12px", marginBottom: "12px", lineHeight: "1.5" }}>
            ⚠️ <b>입력하신 주소는 구글 스프레드시트 자체의 웹 브라우저 주소입니다.</b>
            <br />
            연동을 위해서는 스프레드시트 자체가 아닌, 스프레드시트 내 <b>[확장 프로그램] → [Apps Script]</b>에서 복사한 코드를 넣고 <b>[배포]</b>하여 발급받은 <b>웹 앱 URL(https://script.google.com/macros/s/.../exec)</b>을 입력해 주세요. (위의 설치 가이드를 클릭해 상세 설명을 확인하세요!)
          </div>
        )}
        {connectError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 8, whiteSpace: "pre-line" }}>{connectError}</div>}

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

        {connected && scriptUrl && (
          <div style={{ marginTop: 20, background: "rgba(99, 102, 241, 0.08)", padding: 14, borderRadius: 10, border: "1px dashed rgba(99, 102, 241, 0.45)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 4 }}>
                  👥 타인/동료 기기 동기화 링크
                </div>
                <div style={{ fontSize: 11.5, color: TEXT_DIM, marginTop: 4, lineHeight: 1.5 }}>
                  다른 사용자가 설정 변경 없이 내 구글 스프레드시트와 실시간 연동된 화면을 보게 하려면 아래 링크를 전달하세요!
                </div>
              </div>
              <button
                onClick={handleCopyShareLink}
                style={{
                  background: shareCopied ? OK : ACCENT,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                }}
              >
                {shareCopied ? "✓ 링크 복사 완료" : "공유 링크 복사"}
              </button>
            </div>
          </div>
        )}

        {!connected && (
          <div style={{ fontSize: 11.5, color: TEXT_DIM, marginTop: 14, lineHeight: 1.6, textAlign: "center" }}>
            연동을 하지 않고도 우측 상단의 ✕ 를 눌러 데모 데이터로 가상 테스트를 진행할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
