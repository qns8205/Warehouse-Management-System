import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { InventoryItem, Rack, DefectLog, RentLog, WmsUser } from "./types";
import { DEMO_INVENTORY } from "./data/demo";
import { autoLayoutRacks, snap, formatTimestampLocal, parseLocation, hexToRgba } from "./utils/drive";

// Subcomponents
import ConnectionBadge from "./components/ConnectionBadge";
import SetupModal from "./components/SetupModal";
import ItemFormModal from "./components/ItemFormModal";
import SidePanel from "./components/SidePanel";
import DefectLogsPage from "./components/DefectLogsPage";
import RentLogsPage from "./components/RentLogsPage";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import RentalPage from "./components/RentalPage";

// Icons
import {
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  Settings,
  Grid,
  MapPin,
  ChevronRight,
  Package,
  Sun,
  Moon,
} from "lucide-react";

const DEFAULT_SCRIPT_URL = (import.meta as any).env?.VITE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwc5YXabteLtTakGJqNo74AHD_AchtBw1bLlXEBiwmyk7CVdKsesrqSx8FZMOM1LrhuYQ/exec";

const DEMO_DEFECT_LOGS: DefectLog[] = [
  {
    timestamp: "2026-06-25 14:20:10",
    location: "A-1-2",
    name: "리튬 이온 배터리 팩",
    qty: 2,
    defectType: "파손",
    manager: "김민수",
    note: "파레트 하차 중 낙하하여 배터리 케이스 균열 발생",
    actionTaken: "즉시 안전 폐기 대기 구역으로 이동 조치함"
  },
  {
    timestamp: "2026-06-24 10:15:30",
    location: "B-2-1",
    name: "고주파 동축 케이블 (5m)",
    qty: 5,
    defectType: "오염",
    manager: "박영희",
    note: "박스 내부 습기 침투로 인해 커넥터 접촉부 부식 발생",
    actionTaken: "불량 케이블 전량 반품 및 공급사 교환 요청 접수"
  },
  {
    timestamp: "2026-06-22 17:05:00",
    location: "C-1-1",
    name: "LED 디스플레이 모듈 7형",
    qty: 1,
    defectType: "기능 오작동",
    manager: "이준우",
    note: "전원 인가 시 화면 일부 픽셀 깨짐 및 세로줄 노이즈 발생",
    actionTaken: "제조사 무상 AS 의뢰 접수 및 대체품 교체 완료"
  }
];

const DEMO_RENT_LOGS: RentLog[] = [
  {
    timestamp: "2026-06-26 14:10:00",
    location: "A-1-1",
    name: "리튬 이온 배터리 팩",
    type: "대여",
    qty: 3,
    user: "홍길동",
    note: "배터리 팩 방전 테스트 목적 대여"
  },
  {
    timestamp: "2026-06-25 11:20:00",
    location: "B-2-2",
    name: "고주파 동축 케이블 (5m)",
    type: "반납",
    qty: 2,
    user: "이영희",
    note: "부서 테스트 장비 사용 완료 후 정상 반납"
  }
];

/* ============================================================
   메인 컴포넌트 (창고 구역 관리 및 구글 스프레드시트 실시간 연동)
   ============================================================ */
