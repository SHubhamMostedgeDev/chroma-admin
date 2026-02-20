import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import {
    Layers,
    RefreshCw,
    Database,
    Hash,
    AlertCircle,
    Plus,
} from "lucide-react";
import { listCollections, getCollectionCount } from "../../../lib/chromaClient";
import { SkeletonCard } from "../../../components/common/Skeleton";

export function CollectionsPage() {
    const navigate = useNavigate();

    const {
        data: collections,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["collections"],
        queryFn: listCollections,
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, #6c5ce7, #a78bfa)",
                        }}
                    >
                        <Layers size={20} color="#fff" />
                    </div>
                    <h2 className="text-xl font-bold">Collections</h2>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors self-start sm:self-auto"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                    }}
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    className="p-4 rounded-2xl flex items-start gap-3"
                    style={{
                        background: "rgba(255,71,87,0.08)",
                        border: "1px solid rgba(255,71,87,0.25)",
                    }}
                >
                    <AlertCircle
                        size={18}
                        className="shrink-0 mt-0.5"
                        style={{ color: "var(--color-error)" }}
                    />
                    <div className="text-sm space-y-1">
                        <p className="font-medium" style={{ color: "var(--color-error)" }}>
                            Failed to load collections
                        </p>
                        <p style={{ color: "var(--color-text-muted)" }}>
                            {(error as Error).message}
                        </p>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {collections && collections.length === 0 && (
                <div
                    className="text-center py-16 rounded-2xl"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <Database
                        size={40}
                        className="mx-auto mb-3"
                        style={{ color: "var(--color-text-dim)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                        No collections found.
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>
                        Create a collection using the Chroma client library.
                    </p>
                </div>
            )}

            {/* Collection cards */}
            {collections && collections.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((col) => (
                        <CollectionCard
                            key={col.id}
                            collection={col}
                            onClick={() =>
                                navigate(`/collections/${encodeURIComponent(col.name)}`)
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CollectionCard({
    collection,
    onClick,
}: {
    collection: { id: string; name: string; metadata?: Record<string, unknown> | null };
    onClick: () => void;
}) {
    const { data: count } = useQuery({
        queryKey: ["count", collection.id],
        queryFn: () => getCollectionCount(collection.id),
    });

    const metaKeys = collection.metadata
        ? Object.keys(collection.metadata)
        : [];

    return (
        <button
            className="p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer group"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(108,92,231,0.1)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-accent-glow)" }}
                >
                    <Database size={18} style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{collection.name}</h3>
                    <div
                        className="flex items-center gap-2 mt-1 text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        <Hash size={12} />
                        <span>{count != null ? `${count} items` : "…"}</span>
                    </div>
                    {metaKeys.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {metaKeys.slice(0, 3).map((k) => (
                                <span
                                    key={k}
                                    className="text-[10px] px-1.5 py-0.5 rounded-md"
                                    style={{
                                        background: "var(--color-bg-elevated)",
                                        color: "var(--color-text-dim)",
                                    }}
                                >
                                    {k}
                                </span>
                            ))}
                            {metaKeys.length > 3 && (
                                <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-md"
                                    style={{
                                        background: "var(--color-bg-elevated)",
                                        color: "var(--color-text-dim)",
                                    }}
                                >
                                    +{metaKeys.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
