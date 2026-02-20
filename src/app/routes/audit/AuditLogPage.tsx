import { useState, useMemo } from "react";
import {
    FileText,
    Trash2,
    Filter,
    Clock,
    CheckCircle2,
    XCircle,
    Layers,
} from "lucide-react";
import {
    getAuditLog,
    clearAuditLog,
    type AuditEntry,
    type AuditOperation,
} from "../../../lib/auditLog";

const OP_COLORS: Record<string, string> = {
    connect: "#6c5ce7",
    list_collections: "#a78bfa",
    get_collection: "#0ea5e9",
    query: "#10b981",
    get_items: "#14b8a6",
    delete_collection: "#ef4444",
    delete_items: "#f97316",
    export: "#f59e0b",
    import: "#8b5cf6",
};

const OP_LABELS: Record<string, string> = {
    connect: "Connect",
    list_collections: "List Collections",
    get_collection: "Get Collection",
    query: "Query",
    get_items: "Get Items",
    delete_collection: "Delete Collection",
    delete_items: "Delete Items",
    export: "Export",
    import: "Import",
};

export function AuditLogPage() {
    const [entries, setEntries] = useState<AuditEntry[]>(() => getAuditLog());
    const [filterOp, setFilterOp] = useState<AuditOperation | "">("");

    const filtered = useMemo(() => {
        if (!filterOp) return entries;
        return entries.filter((e) => e.operation === filterOp);
    }, [entries, filterOp]);

    const operations = useMemo(
        () => Array.from(new Set(entries.map((e) => e.operation))).sort(),
        [entries],
    );

    const handleClear = () => {
        if (confirm("Clear all audit log entries?")) {
            clearAuditLog();
            setEntries([]);
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, #0ea5e9, #6c5ce7)",
                        }}
                    >
                        <FileText size={20} color="#fff" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Audit Log</h1>
                        <p
                            className="text-xs"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            {entries.length} operations tracked
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                    {/* Filter */}
                    <div className="flex items-center gap-2">
                        <Filter
                            size={14}
                            style={{ color: "var(--color-text-dim)" }}
                        />
                        <select
                            value={filterOp}
                            onChange={(e) =>
                                setFilterOp(e.target.value as AuditOperation | "")
                            }
                            className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                            style={{
                                background: "var(--color-bg-card)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text)",
                            }}
                        >
                            <option value="">All operations</option>
                            {operations.map((op) => (
                                <option key={op} value={op}>
                                    {OP_LABELS[op] ?? op}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleClear}
                        disabled={entries.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                        style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "var(--color-error)",
                            opacity: entries.length === 0 ? 0.4 : 1,
                        }}
                    >
                        <Trash2 size={12} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div
                    className="text-center py-16 rounded-2xl"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <FileText
                        size={40}
                        className="mx-auto mb-3"
                        style={{ color: "var(--color-text-dim)", opacity: 0.5 }}
                    />
                    <p
                        className="text-sm"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        No audit entries{filterOp ? ` for "${OP_LABELS[filterOp]}"` : " yet"}
                    </p>
                    <p
                        className="text-xs mt-1"
                        style={{ color: "var(--color-text-dim)" }}
                    >
                        Operations will be recorded as you use the app.
                    </p>
                </div>
            )}

            {/* Entries */}
            {filtered.length > 0 && (
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                        {filtered.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--color-bg-elevated)] transition-colors"
                            >
                                {/* Status */}
                                {entry.status === "success" ? (
                                    <CheckCircle2
                                        size={16}
                                        style={{ color: "var(--color-success)", flexShrink: 0 }}
                                    />
                                ) : (
                                    <XCircle
                                        size={16}
                                        style={{ color: "var(--color-error)", flexShrink: 0 }}
                                    />
                                )}

                                {/* Operation badge */}
                                <span
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                                    style={{
                                        background: `${OP_COLORS[entry.operation] ?? "#888"}18`,
                                        color: OP_COLORS[entry.operation] ?? "#888",
                                    }}
                                >
                                    {OP_LABELS[entry.operation] ?? entry.operation}
                                </span>

                                {/* Collection */}
                                {entry.collection && (
                                    <span
                                        className="flex items-center gap-1 text-xs truncate max-w-[150px]"
                                        style={{ color: "var(--color-text-muted)" }}
                                    >
                                        <Layers size={12} />
                                        {entry.collection}
                                    </span>
                                )}

                                {/* Details */}
                                {entry.details && (
                                    <span
                                        className="text-xs truncate flex-1"
                                        style={{ color: "var(--color-text-dim)" }}
                                    >
                                        {entry.details}
                                    </span>
                                )}

                                <span className="flex-1" />

                                {/* Duration */}
                                {entry.durationMs != null && (
                                    <span
                                        className="text-[10px] font-mono"
                                        style={{ color: "var(--color-text-dim)" }}
                                    >
                                        {entry.durationMs}ms
                                    </span>
                                )}

                                {/* Timestamp */}
                                <span
                                    className="flex items-center gap-1 text-[11px] shrink-0"
                                    style={{ color: "var(--color-text-dim)" }}
                                >
                                    <Clock size={10} />
                                    {formatTime(entry.timestamp)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
