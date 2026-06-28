import { InventoryItem, Rack } from "../types";

/**
 * Converts a Google Drive share link (or file ID) into a direct preview image URL
 * that works directly in HTML <img> tags.
 */
export function getGoogleDriveImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // If it's a raw Drive file ID (usually ~33 characters long)
  if (/^[a-zA-Z0-9_-]{25,100}$/.test(trimmed)) {
    return `https://drive.google.com/thumbnail?sz=w600&id=${trimmed}`;
  }

  // If it is a Drive or Docs URL, let's extract the ID
  if (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) {
    // 1. Check for /d/ID
    const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,100})/);
    if (dMatch && dMatch[1]) {
      return `https://drive.google.com/thumbnail?sz=w600&id=${dMatch[1]}`;
    }
    // 2. Check for id=ID query param
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,100})/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/thumbnail?sz=w600&id=${idMatch[1]}`;
    }
    // 3. Fallback: search for any 25-100 character ID in the URL path
    const parts = trimmed.split(/[\/?&]/);
    for (const part of parts) {
      if (/^[a-zA-Z0-9_-]{25,100}$/.test(part) && !part.includes("google") && part !== "open" && part !== "view") {
        return `https://drive.google.com/thumbnail?sz=w600&id=${part}`;
      }
    }
  }

  // If it's already a direct non-Drive image URL, return it
  if (trimmed.startsWith("http")) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Parses location code (e.g. "A-01" -> { rack: "A", shelf: "01" })
 */
export function parseLocation(loc: string | undefined | null) {
  const trimmed = (loc || "").trim();
  const parts = trimmed.split("-");
  if (parts.length < 2) return { rack: trimmed, shelf: null };
  return { rack: parts[0], shelf: parts.slice(1).join("-") };
}

/**
 * Snaps a coordinate value to grid size
 */
export const GRID_SIZE = 20;
export function snap(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

/**
 * Calculates current time in local format YYYY-MM-DD HH:MM:SS
 */
export function formatTimestampLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const PALETTE = ["#9CAF97", "#8FA3B8", "#D4A98C", "#AFA3C4", "#C9A0A0", "#C4B89C", "#7FB0AC", "#B8A88F"];

export function colorForIndex(idx: number): string {
  return PALETTE[idx % PALETTE.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Automatically layout racks based on the locations in the inventory
 */
export function autoLayoutRacks(inventory: InventoryItem[], existingRacks: Rack[]): Rack[] {
  const rackShelves: { [key: string]: Set<string> } = {};
  inventory.forEach((item) => {
    const { rack } = parseLocation(item.location);
    if (!rack) return;
    if (!rackShelves[rack]) rackShelves[rack] = new Set<string>();
    rackShelves[rack].add(item.location.trim());
  });

  const rackIds = Object.keys(rackShelves).sort();
  const existingMap: { [key: string]: Rack } = {};
  (existingRacks || []).forEach((r) => (existingMap[r.id] = r));

  const racks: Rack[] = [];
  const cols = Math.ceil(Math.sqrt(rackIds.length)) || 1;
  rackIds.forEach((rackId, i) => {
    const shelves = Array.from(rackShelves[rackId]).sort();
    if (existingMap[rackId]) {
      racks.push({ ...existingMap[rackId], shelves });
      return;
    }
    const col = i % cols;
    const row = Math.floor(i / cols);
    racks.push({
      id: rackId,
      name: `${rackId} 랙`,
      x: col * 260 + 60,
      y: row * 260 + 60,
      width: 200,
      height: 200,
      rotation: 0,
      color: colorForIndex(i),
      shelves,
    });
  });
  return racks;
}
