// ── Collection Growth Tracker ────────────────────────────────────────
// Records item-count snapshots per collection in localStorage so we can
// show a growth-over-time chart even without server-side metrics.

const STORAGE_PREFIX = "chroma-admin:growth:";

export interface GrowthSnapshot {
    timestamp: number; // epoch ms
    count: number;
}

/**
 * Record a growth snapshot. De-dupes if the last snapshot has the same count
 * and was taken less than 5 minutes ago.
 */
export function recordSnapshot(collectionId: string, count: number): void {
    const key = STORAGE_PREFIX + collectionId;
    const existing = getSnapshots(collectionId);

    const last = existing[existing.length - 1];
    const now = Date.now();

    // Skip if same count within 5 min
    if (last && last.count === count && now - last.timestamp < 5 * 60 * 1000) {
        return;
    }

    existing.push({ timestamp: now, count });

    // Keep max 200 snapshots per collection
    const trimmed = existing.length > 200 ? existing.slice(-200) : existing;

    try {
        localStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
        // localStorage full – clear oldest half
        const half = trimmed.slice(Math.floor(trimmed.length / 2));
        localStorage.setItem(key, JSON.stringify(half));
    }
}

/**
 * Returns all growth snapshots for a collection, sorted by time ascending.
 */
export function getSnapshots(collectionId: string): GrowthSnapshot[] {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + collectionId);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as GrowthSnapshot[];
        return parsed.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
        return [];
    }
}

/**
 * Clear growth history for a collection.
 */
export function clearSnapshots(collectionId: string): void {
    localStorage.removeItem(STORAGE_PREFIX + collectionId);
}
