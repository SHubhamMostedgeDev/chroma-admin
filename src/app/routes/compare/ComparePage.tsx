import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    GitCompare,
    Layers,
    Loader2,
    Hash,
    Box,
    Key,
    AlertCircle,
} from "lucide-react";
import {
    listCollections,
    getCollectionCount,
    getItems,
} from "../../../lib/chromaClient";

export function ComparePage() {
    const [colA, setColA] = useState("");
    const [colB, setColB] = useState("");

    const collectionsQuery = useQuery({
        queryKey: ["compare-collections"],
        queryFn: listCollections,
    });

    const collections = collectionsQuery.data ?? [];

    const collA = collections.find((c) => c.id === colA);
    const collB = collections.find((c) => c.id === colB);

    // Counts
    const countA = useQuery({
        queryKey: ["compare-count", colA],
        queryFn: () => getCollectionCount(collA!.name),
        enabled: !!collA,
        retry: false,
    });

    const countB = useQuery({
        queryKey: ["compare-count", colB],
        queryFn: () => getCollectionCount(collB!.name),
        enabled: !!collB,
        retry: false,
    });

    // Samples for metadata analysis
    const sampleA = useQuery({
        queryKey: ["compare-sample", colA],
        queryFn: () =>
            getItems(collA!.name, {
                limit: 100,
                include: ["metadatas", "embeddings"],
            }),
        enabled: !!collA && !countA.isError,
        retry: false,
    });

    const sampleB = useQuery({
        queryKey: ["compare-sample", colB],
        queryFn: () =>
            getItems(collB!.name, {
                limit: 100,
                include: ["metadatas", "embeddings"],
            }),
        enabled: !!collB && !countB.isError,
        retry: false,
    });

    // Computed stats
    const statsA = useMemo(() => computeStats(sampleA.data ?? undefined), [sampleA.data]);
    const statsB = useMemo(() => computeStats(sampleB.data ?? undefined), [sampleB.data]);

    const sharedKeys = useMemo(() => {
        if (!statsA || !statsB) return [];
        return statsA.metadataKeys.filter((k) => statsB.metadataKeys.includes(k));
    }, [statsA, statsB]);

    const onlyInA = useMemo(() => {
        if (!statsA || !statsB) return [];
        return statsA.metadataKeys.filter((k) => !statsB.metadataKeys.includes(k));
    }, [statsA, statsB]);

    const onlyInB = useMemo(() => {
        if (!statsA || !statsB) return [];
        return statsB.metadataKeys.filter((k) => !statsA.metadataKeys.includes(k));
    }, [statsA, statsB]);

    const isLoading = countA.isLoading || countB.isLoading || sampleA.isLoading || sampleB.isLoading;
    const queryError = countA.error || countB.error || sampleA.error || sampleB.error;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                    }}
                >
                    <GitCompare size={20} color="#fff" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Compare Collections</h1>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Side-by-side stats and metadata analysis
                    </p>
                </div>
                {isLoading && (
                    <Loader2
                        className="animate-spin ml-auto"
                        size={18}
                        style={{ color: "var(--color-accent)" }}
                    />
                )}
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CollectionSelector
                    label="Collection A"
                    value={colA}
                    onChange={setColA}
                    collections={collections}
                    color="#6c5ce7"
                />
                <CollectionSelector
                    label="Collection B"
                    value={colB}
                    onChange={setColB}
                    collections={collections}
                    color="#0ea5e9"
                />
            </div>

            {/* Error banner */}
            {queryError && (
                <div
                    className="flex items-center gap-3 rounded-2xl p-4"
                    style={{
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "var(--color-error)",
                    }}
                >
                    <AlertCircle size={18} />
                    <div>
                        <p className="text-sm font-medium">Collection not found</p>
                        <p className="text-xs mt-0.5" style={{ opacity: 0.7 }}>
                            {(queryError as Error).message}. The collection may have been deleted — try re-selecting.
                        </p>
                    </div>
                </div>
            )}

            {/* Comparison */}
            {colA && colB && !queryError && (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <CompareCard
                            icon={Hash}
                            label="Item Count"
                            valueA={countA.data?.toString() ?? "…"}
                            valueB={countB.data?.toString() ?? "…"}
                        />
                        <CompareCard
                            icon={Box}
                            label="Embedding Dims"
                            valueA={String(statsA?.embeddingDims ?? "—")}
                            valueB={String(statsB?.embeddingDims ?? "—")}
                        />
                        <CompareCard
                            icon={Key}
                            label="Metadata Keys"
                            valueA={statsA?.metadataKeys.length.toString() ?? "0"}
                            valueB={statsB?.metadataKeys.length.toString() ?? "0"}
                        />
                    </div>

                    {/* Metadata Key Overlap */}
                    {(sharedKeys.length > 0 || onlyInA.length > 0 || onlyInB.length > 0) && (
                        <div
                            className="rounded-2xl p-6"
                            style={{
                                background: "var(--color-bg-card)",
                                border: "1px solid var(--color-border)",
                            }}
                        >
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Key size={16} style={{ color: "var(--color-accent)" }} />
                                Metadata Key Overlap
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Shared */}
                                <div>
                                    <p
                                        className="text-[10px] uppercase tracking-wider mb-2 font-semibold"
                                        style={{ color: "var(--color-success)" }}
                                    >
                                        Shared ({sharedKeys.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sharedKeys.map((k) => (
                                            <span
                                                key={k}
                                                className="text-[11px] px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: "rgba(52, 211, 153, 0.1)",
                                                    color: "var(--color-success)",
                                                }}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                        {sharedKeys.length === 0 && (
                                            <span
                                                className="text-xs"
                                                style={{ color: "var(--color-text-dim)" }}
                                            >
                                                None
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Only in A */}
                                <div>
                                    <p
                                        className="text-[10px] uppercase tracking-wider mb-2 font-semibold"
                                        style={{ color: "#6c5ce7" }}
                                    >
                                        Only in A ({onlyInA.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {onlyInA.map((k) => (
                                            <span
                                                key={k}
                                                className="text-[11px] px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: "rgba(108, 92, 231, 0.1)",
                                                    color: "#6c5ce7",
                                                }}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                        {onlyInA.length === 0 && (
                                            <span
                                                className="text-xs"
                                                style={{ color: "var(--color-text-dim)" }}
                                            >
                                                None
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Only in B */}
                                <div>
                                    <p
                                        className="text-[10px] uppercase tracking-wider mb-2 font-semibold"
                                        style={{ color: "#0ea5e9" }}
                                    >
                                        Only in B ({onlyInB.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {onlyInB.map((k) => (
                                            <span
                                                key={k}
                                                className="text-[11px] px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: "rgba(14, 165, 233, 0.1)",
                                                    color: "#0ea5e9",
                                                }}
                                            >
                                                {k}
                                            </span>
                                        ))}
                                        {onlyInB.length === 0 && (
                                            <span
                                                className="text-xs"
                                                style={{ color: "var(--color-text-dim)" }}
                                            >
                                                None
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Empty state */}
            {(!colA || !colB) && (
                <div
                    className="text-center py-16 rounded-2xl"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <GitCompare
                        size={40}
                        className="mx-auto mb-3"
                        style={{ color: "var(--color-text-dim)", opacity: 0.5 }}
                    />
                    <p
                        className="text-sm"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        Select two collections above to compare
                    </p>
                </div>
            )}
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

interface CollectionSelectorProps {
    label: string;
    value: string;
    onChange: (id: string) => void;
    collections: { id: string; name: string }[];
    color: string;
}

function CollectionSelector({ label, value, onChange, collections, color }: CollectionSelectorProps) {
    return (
        <div
            className="rounded-2xl p-4"
            style={{
                background: "var(--color-bg-card)",
                border: `1px solid ${value ? color + "40" : "var(--color-border)"}`,
            }}
        >
            <label
                className="text-[10px] uppercase tracking-wider font-semibold mb-2 block"
                style={{ color }}
            >
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                    background: "var(--color-bg-input)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                }}
            >
                <option value="">Select collection…</option>
                {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

interface CompareCardProps {
    icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
    label: string;
    valueA: string;
    valueB: string;
}

function CompareCard({ icon: Icon, label, valueA, valueB }: CompareCardProps) {
    return (
        <div
            className="rounded-2xl p-5"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Icon size={14} style={{ color: "var(--color-text-dim)" }} />
                <span
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-dim)" }}
                >
                    {label}
                </span>
            </div>
            <div className="flex items-end gap-4">
                <div>
                    <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "#6c5ce7" }}
                    >
                        A
                    </span>
                    <p className="text-lg font-bold">{valueA}</p>
                </div>
                <span className="text-xs pb-1" style={{ color: "var(--color-text-dim)" }}>
                    vs
                </span>
                <div>
                    <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "#0ea5e9" }}
                    >
                        B
                    </span>
                    <p className="text-lg font-bold">{valueB}</p>
                </div>
            </div>
        </div>
    );
}

function computeStats(data: { ids: string[]; metadatas?: (Record<string, unknown> | null)[] | null; embeddings?: (number[] | null)[] | null } | undefined) {
    if (!data) return null;

    const metadataKeys = new Set<string>();
    data.metadatas?.forEach((m) => {
        if (m) Object.keys(m).forEach((k) => metadataKeys.add(k));
    });

    let embeddingDims: number | null = null;
    data.embeddings?.forEach((e) => {
        if (e && embeddingDims === null) embeddingDims = e.length;
    });

    return {
        count: data.ids.length,
        metadataKeys: Array.from(metadataKeys).sort(),
        embeddingDims,
    };
}
