// AppsScript_Code.gs
// 이 코드를 구글 스프레드시트의 [확장 프로그램] -> [Apps Script]에 붙여넣고 웹앱으로 배포하세요.

const INVENTORY_SHEET_NAME = "관리시트"; // 실제 사용 중인 스프레드시트의 시트 탭 이름으로 변경하세요.
const DEFECT_SHEET_NAME = "불량로그";
const RENT_SHEET_NAME = "대여로그";
const USERS_SHEET_NAME = "Users"; // ID와 패스워드가 저장될 시트 탭 이름입니다.

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    if (!sheet) {
      return responseJSON({ success: false, error: "시트 '" + INVENTORY_SHEET_NAME + "'를 찾을 수 없습니다." });
    }
    
    // 대여/반납 외부인용 웹 신청 폼 (파라미터가 없거나 action이 비어있으면 이 HTML 페이지를 띄워줍니다)
    if (!action) {
      return serveExternalForm(ss, sheet);
    }
    
    // 불량로그 시트 가져오거나 없으면 자동 생성
    let defectSheet = ss.getSheetByName(DEFECT_SHEET_NAME);
    if (!defectSheet) {
      defectSheet = ss.insertSheet(DEFECT_SHEET_NAME);
      defectSheet.getRange(1, 1, 1, 6).setValues([["제품명", "개수", "기록 시간", "불량 유형", "세부 사항", "대처 방안"]]);
    }
    
    // 대여로그 시트 가져오거나 없으면 자동 생성
    let rentSheet = ss.getSheetByName(RENT_SHEET_NAME);
    if (!rentSheet) {
      rentSheet = ss.insertSheet(RENT_SHEET_NAME);
      rentSheet.getRange(1, 1, 1, 7).setValues([["기록 시간", "구분", "위치", "제품명", "수량", "대여자 성함", "메모"]]);
    }
    
    if (action === "getAll") {
      const inventory = getInventoryData(sheet);
      const sectors = getSectorLayout();
      const users = getUsersData(ss);
      const defectLogs = getDefectLogs(defectSheet);
      const rentLogs = getRentLogs(rentSheet);
      return responseJSON({
        success: true,
        inventory: inventory,
        sectors: sectors,
        users: users,
        defectLogs: defectLogs,
        rentLogs: rentLogs
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
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
      let defectSheet = ss.getSheetByName(DEFECT_SHEET_NAME);
      if (!defectSheet) {
        defectSheet = ss.insertSheet(DEFECT_SHEET_NAME);
        defectSheet.getRange(1, 1, 1, 6).setValues([["제품명", "개수", "기록 시간", "불량 유형", "세부 사항", "대처 방안"]]);
      }
      const newRowIndex = addDefectLog(defectSheet, payload);
      return responseJSON({ success: true, rowIndex: newRowIndex });
    }

    if (action === "rentInventoryItem") {
      let rentSheet = ss.getSheetByName(RENT_SHEET_NAME);
      if (!rentSheet) {
        rentSheet = ss.insertSheet(RENT_SHEET_NAME);
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
            const rawStock = values[i][4]; // index 4 is Column E (Stock)
            const isNaValue = rawStock === "" || rawStock === null || rawStock === undefined || rawStock === "N/A" || isNaN(Number(rawStock));
            
            let nextStock = rawStock;
            if (!isNaValue) {
              let currentStock = Number(rawStock || 0);
              const qtyChange = Number(payload.qty || 0);
              
              if (payload.type === "대여") {
                nextStock = Math.max(0, currentStock - qtyChange);
              } else if (payload.type === "반납") {
                nextStock = currentStock + qtyChange;
              }
            }
            
            // Batch update E, F columns in 1 single write (leave G column/manager untouched)
            sheet.getRange(rowIdx, 5, 1, 2).setValues([[
              nextStock === "" || nextStock == null ? "" : nextStock,
              formatDate(new Date())
            ]]);
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

function getUsersData(ss) {
  let userSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!userSheet) {
    // Users 시트가 없다면 기본 어드민 정보로 자동 생성해 줍니다.
    userSheet = ss.insertSheet(USERS_SHEET_NAME);
    userSheet.getRange(1, 1, 1, 3).setValues([["ID", "PASSWORD", "NAME"]]);
    userSheet.getRange(2, 1, 1, 3).setValues([["admin", "1234", "관리자"]]);
    SpreadsheetApp.flush();
  }
  
  const lastRow = userSheet.getLastRow();
  if (lastRow < 2) {
    return [{ id: "admin", password: "1234", name: "관리자" }];
  }
  
  const range = userSheet.getRange(2, 1, lastRow - 1, 3);
  const values = range.getValues();
  const users = [];
  
  for (let i = 0; i < values.length; i++) {
    const id = String(values[i][0] || "").trim();
    const password = String(values[i][1] || "").trim();
    const name = String(values[i][2] || "").trim();
    if (id) {
      users.push({ id: id, password: password, name: name || id });
    }
  }
  return users;
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
    if (richRow && richRow[8] && typeof richRow[8].getLinkUrl === "function") {
      photoUrl = richRow[8].getLinkUrl() || "";
      if (!photoUrl && typeof richRow[8].getRuns === "function") {
        const runs = richRow[8].getRuns();
        for (let r = 0; r < runs.length; r++) {
          if (runs[r] && typeof runs[r].getLinkUrl === "function") {
            const runUrl = runs[r].getLinkUrl();
            if (runUrl) {
              photoUrl = runUrl;
              break;
            }
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
    if (richRow && richRow[3] && typeof richRow[3].getLinkUrl === "function") {
      itemLink = richRow[3].getLinkUrl() || "";
      if (!itemLink && typeof richRow[3].getRuns === "function") {
        const runs = richRow[3].getRuns();
        for (let r = 0; r < runs.length; r++) {
          if (runs[r] && typeof runs[r].getLinkUrl === "function") {
            const runUrl = runs[r].getLinkUrl();
            if (runUrl) {
              itemLink = runUrl;
              break;
            }
          }
        }
      }
    }
    if (!itemLink) {
      itemLink = String(row[3] || "").trim();
    }
    
    let itemStock = null;
    if (String(row[4]).trim().toUpperCase() === "N/A") {
      itemStock = "N/A";
    } else if (row[4] !== "" && !isNaN(Number(row[4]))) {
      itemStock = Number(row[4]);
    }

    inventory.push({
      rowIndex: rowIndex,
      location: String(row[0] || "").trim(),
      photo: photoUrl,
      name: String(row[2] || "").trim(),
      link: itemLink,
      stock: itemStock,
      updatedAt: displayValues[i][5] || "",
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
  
  const range = sheet.getRange(2, 1, lastRow - 1, 6);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const logs = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    logs.push({
      rowIndex: i + 2,
      timestamp: displayValues[i][2] || "",
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
  
  const rawStock = (item.stock === "N/A" || String(item.stock).toUpperCase() === "N/A") 
    ? "N/A" 
    : (item.stock === "" || item.stock == null ? "" : Number(item.stock));

  const rowValues = [
    item.location || "",
    "", // Column B (B열은 참고하지 않으므로 비워둡니다)
    item.name || "",
    item.link || "",
    rawStock,
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
  if (item.stock !== undefined) {
    currentValues[4] = (item.stock === "N/A" || String(item.stock).toUpperCase() === "N/A")
      ? "N/A"
      : (item.stock === "" || item.stock == null ? "" : Number(item.stock));
  }
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
}

function serveExternalForm(ss, sheet) {
  const inventory = [];
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    for (let i = 0; i < values.length; i++) {
      const loc = String(values[i][0] || "").trim();
      const name = String(values[i][2] || "").trim();
      const stock = (values[i][4] === "" || isNaN(Number(values[i][4]))) ? null : Number(values[i][4]);
      if (loc && name) {
        inventory.push({ location: loc, name: name, stock: stock });
      }
    }
  }

  // 가나다 순 정렬
  inventory.sort(function(a, b) { return a.name.localeCompare(b.name); });

  const html = getFormHtml(inventory);
  return HtmlService.createHtmlOutput(html)
    .setTitle("외부인 대여 및 반납 간편 신청서")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function handleExternalFormSubmit(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    if (!sheet) throw new Error("시트 '" + INVENTORY_SHEET_NAME + "'를 찾을 수 없습니다.");
    
    let rentSheet = ss.getSheetByName(RENT_SHEET_NAME);
    if (!rentSheet) {
      rentSheet = ss.insertSheet(RENT_SHEET_NAME);
      rentSheet.getRange(1, 1, 1, 7).setValues([["기록 시간", "구분", "위치", "제품명", "수량", "대여자 성함", "메모"]]);
    }
    
    const log = {
      timestamp: formatDate(new Date()),
      type: payload.type,
      location: payload.location,
      name: payload.name,
      qty: Number(payload.qty || 1),
      user: payload.user,
      note: payload.note || "외부인 신청"
    };
    
    const newRowIndex = addRentLog(rentSheet, log);
    
    // 재고 반영
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim() === String(log.location).trim() && 
            String(values[i][2]).trim() === String(log.name).trim()) {
          const rowIdx = i + 2;
          const rawStock = values[i][4];
          const isNaValue = rawStock === "" || rawStock === null || rawStock === undefined || rawStock === "N/A" || isNaN(Number(rawStock));
          
          let nextStock = rawStock;
          if (!isNaValue) {
            let currentStock = Number(rawStock || 0);
            const qtyChange = Number(log.qty || 0);
            if (log.type === "대여") {
              nextStock = Math.max(0, currentStock - qtyChange);
            } else if (log.type === "반납") {
              nextStock = currentStock + qtyChange;
            }
          }
          
          sheet.getRange(rowIdx, 5, 1, 2).setValues([[
            nextStock === "" || nextStock == null ? "" : nextStock,
            formatDate(new Date())
          ]]);
          break;
        }
      }
    }
    
    return { success: true, rowIndex: newRowIndex };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getFormHtml(inventory) {
  const inventoryJson = JSON.stringify(inventory);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>외부인 대여 및 반납 간편 신청서</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-dim: #475569;
      --border: #e2e8f0;
      --accent: #4f46e5;
      --accent-hover: #4338ca;
      --rent: #3b82f6;
      --return: #10b981;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .container { width: 100%; max-width: 480px; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; padding: 28px 24px; transition: all 0.3s; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .header p { font-size: 13px; color: var(--text-dim); line-height: 1.5; }
    
    .form-group { margin-bottom: 20px; position: relative; }
    .form-group label { display: block; font-size: 12.5px; font-weight: 700; color: var(--text-dim); margin-bottom: 6px; }
    
    /* Type Selector Cards */
    .type-container { display: flex; gap: 12px; margin-bottom: 20px; }
    .type-card { flex: 1; border: 2px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; cursor: pointer; font-weight: 800; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .type-card.active-rent { border-color: var(--rent); background: rgba(59, 130, 246, 0.08); color: var(--rent); }
    .type-card.active-return { border-color: var(--return); background: rgba(16, 185, 129, 0.08); color: var(--return); }
    
    /* Dropdown search */
    .search-input { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .search-input:focus { border-color: var(--accent); }
    
    .dropdown-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 50; box-shadow: var(--shadow); display: none; }
    .dropdown-item { padding: 10px 14px; cursor: pointer; font-size: 13.5px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .dropdown-item:hover { background: #f8fafc; }
    .dropdown-item .stock { font-size: 11px; color: var(--text-dim); background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
    
    /* Standard inputs */
    input[type="text"], input[type="number"], textarea { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; background: #fff; color: var(--text-main); }
    input[type="text"]:focus, input[type="number"]:focus, textarea:focus { border-color: var(--accent); }
    
    /* Qty controls */
    .qty-wrapper { display: flex; align-items: center; gap: 8px; }
    .qty-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: 1px solid var(--border); border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; user-select: none; transition: background 0.1s; }
    .qty-btn:active { background: #e2e8f0; }
    
    .btn-submit { width: 100%; padding: 13px; background: var(--accent); color: white; border: none; border-radius: 10px; font-size: 14.5px; font-weight: 800; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
    .btn-submit:hover { background: var(--accent-hover); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    
    /* Success Screen */
    .success-screen { display: none; text-align: center; padding: 24px 0; }
    .success-icon { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); color: var(--return); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px; }
    .success-screen h2 { font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; }
    .success-screen p { font-size: 14px; color: var(--text-dim); line-height: 1.6; margin-bottom: 24px; }
    .btn-reset { width: 100%; padding: 11px; background: #f1f5f9; color: var(--text-main); border: 1px solid var(--border); border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
    .btn-reset:hover { background: #e2e8f0; }
    
    /* Loading overlay */
    .loading-spinner { border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top: 3px solid #fff; width: 18px; height: 18px; animation: spin 0.8s linear infinite; display: none; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container" id="cardContainer">
    <!-- Form Area -->
    <div id="formArea">
      <div class="header">
        <h1>📦 외부인 대여 / 반납 신청서</h1>
        <p>대여 또는 반납하실 품목과 성함, 수량을 입력하여 실시간 재고에 반영해 주세요.</p>
      </div>
      
      <div class="type-container">
        <div class="type-card active-rent" id="typeRent" onclick="setType('대여')">
          🔵 대여 신청
        </div>
        <div class="type-card" id="typeReturn" onclick="setType('반납')">
          🟢 반납 신청
        </div>
      </div>
      
      <div class="form-group">
        <label>품목 검색 및 선택</label>
        <input type="text" class="search-input" id="searchBar" placeholder="품목 이름을 입력하세요..." onfocus="showDropdown()" oninput="filterDropdown()">
        <input type="hidden" id="selectedLocation">
        <input type="hidden" id="selectedName">
        
        <div class="dropdown-list" id="dropdownList"></div>
      </div>
      
      <div class="form-group">
        <label>수량</label>
        <div class="qty-wrapper">
          <button type="button" class="qty-btn" onclick="adjustQty(-1)">-</button>
          <input type="number" id="qtyInput" value="1" min="1" style="text-align: center; flex: 1;" oninput="validateForm()">
          <button type="button" class="qty-btn" onclick="adjustQty(1)">+</button>
        </div>
      </div>
      
      <div class="form-group">
        <label>신청자 성함</label>
        <input type="text" id="userInput" placeholder="실명을 입력해 주세요" oninput="validateForm()">
      </div>
      
      <div class="form-group">
        <label>메모 / 용도 (선택)</label>
        <textarea id="noteInput" rows="2" placeholder="용도나 남기실 메모를 작성해 주세요"></textarea>
      </div>
      
      <button class="btn-submit" id="btnSubmit" onclick="submitForm()" disabled>
        <div class="loading-spinner" id="btnSpinner"></div>
        <span id="btnText">신청 완료하기</span>
      </button>
    </div>
    
    <!-- Success Area -->
    <div class="success-screen" id="successArea">
      <div class="success-icon">✓</div>
      <h2 id="successTitle">신청이 완료되었습니다!</h2>
      <p id="successMessage">스프레드시트에 정상 등록되었으며 재고 카운트가 즉시 갱신되었습니다.</p>
      <button class="btn-reset" onclick="resetForm()">추가 신청하기</button>
    </div>
  </div>

  <script>
    const inventory = ${inventoryJson};
    let currentType = "대여";
    
    // Initialize dropdown items
    function showDropdown() {
      const list = document.getElementById("dropdownList");
      list.style.display = "block";
      filterDropdown();
    }
    
    // Close dropdown on click outside
    document.addEventListener("click", function(e) {
      const searchBar = document.getElementById("searchBar");
      const list = document.getElementById("dropdownList");
      if (e.target !== searchBar && !list.contains(e.target)) {
        list.style.display = "none";
      }
    });
    
    function filterDropdown() {
      const query = document.getElementById("searchBar").value.toLowerCase().trim();
      const list = document.getElementById("dropdownList");
      list.innerHTML = "";
      
      const filtered = inventory.filter(it => it.name.toLowerCase().includes(query) || it.location.toLowerCase().includes(query));
      
      if (filtered.length === 0) {
        list.innerHTML = '<div style="padding: 12px; font-size: 13px; color: #94a3b8; text-align: center;">검색 결과가 없습니다.</div>';
        return;
      }
      
      filtered.forEach(it => {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.innerHTML = '<div><strong>[' + it.location + ']</strong> ' + it.name + '</div><span class="stock">현재고: ' + (it.stock === null ? 'N/A' : it.stock) + '</span>';
        div.onclick = function() {
          document.getElementById("searchBar").value = '[' + it.location + '] ' + it.name;
          document.getElementById("selectedLocation").value = it.location;
          document.getElementById("selectedName").value = it.name;
          list.style.display = "none";
          validateForm();
        };
        list.appendChild(div);
      });
    }
    
    function setType(type) {
      currentType = type;
      const tRent = document.getElementById("typeRent");
      const tReturn = document.getElementById("typeReturn");
      
      if (type === "대여") {
        tRent.className = "type-card active-rent";
        tReturn.className = "type-card";
      } else {
        tRent.className = "type-card";
        tReturn.className = "type-card active-return";
      }
      validateForm();
    }
    
    function adjustQty(amount) {
      const qtyInput = document.getElementById("qtyInput");
      let val = parseInt(qtyInput.value) || 1;
      val = Math.max(1, val + amount);
      qtyInput.value = val;
      validateForm();
    }
    
    function validateForm() {
      const location = document.getElementById("selectedLocation").value;
      const name = document.getElementById("selectedName").value;
      const qty = parseInt(document.getElementById("qtyInput").value) || 0;
      const user = document.getElementById("userInput").value.trim();
      
      const btn = document.getElementById("btnSubmit");
      if (location && name && qty > 0 && user) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    }
    
    function submitForm() {
      const location = document.getElementById("selectedLocation").value;
      const name = document.getElementById("selectedName").value;
      const qty = parseInt(document.getElementById("qtyInput").value) || 1;
      const user = document.getElementById("userInput").value.trim();
      const note = document.getElementById("noteInput").value.trim();
      
      const btn = document.getElementById("btnSubmit");
      const text = document.getElementById("btnText");
      const spinner = document.getElementById("btnSpinner");
      
      btn.disabled = true;
      text.innerText = "처리 중...";
      spinner.style.display = "inline-block";
      
      const payload = {
        type: currentType,
        location: location,
        name: name,
        qty: qty,
        user: user,
        note: note
      };
      
      google.script.run
        .withSuccessHandler(function(res) {
          spinner.style.display = "none";
          if (res && res.success) {
            document.getElementById("formArea").style.display = "none";
            
            // Set success text
            const sTitle = document.getElementById("successTitle");
            const sMsg = document.getElementById("successMessage");
            sTitle.innerText = currentType + " 신청이 완료되었습니다!";
            sMsg.innerText = "[" + location + "] " + name + " 품목 " + qty + "개가 성공적으로 대장 및 재고에 반영되었습니다.";
            
            document.getElementById("successArea").style.display = "block";
          } else {
            alert("신청 중 오류가 발생했습니다: " + (res ? res.error : "알 수 없는 오류"));
            btn.disabled = false;
            text.innerText = "신청 완료하기";
          }
        })
        .withFailureHandler(function(err) {
          spinner.style.display = "none";
          alert("네트워크 통신 실패: " + err);
          btn.disabled = false;
          text.innerText = "신청 완료하기";
        })
        .handleExternalFormSubmit(payload);
    }
    
    function resetForm() {
      document.getElementById("searchBar").value = "";
      document.getElementById("selectedLocation").value = "";
      document.getElementById("selectedName").value = "";
      document.getElementById("qtyInput").value = "1";
      document.getElementById("userInput").value = "";
      document.getElementById("noteInput").value = "";
      
      document.getElementById("successArea").style.display = "none";
      document.getElementById("formArea").style.display = "block";
      
      const btn = document.getElementById("btnSubmit");
      btn.disabled = true;
      document.getElementById("btnText").innerText = "신청 완료하기";
      
      setType("대여");
    }
  </script>
</body>
</html>`;
}