export default function App() {
  // 1. 상태 선언
  const [currentView, setCurrentView] = useState<"landing" | "login" | "rental" | "monitor" | "defect" | "rent">("landing");
  const [users, setUsers] = useState<WmsUser[]>(() => {
    const cached = localStorage.getItem("wms_cached_users");
    return cached ? JSON.parse(cached) : [{ id: "admin", password: "1234" }];
  });
  const [defectLogs, setDefectLogs] = useState<DefectLog[]>(() => {
    const cached = localStorage.getItem("wms_cached_defect_logs");
    return cached ? JSON.parse(cached) : DEMO_DEFECT_LOGS;
  });
  const [rentLogs, setRentLogs] = useState<RentLog[]>(() => {
    const cached = localStorage.getItem("wms_cached_rent_logs");
    return cached ? JSON.parse(cached) : DEMO_RENT_LOGS;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const cached = localStorage.getItem("wms_is_admin");
    return cached === "true"; // 기본은 false (대여/조회 모드)
  });
  const [showRentModal, setShowRentModal] = useState<{ item: InventoryItem; actionType: "대여" | "반납" } | null>(null);
  const [rentUserName, setRentUserName] = useState("");
  const [rentQty, setRentQty] = useState(1);
  const [rentNote, setRentNote] = useState("");

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [authPasscodeInput, setAuthPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  // 대여 모달이 열릴 때 기본값으로 상태 리셋
  useEffect(() => {
    if (showRentModal) {
      setRentUserName("");
      setRentQty(1);
      setRentNote("");
    }
  }, [showRentModal]);

  const [inventory, setInventory] = useState<InventoryItem[]>(DEMO_INVENTORY);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

  // 구글 Apps Script 연동 상태 (로컬 스토리지 보존으로 새로고침해도 자동복구)
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem("wms_script_url") || DEFAULT_SCRIPT_URL);
  const [connected, setConnected] = useState(() => {
    const savedConnected = localStorage.getItem("wms_connected");
    if (savedConnected === null) {
      return true; // 기본값 연동 활성화
    }
    return savedConnected === "true";
  });
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [showSetup, setShowSetup] = useState(() => {
    const savedUrl = localStorage.getItem("wms_script_url");
    const savedConnected = localStorage.getItem("wms_connected");
    if (!savedUrl && savedConnected === null) {
      return false; // 첫 로드 시 prefilled URL과 connected=true이므로 연동창을 안 띄움
    }
    return savedConnected !== "true";
  });

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    const saved = localStorage.getItem("wms_last_sync");
    return saved ? new Date(saved) : null;
  });

  const [isLightMode, setIsLightMode] = useState(() => {
    const saved = localStorage.getItem("wms_light_mode");
    return saved === null ? true : saved === "true";
  });

  const toggleLightMode = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      localStorage.setItem("wms_light_mode", String(next));
      return next;
    });
  };

  const [toast, setToast] = useState<{ msg: string; type: "info" | "ok" | "warn" | "error" } | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightShelf, setHighlightShelf] = useState<string | null>(null);
  const [highlightedItemRowIndex, setHighlightedItemRowIndex] = useState<number | null>(null);

  const [showAddRackModal, setShowAddRackModal] = useState(false);
  const [newRackCode, setNewRackCode] = useState("");
  const [newRackName, setNewRackName] = useState("");

  const [displayMode, setDisplayMode] = useState<"grid" | "canvas">("grid");

  // 2. Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; zoom: number } | null>(null);
  const rotateState = useRef<{ id: string; cx: number; cy: number; startAngle: number } | null>(null);
  const panState = useRef<{ startX: number; startY: number; origPan: { x: number; y: number } } | null>(null);
  const initializedRef = useRef(false);

  // 3. 토스트 알림 표시 유틸
  const showToast = (msg: string, type: "info" | "ok" | "warn" | "error" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // 4. 초기 레이아웃 복원
  useEffect(() => {
    if (!localStorage.getItem("wms_script_url")) {
      localStorage.setItem("wms_script_url", scriptUrl);
    }
    if (localStorage.getItem("wms_connected") === null) {
      localStorage.setItem("wms_connected", String(connected));
    }

    // 로컬 스토리지에 캐시된 인벤토리/랙이 있다면 자동 로드
    const cachedInv = localStorage.getItem("wms_cached_inventory");
    const cachedRacks = localStorage.getItem("wms_cached_racks");

    if (cachedInv && cachedRacks) {
      try {
        setInventory(JSON.parse(cachedInv));
        setRacks(JSON.parse(cachedRacks));
        initializedRef.current = true;
      } catch (e) {
        // 캐시 파싱 에러 시 데모 기본값 로드
        const r = autoLayoutRacks(DEMO_INVENTORY, []);
        setRacks(r);
        initializedRef.current = true;
      }
    } else {
      const r = autoLayoutRacks(inventory, []);
      setRacks(r);
      initializedRef.current = true;
    }

    // 만약 URL이 들어있고 connected 마크가 참이면 바로 데이터 자동 갱신
    if (scriptUrl && connected) {
      silentRefresh();
    }
  }, []); // eslint-disable-line

  // 랙 정보가 변경될 때마다 캐시에 저장
  useEffect(() => {
    if (racks.length > 0) {
      localStorage.setItem("wms_cached_racks", JSON.stringify(racks));
    }
  }, [racks]);

  useEffect(() => {
    if (inventory.length > 0) {
      localStorage.setItem("wms_cached_inventory", JSON.stringify(inventory));
    }
  }, [inventory]);

  useEffect(() => {
    if (defectLogs.length > 0) {
      localStorage.setItem("wms_cached_defect_logs", JSON.stringify(defectLogs));
    }
  }, [defectLogs]);

  useEffect(() => {
    if (rentLogs.length > 0) {
      localStorage.setItem("wms_cached_rent_logs", JSON.stringify(rentLogs));
    }
  }, [rentLogs]);

  useEffect(() => {
    localStorage.setItem("wms_is_admin", String(isAdmin));
  }, [isAdmin]);

  /* ---------------- Apps Script API 연동 로직 ---------------- */
  async function callScript(action: string, payload: any) {
    if (!scriptUrl) throw new Error("구글 스프레드시트 연동 URL이 입력되지 않았습니다.");
    
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // CORS 프리플라이트를 피하기 위한 text/plain 설정
      body: JSON.stringify({ action, payload }),
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "스프레드시트 요청 실패");
    return data;
  }

  async function fetchAll() {
    if (!scriptUrl) throw new Error("연동 URL이 비어 있습니다.");
    const res = await fetch(`${scriptUrl}?action=getAll`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "스프레드시트 조회 실패");
    return data;
  }

  // 백그라운드 무소음 리프레시 (사용자 흐름 방해 없이 자동 싱크)
  async function silentRefresh() {
    try {
      const data = await fetchAll();
      const inv = data.inventory && data.inventory.length > 0 ? data.inventory : DEMO_INVENTORY;
      setInventory(inv);
      if (data.sectors && data.sectors.length > 0) {
        setRacks(racksFromServerSectors(data.sectors, inv));
      }
      if (data.defectLogs) {
        setDefectLogs(data.defectLogs);
      }
      if (data.rentLogs) {
        setRentLogs(data.rentLogs);
      }
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem("wms_cached_users", JSON.stringify(data.users));
      }
      setLastSync(new Date());
    } catch (e) {
      // 무소음 실패는 무시
    }
  }

  // 구글 스프레드시트 데이터와 랙 선반 정보 병합
  function racksFromServerSectors(sectors: any[], inv: InventoryItem[]): Rack[] {
    const rackShelves: { [key: string]: Set<string> } = {};
    inv.forEach((item) => {
      const { rack } = parseLocation(item.location);
      if (!rack) return;
      if (!rackShelves[rack]) rackShelves[rack] = new Set<string>();
      rackShelves[rack].add(item.location.trim());
    });

    return sectors.map((s, i) => ({
      id: s.id,
      name: s.name || `${s.id} 랙`,
      x: s.x,
      y: s.y,
      width: s.width || 200,
      height: s.height || 200,
      rotation: s.rotation || 0,
      color: s.color || "#9CAF97",
      shelves: Array.from(rackShelves[s.id] || []).sort(),
    }));
  }

  // 첫 연동 테스트
  async function handleConnect() {
    if (!scriptUrl.trim()) {
      setConnectError("구글 스프레드시트 Apps Script URL을 올바르게 채워주세요.");
      return;
    }
    setConnecting(true);
    setConnectError("");
    try {
      const data = await fetchAll();
      const inv = data.inventory && data.inventory.length > 0 ? data.inventory : DEMO_INVENTORY;
      setInventory(inv);
      
      let nextRacks: Rack[] = [];
      if (data.sectors && data.sectors.length > 0) {
        nextRacks = racksFromServerSectors(data.sectors, inv);
      } else {
        nextRacks = autoLayoutRacks(inv, []);
      }
      setRacks(nextRacks);

      if (data.defectLogs) {
        setDefectLogs(data.defectLogs);
      }

      if (data.rentLogs) {
        setRentLogs(data.rentLogs);
      }

      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem("wms_cached_users", JSON.stringify(data.users));
      }

      // 로컬 스토리지에 연동 정보 저장
      localStorage.setItem("wms_script_url", scriptUrl.trim());
      localStorage.setItem("wms_connected", "true");
      localStorage.setItem("wms_last_sync", new Date().toISOString());

      setConnected(true);
      setShowSetup(false);
      setLastSync(new Date());
      showToast("구글 스프레드시트 연동 완료! 실시간 저장 모드가 활성화되었습니다.", "ok");
    } catch (err: any) {
      setConnectError("스프레드시트 연동 실패: " + err.message + "\nURL과 웹앱 배포 설정(액세스 권한: 모든 사람)을 다시 한번 검토해주세요.");
    } finally {
      setConnecting(false);
    }
  }

  // 실시간 새로고침
  async function handleRefresh() {
    if (!connected) {
      showToast("현재 가상 데모 모드입니다. 구글 시트 연동 후 클릭해주세요.", "warn");
      return;
    }
    showToast("스프레드시트 동기화 진행 중...", "info");
    try {
      const data = await fetchAll();
      const inv = data.inventory || [];
      setInventory(inv);
      if (data.sectors && data.sectors.length > 0) {
        setRacks(racksFromServerSectors(data.sectors, inv));
      }
      if (data.defectLogs) {
        setDefectLogs(data.defectLogs);
      }
      if (data.rentLogs) {
        setRentLogs(data.rentLogs);
      }
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        localStorage.setItem("wms_cached_users", JSON.stringify(data.users));
      }
      setLastSync(new Date());
      localStorage.setItem("wms_last_sync", new Date().toISOString());
      setDirty(false);
      showToast("실시간 스프레드시트 동기화 완료!", "ok");
    } catch (err: any) {
      showToast("동기화 실패: " + err.message, "error");
    }
  }

  // 랙 배치 레이아웃 스프레드시트 서버 저장
  async function persistLayout(nextRacks: Rack[]) {
    if (!connected) {
      setDirty(true);
      return;
    }
    setSaving(true);
    try {
      const sectors = nextRacks.map((r) => ({
        id: r.id,
        name: r.name,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        rotation: r.rotation,
        color: r.color,
        group: r.id,
      }));
      await callScript("saveSectorLayout", { sectors });
      setLastSync(new Date());
      localStorage.setItem("wms_last_sync", new Date().toISOString());
      setDirty(false);
    } catch (err: any) {
      showToast("배치 저장 실패: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // 디바운스 레이아웃 저장 타이머
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  function scheduleSave(nextRacks: Rack[]) {
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistLayout(nextRacks);
    }, 800);
  }

  /* ---------------- 랙 배치 및 조작 ---------------- */
  function regenerateFromInventory() {
    const r = autoLayoutRacks(inventory, racks);
    setRacks(r);
    scheduleSave(r);
    showToast("스프레드시트 위치 코드 분석을 기반으로 랙을 자동 배치하였습니다.", "ok");
  }

  function addManualRack() {
    setNewRackCode("");
    setNewRackName("");
    setShowAddRackModal(true);
  }

  function handleCreateManualRack() {
    const id = newRackCode.trim().toUpperCase();
    if (!id) {
      showToast("올바른 단축 코드를 입력해야 합니다.", "warn");
      return;
    }

    if (racks.some((r) => r.id === id)) {
      showToast(`이미 '${id}' 단축 코드를 사용하는 구역이 존재합니다.`, "warn");
      return;
    }

    const name = newRackName.trim() || `${id} 구역`;

    const newRack: Rack = {
      id,
      name,
      x: snap(120 + Math.random() * 200),
      y: snap(120 + Math.random() * 200),
      width: 200,
      height: 200,
      rotation: 0,
      color: "#8FA3B8",
      shelves: [],
    };
    const next = [...racks, newRack];
    setRacks(next);
    scheduleSave(next);
    setSelectedRackId(id);
    setShowAddRackModal(false);
    showToast(`'${name}' (${id}) 구역이 새로 생성되었습니다.`, "ok");
  }

  function deleteRack(id: string) {
    const next = racks.filter((r) => r.id !== id);
    setRacks(next);
    setSelectedRackId(null);
    scheduleSave(next);
    if (connected) {
      callScript("deleteSector", { sectorId: id }).catch(() => {});
    }
    showToast("랙 구역을 철거하였습니다.", "info");
  }

  function updateRackField(id: string, fields: Partial<Rack>) {
    const next = racks.map((r) => (r.id === id ? { ...r, ...fields } : r));
    setRacks(next);
    scheduleSave(next);
  }

  /* ---------------- 랙 이동 마우스 드래그 ---------------- */
  const onPointerDownMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, rack: Rack) => {
      e.stopPropagation();
      setSelectedRackId(rack.id);
      const startX = e.clientX;
      const startY = e.clientY;
      dragState.current = {
        id: rack.id,
        startX,
        startY,
        origX: rack.x,
        origY: rack.y,
        zoom,
      };

      function onMove(ev: PointerEvent) {
        if (!dragState.current) return;
        const dx = (ev.clientX - dragState.current.startX) / dragState.current.zoom;
        const dy = (ev.clientY - dragState.current.startY) / dragState.current.zoom;
        
        setRacks((prev) =>
          prev.map((r) =>
            r.id === dragState.current!.id
              ? {
                  ...r,
                  x: Math.max(0, snap(dragState.current!.origX + dx)),
                  y: Math.max(0, snap(dragState.current!.origY + dy)),
                }
              : r
          )
        );
      }

      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        dragState.current = null;
        setRacks((prev) => {
          scheduleSave(prev);
          return prev;
        });
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [zoom]
  );

  /* ---------------- 랙 모서리 수동 회전 ---------------- */
  const onPointerDownRotate = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, rack: Rack) => {
      e.stopPropagation();
      e.preventDefault();
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const cx = rect.left + (rack.x + rack.width / 2) * zoom;
      const cy = rect.top + (rack.y + rack.height / 2) * zoom;

      const angleFromCenter = (xVal: number, yVal: number) => {
        return (Math.atan2(yVal - cy, xVal - cx) * 180) / Math.PI;
      };

      rotateState.current = {
        id: rack.id,
        cx,
        cy,
        startAngle: angleFromCenter(e.clientX, e.clientY) - rack.rotation,
      };

      function onMove(ev: PointerEvent) {
        if (!rotateState.current) return;
        const current = angleFromCenter(ev.clientX, ev.clientY);
        let rotation = current - rotateState.current.startAngle;
        
        // Shift 키 홀드 시 15도 스냅 정렬 기능 지원
        if (ev.shiftKey) {
          rotation = Math.round(rotation / 15) * 15;
        }
        
        setRacks((prev) =>
          prev.map((r) =>
            r.id === rotateState.current!.id ? { ...r, rotation: Math.round(rotation) } : r
          )
        );
      }

      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        rotateState.current = null;
        setRacks((prev) => {
          scheduleSave(prev);
          return prev;
        });
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [zoom]
  );

  /* ---------------- 캔버스 팬 / 휠 줌 조작 ---------------- */
  function onCanvasPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // 랙 박스를 클릭했을 때는 배경 팬이 작동하지 않도록 함
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains("canvas-bg")) {
      return;
    }
    setSelectedRackId(null);
    setSearchOpen(false);
    panState.current = { startX: e.clientX, startY: e.clientY, origPan: { ...pan } };

    function onMove(ev: PointerEvent) {
      if (!panState.current) return;
      const dx = ev.clientX - panState.current.startX;
      const dy = ev.clientY - panState.current.startY;
      setPan({
        x: panState.current.origPan.x + dx,
        y: panState.current.origPan.y + dy,
      });
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      panState.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    // 확대축소 한계치 설정 (0.4배 ~ 2.2배)
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom((z) => Math.min(2.2, Math.max(0.4, z + delta)));
  }

  /* ---------------- 선택한 구역의 선반별 필터링 ---------------- */
  const selectedRack = useMemo(() => {
    return racks.find((r) => r.id === selectedRackId);
  }, [racks, selectedRackId]);

  const shelvesWithItems = useMemo(() => {
    if (!selectedRack) return [];
    const map: { [key: string]: InventoryItem[] } = {};
    inventory.forEach((it) => {
      const { rack } = parseLocation(it.location);
      if (rack !== selectedRack.id) return;
      const loc = it.location.trim();
      if (!map[loc]) map[loc] = [];
      map[loc].push(it);
    });
    return Object.keys(map)
      .sort()
      .map((loc) => ({ shelf: loc, items: map[loc] }));
  }, [selectedRack, inventory]);

  const totalStockByRack = useMemo(() => {
    const map: { [key: string]: number } = {};
    inventory.forEach((it) => {
      const { rack } = parseLocation(it.location);
      if (!rack) return;
      map[rack] = (map[rack] || 0) + (typeof it.stock === "number" ? it.stock : 0);
    });
    return map;
  }, [inventory]);

  const itemCountByRack = useMemo(() => {
    const map: { [key: string]: number } = {};
    inventory.forEach((it) => {
      const { rack } = parseLocation(it.location);
      if (!rack) return;
      map[rack] = (map[rack] || 0) + 1;
    });
    return map;
  }, [inventory]);

  /* ---------------- 품목명, 스펙 검색 ---------------- */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return inventory
      .filter(
        (it) =>
          (it.name || "").toLowerCase().includes(q) ||
          (it.location || "").toLowerCase().includes(q) ||
          (it.spec || "").toLowerCase().includes(q) ||
          (it.note || "").toLowerCase().includes(q) ||
          (it.manager || "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [searchQuery, inventory]);

  function focusOnItem(item: InventoryItem) {
    const { rack } = parseLocation(item.location);
    setSelectedRackId(rack);
    setHighlightShelf(item.location.trim());
    setHighlightedItemRowIndex(item.rowIndex ?? null);
    setSearchOpen(false);
    
    showToast(`🔍 ${item.name}의 위치(${item.location})로 자동 이동하였습니다.`, "ok");

    // 해당 랙 카드가 있는 위치로 스크롤 이동
    setTimeout(() => {
      const element = document.getElementById(`rack-card-${rack}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => {
      setHighlightShelf(null);
      setHighlightedItemRowIndex(null);
    }, 5000);
  }

  /* ---------------- 품목 추가 / 수정 / 삭제 실시간 연동 ---------------- */
  async function saveInventoryItem(item: Omit<InventoryItem, "rowIndex"> & { rowIndex?: number }) {
    const isNew = !item.rowIndex;
    setSaving(true);
    try {
      if (connected) {
        if (isNew) {
          await callScript("addInventoryItem", item);
        } else {
          await callScript("updateInventoryItem", item);
        }
        // 최신 인벤토리 실시간 재동기화
        const data = await fetchAll();
        setInventory(data.inventory || []);
      } else {
        // 오프라인/데모 모드 로컬 반영
        if (isNew) {
          const nextRow = Math.max(0, ...inventory.map((i) => i.rowIndex)) + 1;
          const newItem: InventoryItem = {
            ...item,
            rowIndex: nextRow,
            updatedAt: formatTimestampLocal(),
          } as InventoryItem;
          setInventory([...inventory, newItem]);
        } else {
          setInventory(
            inventory.map((i) =>
              i.rowIndex === item.rowIndex
                ? ({ ...i, ...item, updatedAt: formatTimestampLocal() } as InventoryItem)
                : i
            )
          );
        }
      }
      setEditingItem(null);
      setShowAddForm(false);
      showToast(isNew ? "신규 품목이 등록되었습니다." : "품목 스펙을 저장했습니다.", "ok");
    } catch (err: any) {
      showToast("품목 저장 실패: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInventoryItemRow(rowIndex: number) {
    if (!window.confirm("정말로 이 품목을 삭제하시겠습니까? 관련 데이터가 완전히 소멸합니다.")) {
      return;
    }
    setSaving(true);
    try {
      if (connected) {
        await callScript("deleteInventoryItem", { rowIndex });
        const data = await fetchAll();
        setInventory(data.inventory || []);
      } else {
        setInventory(inventory.filter((i) => i.rowIndex !== rowIndex));
      }
      showToast("선택된 품목을 안전하게 파기하였습니다.", "info");
    } catch (err: any) {
      showToast("삭제 실패: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // 불량 로그 등록 및 구글 스프레드시트 기록 함수
  async function handleAddDefectLog(log: Omit<DefectLog, "rowIndex">) {
    if (connected) {
      try {
        const res = await callScript("addDefectLog", log);
        const newLog: DefectLog = {
          ...log,
          rowIndex: res.rowIndex,
        };
        setDefectLogs((prev) => [newLog, ...prev]);
        showToast("불량 로그가 스프레드시트에 실시간으로 기록되었습니다!", "ok");
      } catch (err: any) {
        showToast("실시간 기록 실패: " + err.message + " (데모 모드로 임시 보존)", "error");
        const newLog: DefectLog = { ...log, rowIndex: Date.now() };
        setDefectLogs((prev) => [newLog, ...prev]);
      }
    } else {
      const newLog: DefectLog = { ...log, rowIndex: Date.now() };
      setDefectLogs((prev) => [newLog, ...prev]);
      showToast("로컬 데모 모드에 불량 로그가 추가되었습니다.", "info");
    }
  }

  // 대여/반납 로그 등록 및 구글 스프레드시트 기록 함수
  async function handleAddRentLog(log: RentLog) {
    if (connected) {
      try {
        await callScript("rentInventoryItem", log);
        setRentLogs((prev) => [log, ...prev]);
        
        // Also update local inventory state with the adjusted stock
        setInventory((prev) =>
          prev.map((it) => {
            if (it.location === log.location && it.name === log.name) {
              const currentStock = it.stock === null ? 0 : it.stock;
              const nextStock = log.type === "대여" ? Math.max(0, currentStock - log.qty) : currentStock + log.qty;
              return {
                ...it,
                stock: nextStock,
                updatedAt: log.timestamp,
                manager: log.user,
              };
            }
            return it;
          })
        );
        
        showToast("대여/반납 내역이 스프레드시트에 실시간 동기화되었습니다!", "ok");
      } catch (err: any) {
        showToast("실시간 동기화 실패: " + err.message + " (데모 모드로 임시 보존)", "error");
        setRentLogs((prev) => [log, ...prev]);
        
        // Local state update anyway for smooth user feedback
        setInventory((prev) =>
          prev.map((it) => {
            if (it.location === log.location && it.name === log.name) {
              const currentStock = it.stock === null ? 0 : it.stock;
              const nextStock = log.type === "대여" ? Math.max(0, currentStock - log.qty) : currentStock + log.qty;
              return {
                ...it,
                stock: nextStock,
                updatedAt: log.timestamp,
                manager: log.user,
              };
            }
            return it;
          })
        );
      }
    } else {
      setRentLogs((prev) => [log, ...prev]);
      setInventory((prev) =>
        prev.map((it) => {
          if (it.location === log.location && it.name === log.name) {
            const currentStock = it.stock === null ? 0 : it.stock;
            const nextStock = log.type === "대여" ? Math.max(0, currentStock - log.qty) : currentStock + log.qty;
            return {
              ...it,
              stock: nextStock,
              updatedAt: log.timestamp,
              manager: log.user,
            };
          }
          return it;
        })
      );
      showToast("로컬 데모 모드에 대여/반납 내역이 추가되었습니다.", "info");
    }
  }

  /* ---------------- 수량 증감 버튼 (낙관적 렌더링 + 디바운스 스프레드시트 반영) ---------------- */
  const stockSaveTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});
  
  function handleChangeStock(item: InventoryItem, delta: number) {
    if (typeof item.stock !== "number") return;
    const nextStock = Math.max(0, item.stock + delta);
    const ts = formatTimestampLocal();

    // 1. 화면 반응속도 향상을 위해 낙관적 로컬 업데이트 즉시 수행
    setInventory((prev) =>
      prev.map((i) => (i.rowIndex === item.rowIndex ? { ...i, stock: nextStock, updatedAt: ts } : i))
    );

    if (!connected) return;

    // 2. 여러 번 연타해도 단 한 번의 요청만 가도록 600ms 디바운스 적용
    const key = item.rowIndex;
    if (stockSaveTimers.current[key]) clearTimeout(stockSaveTimers.current[key]);
    
    stockSaveTimers.current[key] = setTimeout(() => {
      callScript("updateInventoryItem", { rowIndex: item.rowIndex, stock: nextStock })
        .then(() => {
          setLastSync(new Date());
          localStorage.setItem("wms_last_sync", new Date().toISOString());
        })
        .catch((err: any) => {
          showToast("수량 스프레드시트 반영 에러: " + err.message, "error");
        });
    }, 600);
  }

  // 권한 없는 사용자가 관리자 화면에 접근하는 것을 제한하는 보안 감시자
  useEffect(() => {
    if (["monitor", "defect", "rent"].includes(currentView) && !isAdmin) {
      setCurrentView("landing");
    }
  }, [currentView, isAdmin]);

  if (currentView === "landing") {
    return (
      <LandingPage
        onNavigate={(view) => {
          if (view === "rental") {
            setCurrentView("rental");
          } else if (view === "login") {
            setLoginId("");
            setLoginPassword("");
            setLoginError("");
            setCurrentView("login");
          }
        }}
        isLightMode={isLightMode}
        scriptUrl={scriptUrl}
        setScriptUrl={setScriptUrl}
        connecting={connecting}
        connectError={connectError}
        connected={connected}
        onConnect={handleConnect}
        onDisconnect={() => {
          localStorage.removeItem("wms_script_url");
          localStorage.setItem("wms_connected", "false");
          setConnected(false);
          setScriptUrl("");
          showToast("스프레드시트 연동이 해제되었습니다. 가상 데모 모드로 동작합니다.", "info");
        }}
      />
    );
  }

  if (currentView === "login") {
    return (
      <LoginPage
        users={users}
        onLoginSuccess={() => {
          setIsAdmin(true);
          localStorage.setItem("wms_is_admin", "true");
          setCurrentView("monitor");
          showToast("관리자 모드로 안전하게 로그인되었습니다.", "ok");
        }}
        onBack={() => {
          setCurrentView("landing");
        }}
        isLightMode={isLightMode}
        onSyncUsers={handleRefresh}
        syncing={connecting}
      />
    );
  }

  if (currentView === "rental") {
    return (
      <RentalPage
        inventory={inventory}
        onAddRentLog={handleAddRentLog}
        onBack={() => {
          setCurrentView("landing");
        }}
        isLightMode={isLightMode}
        showToast={showToast}
      />
    );
  }

  return (
    <div
      className={isLightMode ? "wms-light" : "wms-dark"}
      style={{
        width: "100%",
        height: "100vh",
        background: "var(--app-bg, #0f172a)",
        color: "var(--text-main, #f1f5f9)",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 글로벌 스타일 오버라이드 */}
      <style>{`
        * { box-sizing: border-box; }
        .wms-dark {
          --app-bg: #0f172a;
          --canvas-bg: #020617;
          --header-bg: #1e293b;
          --panel-bg: #1e293b;
          --panel-border: #334155;
          --text-main: #f1f5f9;
          --text-dim: #94a3b8;
          --input-bg: #0f172a;
        }
        .wms-light {
          --app-bg: #f8fafc;
          --canvas-bg: #e2e8f0;
          --header-bg: #ffffff;
          --panel-bg: #ffffff;
          --panel-border: #cbd5e1;
          --text-main: #0f172a;
          --text-dim: #475569;
          --input-bg: #f1f5f9;
        }
        .mono { font-family: 'JetBrains Mono', monospace; }
        button { cursor: pointer; transition: all 0.15s ease-in-out; display: flex; align-items: center; justify-content: center; border: none; }
        button:hover { opacity: 0.9; transform: scale(1.01); }
        button:active { transform: scale(0.99); }
        input, select { outline: none; transition: border-color 0.15s ease-in-out; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important; }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes searchPulse { 0% { box-shadow: 0 0 0 0px rgba(99,102,241,0.4); } 100% { box-shadow: 0 0 0 14px rgba(99,102,241,0); } }
        .canvas-bg {
          user-select: none;
        }
      `}</style>

      {/* ===== 1. 상단 바 ===== */}
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "var(--header-bg, #1e293b)",
          borderBottom: "1px solid var(--panel-border, #334155)",
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* 로고 영역 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            className="mono"
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: "#ffffff",
              letterSpacing: "0.05em",
              background: "#4f46e5",
              padding: "6px 12px",
              borderRadius: 4,
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            LOGISTIX™
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-main, #f8fafc)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
              WMS PRO
            </div>
          </div>
        </div>

        {/* 품목 실시간 검색란 */}
        <div style={{ position: "relative", width: 440 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--input-bg, #0f172a)",
              border: "1px solid var(--panel-border, #475569)",
              borderRadius: 9999,
              padding: "0 16px",
            }}
          >
            <Search size={15} style={{ color: "var(--text-dim, #94a3b8)", marginRight: 8 }} />
            <input
              placeholder="품목 검색... (엔터 누르면 첫 결과의 위치로 바로 이동)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  focusOnItem(searchResults[0]);
                }
              }}
              style={{
                width: "100%",
                padding: "8px 0",
                background: "transparent",
                border: "none",
                color: "var(--text-main, #f1f5f9)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {searchOpen && searchQuery && (
            <div
              style={{
                position: "absolute",
                top: 44,
                left: 0,
                right: 0,
                background: "var(--panel-bg, #1e293b)",
                border: "1px solid var(--panel-border, #334155)",
                borderRadius: 8,
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                maxHeight: 350,
                overflowY: "auto",
                zIndex: 1000,
              }}
            >
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <div
                    key={item.rowIndex}
                    onClick={() => focusOnItem(item)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--panel-border, #334155)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--panel-border, #334155)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #f1f5f9)" }}>
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "var(--text-dim, #94a3b8)",
                          marginTop: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span className="mono" style={{ background: "var(--input-bg, #0f172a)", padding: "1px 5px", borderRadius: 3, color: "#818cf8" }}>
                          {item.location}
                        </span>
                        {item.note && <span>| 특이사항: {item.note}</span>}
                        {item.manager && <span>| 담당: {item.manager}</span>}
                      </div>
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: item.stock === 0 ? "#f43f5e" : "#34d399",
                      }}
                    >
                      {item.stock ?? 0} 개
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, color: "#94a3b8", textAlign: "center", fontSize: 12.5 }}>
                  검색 결과와 일치하는 품목이 존재하지 않습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 동기화 버튼 및 연동 메뉴 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ConnectionBadge connected={connected} dirty={dirty} saving={saving} lastSync={lastSync} />

          {/* 처음 화면으로 (로그아웃) */}
          <button
            onClick={() => {
              setIsAdmin(false);
              localStorage.removeItem("wms_is_admin");
              setCurrentView("landing");
              showToast("로그아웃되었습니다. 메인 화면으로 이동합니다.", "info");
            }}
            style={{
              padding: "0 12px",
              height: 34,
              borderRadius: 6,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
            title="관리자 세션을 종료하고 메인 화면으로 돌아갑니다."
          >
            🔒 로그아웃 (처음으로)
          </button>

          {/* 뷰 이동 탭 */}
          <div style={{ display: "flex", gap: 4, background: "var(--input-bg, #0f172a)", padding: 3, borderRadius: 6, border: "1px solid var(--panel-border, #334155)" }}>
            <button
              onClick={() => setCurrentView("monitor")}
              style={{
                padding: "4px 10px",
                height: 26,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: currentView === "monitor" ? "rgba(255,255,255,0.08)" : "transparent",
                color: currentView === "monitor" ? "var(--text-main, #f1f5f9)" : "var(--text-dim, #94a3b8)",
              }}
            >
              📦 보관 구역
            </button>
            <button
              onClick={() => setCurrentView("rent")}
              style={{
                padding: "4px 10px",
                height: 26,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: currentView === "rent" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                color: currentView === "rent" ? "#818cf8" : "var(--text-dim, #94a3b8)",
              }}
            >
              📋 대여/반납 대장
            </button>
            <button
              onClick={() => setCurrentView("defect")}
              style={{
                padding: "4px 10px",
                height: 26,
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: currentView === "defect" ? "rgba(244, 63, 94, 0.15)" : "transparent",
                color: currentView === "defect" ? "#f43f5e" : "var(--text-dim, #94a3b8)",
              }}
            >
              ⚠️ 불량로그
            </button>
          </div>

          <button
            onClick={toggleLightMode}
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              border: "1px solid var(--panel-border, #334155)",
              background: "var(--input-bg, #0f172a)",
              color: "var(--text-main, #f1f5f9)",
              cursor: "pointer",
            }}
            title={isLightMode ? "다크 모드로 전환" : "라이트 모드로 전환"}
          >
            {isLightMode ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <button
            onClick={handleRefresh}
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              border: "1px solid var(--panel-border, #334155)",
              background: "var(--input-bg, #0f172a)",
              color: "var(--text-main, #f1f5f9)",
              cursor: "pointer",
            }}
            title="실시간 강제 새로고침"
          >
            <RefreshCw size={14} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowSetup(true)}
              style={{
                padding: "0 14px",
                height: 34,
                borderRadius: 6,
                background: "#4f46e5",
                border: "1px solid #4f46e5",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Settings size={13} />
              {connected ? "URL 수정 / 연동 관리" : "구글 시트 연동"}
            </button>
          )}
        </div>
      </header>

      {/* ===== 2. 본문 메인 ===== */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {currentView === "defect" ? (
          <DefectLogsPage
            defectLogs={defectLogs}
            inventory={inventory}
            onAddDefectLog={handleAddDefectLog}
            onClose={() => setCurrentView("monitor")}
            isLightMode={isLightMode}
          />
        ) : currentView === "rent" ? (
          <RentLogsPage
            rentLogs={rentLogs}
            inventory={inventory}
            onAddRentLog={handleAddRentLog}
            onClose={() => setCurrentView("monitor")}
            isLightMode={isLightMode}
            isAdmin={isAdmin}
          />
        ) : (
          <>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "var(--canvas-bg, #020617)",
                overflowY: "auto",
                padding: "24px",
              }}
            >
              {/* 그리드 상단 바 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                {/* 기능 버튼 */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      onClick={regenerateFromInventory}
                      style={{
                        background: "var(--panel-bg, #1e293b)",
                        border: "1px solid var(--panel-border, #334155)",
                        color: "var(--text-main, #f1f5f9)",
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                      title="위치코드 분석기 기반 랙 자동 재정렬"
                    >
                      <MapPin size={13} />
                      자동 배치
                    </button>

                    <button
                      onClick={addManualRack}
                      style={{
                        background: "#4f46e5",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} />
                      새 랙 추가
                    </button>
                  </div>
                )}

              </div>

              {/* 그리드 카드 목록 */}
              {racks.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px dashed var(--panel-border, #334155)",
                    borderRadius: "12px",
                    padding: "40px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ color: "var(--text-dim, #94a3b8)", fontSize: "14px", marginBottom: "16px" }}>
                    등록된 구역/랙이 존재하지 않습니다. 위치코드를 기반으로 자동 배치하거나 신규 랙을 직접 생성해 보세요.
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={regenerateFromInventory}
                      style={{
                        background: "#4f46e5",
                        color: "#ffffff",
                        padding: "10px 18px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      위치코드 기반 자동 배치
                    </button>
                    <button
                      onClick={addManualRack}
                      style={{
                        background: "var(--panel-bg, #1e293b)",
                        border: "1px solid var(--panel-border, #334155)",
                        color: "var(--text-main, #f1f5f9)",
                        padding: "10px 18px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      새 구역 추가
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {racks.map((rack) => {
                    const isSelected = selectedRackId === rack.id;
                    const isHighlighted = highlightShelf !== null && rack.id === parseLocation(highlightShelf).rack;

                    return (
                      <div
                        key={rack.id}
                        id={`rack-card-${rack.id}`}
                        onClick={() => setSelectedRackId(rack.id)}
                        style={{
                          background: isSelected 
                            ? "var(--panel-bg, #1e293b)" 
                            : "var(--panel-bg, #1e293b)",
                          border: isSelected
                            ? `2px solid ${rack.color}`
                            : isHighlighted
                            ? "2px solid #f59e0b"
                            : "1px solid var(--panel-border, #334155)",
                          borderRadius: "8px",
                          padding: "20px 16px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          animation: isHighlighted ? "searchPulse 1.4s ease-in-out infinite" : "none",
                          minHeight: "80px",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && !isHighlighted) {
                            e.currentTarget.style.borderColor = rack.color;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected && !isHighlighted) {
                            e.currentTarget.style.borderColor = "var(--panel-border, #334155)";
                          }
                        }}
                      >
                        {/* Rack Name */}
                        <span style={{ 
                          fontWeight: 700, 
                          fontSize: "16px", 
                          color: isSelected ? rack.color : "var(--text-main, #f1f5f9)",
                          textAlign: "center",
                        }}>
                          {rack.name || `${rack.id} 랙`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 우측 사이드 패널 (랙 및 선반별 품목 리스트) */}
            <SidePanel
              rack={selectedRack}
              shelvesWithItems={shelvesWithItems}
              onClose={() => setSelectedRackId(null)}
              onUpdateRack={(fields) => updateRackField(selectedRack!.id, fields)}
              onDeleteRack={() => deleteRack(selectedRack!.id)}
              onEditItem={(item) => setEditingItem(item)}
              onAddItem={() => setShowAddForm(true)}
              onDeleteItem={deleteInventoryItemRow}
              highlightShelf={
                selectedRack && highlightShelf && parseLocation(highlightShelf).rack === selectedRack.id
                  ? highlightShelf
                  : null
              }
              highlightedItemRowIndex={highlightedItemRowIndex}
              onChangeStock={handleChangeStock}
              isAdmin={isAdmin}
              onRentItem={(item, actionType) => setShowRentModal({ item, actionType })}
              isLightMode={isLightMode}
            />
          </>
        )}
      </div>

      {/* ===== 3. 설정 모달 ===== */}
      {showSetup && (
        <SetupModal
          scriptUrl={scriptUrl}
          setScriptUrl={setScriptUrl}
          connecting={connecting}
          connectError={connectError}
          connected={connected}
          onConnect={handleConnect}
          onClose={() => setShowSetup(false)}
          onDisconnect={() => {
            localStorage.removeItem("wms_script_url");
            localStorage.setItem("wms_connected", "false");
            setConnected(false);
            setScriptUrl("");
            setShowSetup(false);
            showToast("스프레드시트 연동이 해제되었습니다. 가상 데모 모드로 동작합니다.", "info");
          }}
        />
      )}

      {/* ===== 4. 품목 팝업 폼 ===== */}
      {(showAddForm || editingItem) && (
        <ItemFormModal
          item={editingItem}
          defaultRackId={selectedRack ? selectedRack.id : racks[0] ? racks[0].id : ""}
          racks={racks}
          onSave={saveInventoryItem}
          onClose={() => {
            setShowAddForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* ===== 6. 새 랙 직접 설계 모달 ===== */}
      {showAddRackModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(2, 6, 17, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "var(--panel-bg, #1e293b)",
              border: "1px solid var(--panel-border, #334155)",
              borderRadius: "16px",
              padding: "24px",
              width: "420px",
              maxWidth: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main, #f1f5f9)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              🛠️ 새 랙 직접 설계
            </h3>
            
            <p style={{ fontSize: "12px", color: "var(--text-dim, #94a3b8)", lineHeight: "1.5", marginBottom: "20px" }}>
              새로운 물류 적재 랙 구역을 직접 도면에 배치합니다. 단축 코드는 상품 위치코드의 구역 접두사(예: A 구역의 선반들은 A-01, A-02 등으로 맵핑)가 됩니다.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main, #f1f5f9)" }}>
                  구역 단축 코드 (ID) <span style={{ color: "#f43f5e" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: A, B, R1, ZONE-A"
                  value={newRackCode}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    setNewRackCode(code);
                    // Automatically pre-fill Name if it's empty or matches previous logic
                    if (!newRackName || newRackName === `${newRackCode} 구역`) {
                      setNewRackName(code ? `${code} 구역` : "");
                    }
                  }}
                  style={{
                    background: "var(--input-bg, #0f172a)",
                    border: "1px solid var(--panel-border, #334155)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "var(--text-main, #f1f5f9)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main, #f1f5f9)" }}>
                  구역 표시 이름
                </label>
                <input
                  type="text"
                  placeholder="예: A 구역 (원자재 적재대)"
                  value={newRackName}
                  onChange={(e) => setNewRackName(e.target.value)}
                  style={{
                    background: "var(--input-bg, #0f172a)",
                    border: "1px solid var(--panel-border, #334155)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "var(--text-main, #f1f5f9)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAddRackModal(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--panel-border, #334155)",
                  color: "var(--text-main, #f1f5f9)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreateManualRack}
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                }}
              >
                설계 및 배치 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 7. 관리자 암호 인증 모달 ===== */}
      {showAdminAuthModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(2, 6, 17, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "var(--panel-bg, #1e293b)",
              border: "1px solid var(--panel-border, #334155)",
              borderRadius: "16px",
              padding: "24px",
              width: "380px",
              maxWidth: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-main, #f1f5f9)", marginBottom: "8px" }}>
              🔓 관리자(편집) 모드 전환
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-dim, #94a3b8)", marginBottom: "16px", lineHeight: "1.4" }}>
              편집 권한 활성화를 위해 비밀번호를 입력해주세요.<br />
              <span style={{ color: "#818cf8", fontWeight: 700 }}>(공용 비밀번호: 1234)</span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={authPasscodeInput}
                onChange={(e) => setAuthPasscodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (authPasscodeInput === "1234") {
                      setIsAdmin(true);
                      setShowAdminAuthModal(false);
                      showToast("관리자 권한이 활성화되었습니다.", "ok");
                    } else {
                      setAuthError("비밀번호가 일치하지 않습니다.");
                    }
                  }
                }}
                style={{
                  background: "var(--input-bg, #0f172a)",
                  border: "1px solid var(--panel-border, #334155)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "var(--text-main, #f1f5f9)",
                  fontSize: "14px",
                  textAlign: "center",
                  outline: "none",
                }}
                autoFocus
              />
              {authError && (
                <div style={{ fontSize: "11px", color: "#f43f5e", textAlign: "center", marginTop: "2px" }}>
                  {authError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAdminAuthModal(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--panel-border, #334155)",
                  color: "var(--text-main, #f1f5f9)",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (authPasscodeInput === "1234") {
                    setIsAdmin(true);
                    setShowAdminAuthModal(false);
                    showToast("관리자 권한이 활성화되었습니다.", "ok");
                  } else {
                    setAuthError("비밀번호가 일치하지 않습니다.");
                  }
                }}
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                인증하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 8. 물품 대여 / 반납 모달 ===== */}
      {showRentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(2, 6, 17, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "var(--panel-bg, #1e293b)",
              border: "1px solid var(--panel-border, #334155)",
              borderRadius: "16px",
              padding: "24px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: showRentModal.actionType === "대여" ? "#818cf8" : "#10b981",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {showRentModal.actionType === "대여" ? "📋 물품 대여 신청" : "🔄 물품 반납 접수"}
            </h3>

            <div style={{ background: "var(--input-bg, #0f172a)", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ color: "var(--text-main, #f1f5f9)", fontWeight: 700, marginBottom: "4px" }}>
                {showRentModal.item.name}
              </div>
              <div style={{ color: "var(--text-dim, #94a3b8)", fontSize: "11px", display: "flex", gap: "8px" }}>
                <span>위치: <span className="mono" style={{ color: "#818cf8" }}>{showRentModal.item.location}</span></span>
                <span>| 현재 수량: <span className="mono" style={{ color: "#34d399" }}>{showRentModal.item.stock ?? 0}개</span></span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {/* 대여/반납자 입력 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main, #f1f5f9)" }}>
                  {showRentModal.actionType === "대여" ? "대여 담당자 이름" : "반납자 이름"} <span style={{ color: "#f43f5e" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={rentUserName}
                  onChange={(e) => setRentUserName(e.target.value)}
                  style={{
                    background: "var(--input-bg, #0f172a)",
                    border: "1px solid var(--panel-border, #334155)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--text-main, #f1f5f9)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              {/* 수량 입력 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main, #f1f5f9)" }}>
                  {showRentModal.actionType === "대여" ? "대여 수량" : "반납 수량"} <span style={{ color: "#f43f5e" }}>*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={showRentModal.actionType === "대여" ? (showRentModal.item.stock ?? 0) : undefined}
                  value={rentQty}
                  onChange={(e) => setRentQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    background: "var(--input-bg, #0f172a)",
                    border: "1px solid var(--panel-border, #334155)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--text-main, #f1f5f9)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                {showRentModal.actionType === "대여" && rentQty > (showRentModal.item.stock ?? 0) && (
                  <span style={{ fontSize: "11px", color: "#f43f5e" }}>
                    재고 수량({showRentModal.item.stock ?? 0}개)을 초과하여 대여할 수 없습니다.
                  </span>
                )}
              </div>

              {/* 메모 입력 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main, #f1f5f9)" }}>
                  특이사항 / 용도
                </label>
                <input
                  type="text"
                  placeholder="예: 테스트 목적 대여"
                  value={rentNote}
                  onChange={(e) => setRentNote(e.target.value)}
                  style={{
                    background: "var(--input-bg, #0f172a)",
                    border: "1px solid var(--panel-border, #334155)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    color: "var(--text-main, #f1f5f9)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowRentModal(null)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--panel-border, #334155)",
                  color: "var(--text-main, #f1f5f9)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (!rentUserName.trim()) {
                    showToast("담당자 이름을 입력해주세요.", "warn");
                    return;
                  }
                  if (showRentModal.actionType === "대여" && rentQty > (showRentModal.item.stock ?? 0)) {
                    showToast("재고 수량이 부족합니다.", "warn");
                    return;
                  }

                  const log: RentLog = {
                    timestamp: formatTimestampLocal(),
                    location: showRentModal.item.location,
                    name: showRentModal.item.name,
                    type: showRentModal.actionType,
                    qty: rentQty,
                    user: rentUserName.trim(),
                    note: rentNote.trim() || undefined,
                  };

                  handleAddRentLog(log);
                  setShowRentModal(null);
                }}
                disabled={showRentModal.actionType === "대여" && rentQty > (showRentModal.item.stock ?? 0)}
                style={{
                  background: showRentModal.actionType === "대여" ? "#4f46e5" : "#10b981",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: showRentModal.actionType === "대여" && rentQty > (showRentModal.item.stock ?? 0) ? 0.5 : 1,
                }}
              >
                {showRentModal.actionType === "대여" ? "대여하기" : "반납하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 5. 토스트 알림 ===== */}
      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.type === "error"
                ? "#f43f5e"
                : toast.type === "ok"
                ? "#10b981"
                : toast.type === "warn"
                ? "#f59e0b"
                : "#1e293b",
            color: toast.type === "info" ? "#f1f5f9" : "#020617",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            animation: "toastIn 0.2s ease-out",
            zIndex: 10000,
            border: toast.type === "info" ? "1px solid #334155" : "none",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
