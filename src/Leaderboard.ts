export interface LeaderboardEntry {
  name:  string;
  score: number;
}

const STORAGE_KEY = 'dutch_duche_leaderboard';
const MAX_ENTRIES = 10;

/** Load the persisted top-score list from localStorage (safe, never throws). */
export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as LeaderboardEntry[])
      .filter(e => typeof e.name === 'string' && typeof e.score === 'number')
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * Append a new entry, sort descending by score, keep top 10, and persist.
 * Silently ignores storage errors (private browsing, quota exceeded, etc.).
 */
export function saveScore(name: string, score: number): void {
  const entries = loadLeaderboard();
  const safeName = (name.trim() || 'ANON').slice(0, 20);
  entries.push({ name: safeName, score });
  entries.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}
