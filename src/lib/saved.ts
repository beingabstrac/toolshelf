/** Local-only saved tools (no accounts). */

const KEY = "toolshelf:saved-v1";

export type SavedMap = Record<string, number>; // slug -> savedAt ms

export function readSaved(): SavedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeSaved(map: SavedMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("toolshelf:saved"));
}

export function isSaved(slug: string, map?: SavedMap): boolean {
  const m = map ?? readSaved();
  return Boolean(m[slug]);
}

export function toggleSaved(slug: string): boolean {
  const map = readSaved();
  if (map[slug]) {
    delete map[slug];
    writeSaved(map);
    return false;
  }
  map[slug] = Date.now();
  writeSaved(map);
  return true;
}

export function savedSlugsNewestFirst(map?: SavedMap): string[] {
  const m = map ?? readSaved();
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
}
