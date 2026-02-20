// ── Bookmarked Records ───────────────────────────────────────────────
// Persist bookmarked item IDs per collection in localStorage.

const STORAGE_KEY = "chroma-admin:bookmarks";

export interface Bookmark {
    id: string;
    collectionId: string;
    collectionName: string;
    timestamp: number;
}

function load(): Bookmark[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Bookmark[]) : [];
    } catch {
        return [];
    }
}

function save(bookmarks: Bookmark[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function getBookmarks(): Bookmark[] {
    return load().sort((a, b) => b.timestamp - a.timestamp);
}

export function getBookmarksForCollection(collectionId: string): Bookmark[] {
    return load()
        .filter((b) => b.collectionId === collectionId)
        .sort((a, b) => b.timestamp - a.timestamp);
}

export function isBookmarked(collectionId: string, itemId: string): boolean {
    return load().some(
        (b) => b.collectionId === collectionId && b.id === itemId,
    );
}

export function addBookmark(
    collectionId: string,
    collectionName: string,
    itemId: string,
): void {
    const all = load();
    if (all.some((b) => b.collectionId === collectionId && b.id === itemId))
        return;
    all.push({
        id: itemId,
        collectionId,
        collectionName,
        timestamp: Date.now(),
    });
    // Max 200 bookmarks
    save(all.length > 200 ? all.slice(-200) : all);
}

export function removeBookmark(collectionId: string, itemId: string): void {
    const all = load().filter(
        (b) => !(b.collectionId === collectionId && b.id === itemId),
    );
    save(all);
}

export function toggleBookmark(
    collectionId: string,
    collectionName: string,
    itemId: string,
): boolean {
    if (isBookmarked(collectionId, itemId)) {
        removeBookmark(collectionId, itemId);
        return false;
    } else {
        addBookmark(collectionId, collectionName, itemId);
        return true;
    }
}

export function getBookmarkCount(): number {
    return load().length;
}
