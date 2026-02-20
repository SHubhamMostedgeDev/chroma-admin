// ── Audit Log ────────────────────────────────────────────────────────
// Tracks client-side operations for debugging and accountability.

const STORAGE_KEY = "chroma-admin:auditLog";
const MAX_ENTRIES = 500;

export type AuditOperation =
    | "connect"
    | "list_collections"
    | "get_collection"
    | "query"
    | "get_items"
    | "delete_collection"
    | "delete_items"
    | "export"
    | "import";

export interface AuditEntry {
    id: string;
    timestamp: number;
    operation: AuditOperation;
    collection?: string;
    details?: string;
    status: "success" | "error";
    durationMs?: number;
}

function load(): AuditEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    } catch {
        return [];
    }
}

function save(entries: AuditEntry[]): void {
    const trimmed =
        entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // localStorage full — clear oldest half
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(trimmed.slice(Math.floor(trimmed.length / 2))),
        );
    }
}

export function logOperation(
    operation: AuditOperation,
    opts: {
        collection?: string;
        details?: string;
        status?: "success" | "error";
        durationMs?: number;
    } = {},
): void {
    const entries = load();
    entries.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        operation,
        collection: opts.collection,
        details: opts.details,
        status: opts.status ?? "success",
        durationMs: opts.durationMs,
    });
    save(entries);
}

export function getAuditLog(): AuditEntry[] {
    return load().sort((a, b) => b.timestamp - a.timestamp);
}

export function getAuditLogFiltered(
    operation?: AuditOperation,
): AuditEntry[] {
    const all = getAuditLog();
    if (!operation) return all;
    return all.filter((e) => e.operation === operation);
}

export function clearAuditLog(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function getAuditLogCount(): number {
    return load().length;
}
