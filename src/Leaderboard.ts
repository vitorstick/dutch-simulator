export interface LeaderboardEntry {
  name:  string;
  score: number;
}

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const HEADERS = {
  'apikey':        SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type':  'application/json',
};

/**
 * Fetch the top-10 global scores from Supabase.
 * Returns `[]` silently on any network or parse error so the game works
 * offline and the menu always renders.
 */
export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=name,score&order=score.desc&limit=10`,
      { headers: HEADERS },
    );
    if (!res.ok) return [];
    const data = await res.json() as unknown;
    if (!Array.isArray(data)) return [];
    return (data as LeaderboardEntry[]).filter(
      e => typeof e.name === 'string' && typeof e.score === 'number',
    );
  } catch {
    return [];
  }
}

/**
 * Post a new score entry to Supabase. Fire-and-forget — never throws.
 * Network failures are silently ignored so game flow is never blocked.
 */
export async function saveScore(name: string, score: number): Promise<void> {
  const safeName = (name.trim() || 'ANON').slice(0, 20);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method:  'POST',
      headers: HEADERS,
      body:    JSON.stringify({ name: safeName, score }),
    });
  } catch {
    // Network unavailable — silently ignore
  }
}
