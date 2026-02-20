export function Skeleton({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            className={`animate-pulse rounded-lg ${className}`}
            style={{
                background: "var(--color-bg-elevated)",
                ...style,
            }}
        />
    );
}

export function SkeletonCard() {
    return (
        <div
            className="p-5 rounded-2xl space-y-3"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
        >
            <div className="flex items-center gap-4">
                <Skeleton className="w-11 h-11 shrink-0" style={{ borderRadius: "12px" }} />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
        >
            {/* Header */}
            <div
                className="flex gap-4 px-4 py-3"
                style={{
                    background: "var(--color-bg-elevated)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div
                    key={r}
                    className="flex gap-4 px-4 py-3"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} className="h-3.5 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="p-4 rounded-2xl space-y-2"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-7 w-1/2" />
                </div>
            ))}
        </div>
    );
}
