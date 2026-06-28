import React, { useState } from "react";
import { ClipboardList, Settings, ShieldAlert, PackageCheck, Link as LinkIcon, RefreshCw, CheckCircle, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface LandingPageProps {
  onNavigate: (view: "rental" | "login") => void;
  isLightMode: boolean;
  scriptUrl: string;
  setScriptUrl: (url: string) => void;
  connecting: boolean;
  connectError: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function LandingPage({
  onNavigate,
  isLightMode,
  scriptUrl,
  setScriptUrl,
  connecting,
  connectError,
  connected,
  onConnect,
  onDisconnect,
}: LandingPageProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: isLightMode
          ? "radial-gradient(circle at top, #f8fafc 0%, #e2e8f0 100%)"
          : "radial-gradient(circle at top, #0f172a 0%, #020617 100%)",
        color: isLightMode ? "#0f172a" : "#f1f5f9",
        padding: "40px 20px",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          width: "100%",
          textAlign: "center",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "64px",
            height: "64px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#ffffff",
            marginBottom: "20px",
            boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)",
          }}
        >
          <PackageCheck size={32} />
        </div>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: "12px",
            background: "linear-gradient(to right, #818cf8, #6366f1, #4f46e5)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          스마트 WMS 자재 자율 대여 및 관리 시스템
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: isLightMode ? "#475569" : "#94a3b8",
            lineHeight: 1.6,
          }}
        >
          실시간 구글 스프레드시트 연동 기반의 자재 관리 플랫폼입니다.<br />
          자재 대여 및 반납은 대여 모드를, 창고 배치 및 재고 수정은 관리자 모드를 이용하세요.
        </p>
      </div>

      {/* 실시간 구글 스프레드시트 웹앱 URL 연동 패널 */}
      <div
        style={{
          maxWidth: "800px",
          width: "100%",
          background: isLightMode ? "#ffffff" : "#1e293b",
          border: `1px solid ${connected ? (isLightMode ? "#bbf7d0" : "#064e3b") : (isLightMode ? "#e2e8f0" : "#334155")}`,
          borderRadius: "20px",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: connected ? "rgba(16, 185, 129, 0.12)" : "rgba(99, 102, 241, 0.12)",
                color: connected ? "#10b981" : "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LinkIcon size={18} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                구글 스프레드시트 연동 설정
                {connected ? (
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#10b981",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 700,
                    }}
                  >
                    ● 실시간 연동 활성화됨
                  </span>
                ) : (
                  <span
                    style={{
                      background: "rgba(245, 158, 11, 0.12)",
                      color: "#f59e0b",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 700,
                    }}
                  >
                    ● 가상 데모 모드 (연동 전)
                  </span>
                )}
              </div>
              <div style={{ fontSize: "11.5px", color: isLightMode ? "#64748b" : "#94a3b8", marginTop: "2px" }}>
                자재 데이터 수정 및 대여 신청 건이 스프레드시트에 즉시 기록됩니다.
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowGuide(!showGuide)}
            style={{
              background: "transparent",
              border: "none",
              color: "#6366f1",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <HelpCircle size={14} />
            {showGuide ? "설치 가이드 닫기" : "처음이신가요? 연동 방법 보기"}
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* 연동 가이드 */}
        {showGuide && (
          <div
            style={{
              background: isLightMode ? "#f8fafc" : "#131d30",
              border: `1px solid ${isLightMode ? "#e2e8f0" : "#222f4b"}`,
              borderRadius: "12px",
              padding: "16px 20px",
              fontSize: "12px",
              color: isLightMode ? "#475569" : "#cbd5e1",
              lineHeight: 1.8,
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: "8px", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>💡 Apps Script 연동 3분 완성 단계</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                  alert("Apps Script 코드가 클립보드에 복사되었습니다! 스프레드시트에 붙여넣으세요.");
                }}
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#4338ca")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#4f46e5")}
              >
                📋 Apps Script 코드 전체 복사하기
              </button>
            </div>
            <ol style={{ paddingLeft: "16px", margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li>구글 시트 상단 메뉴: <b>확장 프로그램 → Apps Script</b> 클릭</li>
              <li>화면의 기본 코드를 모두 지우고, <b>[Apps Script 코드 전체 복사하기]</b> 버튼을 눌러 복사한 코드를 붙여넣습니다.</li>
              <li>상단 메뉴 중 <b>배포 → 새 배포</b>를 누릅니다.</li>
              <li>유형: <b>웹 앱</b>, 실행 사용자: <b>나 (Me)</b>, 액세스할 수 있는 사람: <b>모든 사람 (Anyone)</b>으로 선택 후 [배포] 클릭!</li>
              <li>생성된 <b>웹 앱 URL (https://script.google.com/macros/...)</b>을 복사하여 아래에 입력합니다.</li>
            </ol>

            <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "11px", color: isLightMode ? "#475569" : "#94a3b8" }}>
              📄 소스코드 미리보기 (직접 수동 복사 가능)
            </div>
            <div
              style={{
                background: isLightMode ? "#f1f5f9" : "#0f172a",
                border: `1px solid ${isLightMode ? "#cbd5e1" : "#222f4b"}`,
                borderRadius: "8px",
                padding: "10px",
                maxHeight: "150px",
                overflow: "auto",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "11px",
                whiteSpace: "pre",
                color: isLightMode ? "#0f172a" : "#38bdf8",
              }}
            >
              {APPS_SCRIPT_CODE}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          <input
            type="text"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
            placeholder="Google Apps Script 웹 앱 URL을 입력해 주세요 (https://script.google.com/macros/...)"
            style={{
              flex: 1,
              minWidth: "280px",
              background: isLightMode ? "#f8fafc" : "#0f172a",
              border: `1px solid ${isLightMode ? "#cbd5e1" : "#334155"}`,
              borderRadius: "10px",
              padding: "11px 14px",
              fontSize: "13px",
              color: isLightMode ? "#0f172a" : "#f1f5f9",
              outline: "none",
              fontFamily: "var(--font-mono, monospace)",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onConnect}
              disabled={connecting}
              style={{
                background: connected ? "#10b981" : "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "0 22px",
                height: "42px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                opacity: connecting ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} className={connecting ? "animate-spin" : ""} style={{ animation: connecting ? "spin 1s linear infinite" : "none" }} />
              {connecting ? "연동 테스트 중..." : connected ? "주소 업데이트" : "연동하기"}
            </button>
            {connected && (
              <button
                onClick={onDisconnect}
                style={{
                  background: "transparent",
                  border: `1px solid ${isLightMode ? "#cbd5e1" : "#334155"}`,
                  color: isLightMode ? "#64748b" : "#94a3b8",
                  borderRadius: "10px",
                  padding: "0 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                연동 해제
              </button>
            )}
          </div>
        </div>

        {connectError && (
          <div
            style={{
              fontSize: "12px",
              color: "#ef4444",
              background: "rgba(239, 68, 68, 0.08)",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              textAlign: "left",
              whiteSpace: "pre-wrap",
            }}
          >
            ⚠️ {connectError}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          maxWidth: "800px",
          width: "100%",
        }}
      >
        {/* 대여/반납 전용 모드 카드 */}
        <div
          onClick={() => onNavigate("rental")}
          className="group"
          style={{
            background: isLightMode ? "#ffffff" : "#1e293b",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "#334155"}`,
            borderRadius: "24px",
            padding: "32px",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(99, 102, 241, 0.25)";
            e.currentTarget.style.borderColor = "#6366f1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
            e.currentTarget.style.borderColor = isLightMode ? "#e2e8f0" : "#334155";
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <ClipboardList size={24} />
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "8px",
              color: isLightMode ? "#0f172a" : "#f1f5f9",
            }}
          >
            📋 자재 대여 및 반납
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: isLightMode ? "#64748b" : "#94a3b8",
              lineHeight: 1.5,
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            자재 대여 및 반납 신청을 작성합니다. 검색창을 통해 필요한 품목을 빠르게 찾아보고, 등록된 사진과 특이사항을 실시간으로 확인하여 자율적으로 대여할 수 있습니다.
          </p>
          <div
            style={{
              marginTop: "auto",
              padding: "10px 20px",
              background: "#4f46e5",
              color: "#ffffff",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s",
            }}
          >
            대여 신청 페이지 가기 →
          </div>
        </div>

        {/* 관리자 모드 카드 */}
        <div
          onClick={() => onNavigate("login")}
          style={{
            background: isLightMode ? "#ffffff" : "#1e293b",
            border: `1px solid ${isLightMode ? "#e2e8f0" : "#334155"}`,
            borderRadius: "24px",
            padding: "32px",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(236, 72, 153, 0.2)";
            e.currentTarget.style.borderColor = "#ec4899";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
            e.currentTarget.style.borderColor = isLightMode ? "#e2e8f0" : "#334155";
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "rgba(236, 72, 153, 0.15)",
              color: "#f472b6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <Settings size={24} />
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              marginBottom: "8px",
              color: isLightMode ? "#0f172a" : "#f1f5f9",
            }}
          >
            🛠️ WMS 보관 구역 및 관리자 모드
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: isLightMode ? "#64748b" : "#94a3b8",
              lineHeight: 1.5,
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            3D/2D 보관 구역 모니터링, 재고 실사 관리, 랙의 좌표 및 회전도 설정, 실시간 불량 자재 로그를 관리합니다. 스프레드시트에 지정된 편집 권한 계정으로만 접근할 수 있습니다.
          </p>
          <div
            style={{
              marginTop: "auto",
              padding: "10px 20px",
              background: isLightMode ? "#0f172a" : "#334155",
              color: "#ffffff",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: `1px solid ${isLightMode ? "#0f172a" : "#475569"}`,
            }}
          >
            관리자 모드 로그인 →
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "48px",
          fontSize: "11px",
          color: isLightMode ? "#94a3b8" : "#475569",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <ShieldAlert size={12} />
        <span>권한 있는 계정 및 패스워드는 스프레드시트의 <strong>Users</strong> 탭에서 실시간 업데이트 가능합니다.</span>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const APPS_SCRIPT_CODE = `// AppsScript_Code.gs
// 이 코드를 구글 스프레드시트의 [확장 프로그램] -> [Apps Script]에 붙여넣고 웹앱으로 배포하세요.

const INVENTORY_SHEET_NAME = "시트1"; // 실제 사용 중인 스프레드시트의 시트 탭 이름으로 변경하세요.
const DEFECT_SHEET_NAME = "불량로그";
const RENT_SHEET_NAME = "대여로그";
const USERS_SHEET_NAME = "Users"; // ID와 패스워드가 저장될 시트 탭 이름입니다.

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
    if (!sheet) {
      return responseJSON({ success: false, error: "시트 '" + INVENTORY_SHEET_NAME + "'를 찾을 수 없습니다." });
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

function getUsersData(ss) {
  let userSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!userSheet) {
    // Users 시트가 없다면 기본 어드민 정보로 자동 생성해 줍니다.
    userSheet = ss.insertSheet(USERS_SHEET_NAME);
    userSheet.getRange(1, 1, 1, 2).setValues([["ID", "PASSWORD"]]);
    userSheet.getRange(2, 1, 1, 2).setValues([["admin", "1234"]]);
    SpreadsheetApp.flush();
  }
  
  const lastRow = userSheet.getLastRow();
  if (lastRow < 2) {
    return [{ id: "admin", password: "1234" }];
  }
  
  const range = userSheet.getRange(2, 1, lastRow - 1, 2);
  const values = range.getValues();
  const users = [];
  
  for (let i = 0; i < values.length; i++) {
    const id = String(values[i][0] || "").trim();
    const password = String(values[i][1] || "").trim();
    if (id) {
      users.push({ id: id, password: password });
    }
  }
  return users;
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
}
`;

