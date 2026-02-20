import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    Table2,
    Search as SearchIcon,
    BarChart3,
    Settings,
    Loader2,
    AlertCircle,
    Trash2,
    Hash,
    Database,
    Layers,
    Box,
    Activity,
    TrendingUp,
} from "lucide-react";
import {
    getCollection,
    getCollectionCount,
    getItems,
    queryCollection,
    deleteCollection,
    getAllItems,
} from "../../../lib/chromaClient";
import { DataTable } from "../../../components/table/DataTable";
import {
    EmbeddingScatter,
    pcaProject,
} from "../../../components/charts/EmbeddingScatter";
import { RecordDrawer } from "../../../components/common/RecordDrawer";
import { Modal } from "../../../components/common/Modal";
import {
    MetadataFilterBuilder,
    buildWhereClause,
    type MetadataFilter,
} from "../../../components/common/MetadataFilterBuilder";
import { SkeletonStats, SkeletonTable } from "../../../components/common/Skeleton";
import { GrowthChart } from "../../../components/charts/GrowthChart";
import { MetadataCharts } from "../../../components/charts/MetadataCharts";
import { SimilarityHeatmap } from "../../../components/charts/SimilarityHeatmap";
import { recordSnapshot, getSnapshots } from "../../../lib/growthTracker";

type Tab = "browse" | "query" | "visualize" | "analytics" | "settings";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "browse", label: "Browse", icon: <Table2 size={15} /> },
    { key: "query", label: "Query", icon: <SearchIcon size={15} /> },
    { key: "visualize", label: "Visualize", icon: <BarChart3 size={15} /> },
    { key: "analytics", label: "Analytics", icon: <TrendingUp size={15} /> },
    { key: "settings", label: "Settings", icon: <Settings size={15} /> },
];

export function CollectionPage() {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>("browse");

    const collectionQuery = useQuery({
        queryKey: ["collection", name],
        queryFn: () => getCollection(name!),
        enabled: !!name,
    });

    const countQuery = useQuery({
        queryKey: ["collectionCount", collectionQuery.data?.id],
        queryFn: () => getCollectionCount(collectionQuery.data!.id),
        enabled: !!collectionQuery.data?.id,
    });

    // Fetch a sample to get metadata keys + embedding dimensions
    const sampleQuery = useQuery({
        queryKey: ["sample", collectionQuery.data?.id],
        queryFn: () =>
            getItems(collectionQuery.data!.id, {
                limit: 10,
                include: ["metadatas", "embeddings"],
            }),
        enabled: !!collectionQuery.data?.id,
    });

    const statsData = useMemo(() => {
        const metaKeySet = new Set<string>();
        let embDims: number | null = null;

        sampleQuery.data?.metadatas?.forEach((m) => {
            if (m) Object.keys(m).forEach((k) => metaKeySet.add(k));
        });
        sampleQuery.data?.embeddings?.forEach((e) => {
            if (e && e.length > 0 && embDims === null) embDims = e.length;
        });

        return {
            metadataKeys: Array.from(metaKeySet),
            embeddingDims: embDims,
        };
    }, [sampleQuery.data]);

    // ── Record growth snapshot ──────────────────────
    useEffect(() => {
        if (collectionQuery.data?.id && countQuery.data !== undefined) {
            recordSnapshot(collectionQuery.data.id, countQuery.data);
        }
    }, [collectionQuery.data?.id, countQuery.data]);

    if (collectionQuery.isLoading) {
        return (
            <div className="max-w-6xl mx-auto space-y-5">
                <SkeletonStats />
                <SkeletonTable rows={8} cols={4} />
            </div>
        );
    }

    if (collectionQuery.error) {
        return (
            <div
                className="max-w-2xl mx-auto p-5 rounded-2xl flex items-start gap-3"
                style={{
                    background: "rgba(255,71,87,0.06)",
                    border: "1px solid rgba(255,71,87,0.2)",
                }}
            >
                <AlertCircle size={20} style={{ color: "var(--color-error)" }} />
                <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-error)" }}>
                        Failed to load collection
                    </p>
                    <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                        {(collectionQuery.error as Error).message}
                    </p>
                </div>
            </div>
        );
    }

    const collection = collectionQuery.data!;

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                    onClick={() => navigate("/collections")}
                    className="p-2 rounded-xl transition-colors cursor-pointer self-start"
                    style={{
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold">{collection.name}</h1>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span
                            className="text-xs flex items-center gap-1"
                            style={{ color: "var(--color-text-dim)" }}
                        >
                            <Hash size={11} />
                            {collection.id.slice(0, 8)}
                        </span>
                        {countQuery.data !== undefined && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                    background: "var(--color-accent-glow)",
                                    color: "var(--color-accent)",
                                }}
                            >
                                {countQuery.data.toLocaleString()} items
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Stats Dashboard ──────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                    icon={<Database size={16} />}
                    label="Total Items"
                    value={countQuery.data?.toLocaleString() ?? "…"}
                    accent="var(--color-accent)"
                />
                <StatCard
                    icon={<Box size={16} />}
                    label="Dimensions"
                    value={statsData.embeddingDims ? `${statsData.embeddingDims}d` : "—"}
                    accent="var(--color-info)"
                />
                <StatCard
                    icon={<Layers size={16} />}
                    label="Metadata Keys"
                    value={String(statsData.metadataKeys.length)}
                    accent="var(--color-success)"
                />
                <StatCard
                    icon={<Activity size={16} />}
                    label="Collection ID"
                    value={collection.id.slice(0, 8) + "…"}
                    accent="var(--color-warning)"
                />
            </div>

            {/* Tabs */}
            <div
                className="flex gap-1 p-1 rounded-xl overflow-x-auto"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            >
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex-1 justify-center whitespace-nowrap"
                        style={{
                            background:
                                tab === t.key ? "var(--color-accent-glow)" : "transparent",
                            color:
                                tab === t.key
                                    ? "var(--color-accent-hover)"
                                    : "var(--color-text-muted)",
                        }}
                    >
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "browse" && (
                <BrowseTab
                    collectionId={collection.id}
                    metadataKeys={statsData.metadataKeys}
                />
            )}
            {tab === "query" && (
                <QueryTab
                    collectionId={collection.id}
                    metadataKeys={statsData.metadataKeys}
                />
            )}
            {tab === "visualize" && <VisualizeTab collectionId={collection.id} />}
            {tab === "analytics" && (
                <AnalyticsTab
                    collectionId={collection.id}
                    metadataKeys={statsData.metadataKeys}
                />
            )}
            {tab === "settings" && (
                <SettingsTab
                    collection={collection}
                    count={countQuery.data ?? null}
                    embDims={statsData.embeddingDims}
                    metadataKeys={statsData.metadataKeys}
                    onDeleted={() => navigate("/collections")}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Stats Card
   ═════════════════════════════════════════════════════════════════════ */

function StatCard({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent: string;
}) {
    return (
        <div
            className="p-4 rounded-2xl"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${accent}20`, color: accent }}
                >
                    {icon}
                </div>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {label}
                </span>
            </div>
            <p className="text-lg font-bold">{value}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Browse Tab
   ═════════════════════════════════════════════════════════════════════ */

interface ItemRow {
    id: string;
    document: string | null;
    metadata: Record<string, unknown> | null;
    embeddingDims: number | null;
    embedding: number[] | null;
}

function BrowseTab({
    collectionId,
    metadataKeys,
}: {
    collectionId: string;
    metadataKeys: string[];
}) {
    const [drawerItem, setDrawerItem] = useState<ItemRow | null>(null);
    const [offset, setOffset] = useState(0);
    const [filters, setFilters] = useState<MetadataFilter[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const limit = 100;

    const whereClause = useMemo(() => buildWhereClause(filters), [filters]);

    const { data, isLoading, error } = useQuery({
        queryKey: ["items", collectionId, offset, limit, whereClause],
        queryFn: () =>
            getItems(collectionId, {
                limit,
                offset,
                include: ["documents", "metadatas", "embeddings"],
                where: whereClause,
            }),
    });

    const rows: ItemRow[] = useMemo(() => {
        if (!data) return [];
        return data.ids.map((id, i) => ({
            id,
            document: data.documents?.[i] ?? null,
            metadata: data.metadatas?.[i] ?? null,
            embeddingDims: data.embeddings?.[i]?.length ?? null,
            embedding: data.embeddings?.[i] ?? null,
        }));
    }, [data]);

    const columns: ColumnDef<ItemRow, unknown>[] = useMemo(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ getValue }) => (
                    <span className="font-mono text-xs">{String(getValue())}</span>
                ),
            },
            {
                accessorKey: "document",
                header: "Document",
                cell: ({ getValue }) => {
                    const v = getValue() as string | null;
                    return (
                        <span
                            className="text-xs line-clamp-2 max-w-xs"
                            style={{ color: v ? "var(--color-text)" : "var(--color-text-dim)" }}
                        >
                            {v ?? "—"}
                        </span>
                    );
                },
            },
            {
                accessorKey: "metadata",
                header: "Metadata",
                cell: ({ getValue }) => {
                    const m = getValue() as Record<string, unknown> | null;
                    if (!m) return <span style={{ color: "var(--color-text-dim)" }}>—</span>;
                    const keys = Object.keys(m);
                    return (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {keys.length} key{keys.length !== 1 ? "s" : ""}
                        </span>
                    );
                },
            },
            {
                accessorKey: "embeddingDims",
                header: "Embedding",
                cell: ({ getValue }) => {
                    const d = getValue() as number | null;
                    return (
                        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                            {d ? `${d}d` : "—"}
                        </span>
                    );
                },
            },
        ],
        [],
    );

    const handleBulkDelete = (selected: ItemRow[]) => {
        setPendingDeleteIds(selected.map((r) => r.id));
        setShowDeleteModal(true);
    };

    if (isLoading) {
        return <SkeletonTable rows={8} cols={4} />;
    }

    if (error) {
        return <ErrorInline message={(error as Error).message} />;
    }

    return (
        <>
            {/* Metadata filters */}
            <div
                className="p-4 rounded-2xl"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <MetadataFilterBuilder
                    filters={filters}
                    onChange={(f) => {
                        setFilters(f);
                        setOffset(0);
                    }}
                    availableKeys={metadataKeys}
                />
            </div>

            <DataTable
                data={rows}
                columns={columns}
                onRowClick={setDrawerItem}
                enableSelection
                onBulkDelete={handleBulkDelete}
                exportFilename={`collection-${collectionId}`}
            />

            {/* Offset pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span>Showing {rows.length} items (offset {offset})</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-30"
                        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)" }}
                    >
                        ← Prev
                    </button>
                    <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={rows.length < limit}
                        className="px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-30"
                        style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)" }}
                    >
                        Next →
                    </button>
                </div>
            </div>

            {/* Bulk delete confirm modal */}
            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Records"
            >
                <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                    Are you sure you want to delete{" "}
                    <strong style={{ color: "var(--color-text)" }}>
                        {pendingDeleteIds.length}
                    </strong>{" "}
                    selected record{pendingDeleteIds.length !== 1 ? "s" : ""}?
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 rounded-xl text-sm cursor-pointer"
                        style={{
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-muted)",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            toast.success(`${pendingDeleteIds.length} record(s) queued for deletion`);
                            setShowDeleteModal(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                        style={{ background: "var(--color-error)", color: "#fff" }}
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </Modal>

            {/* Drawer */}
            <RecordDrawer
                open={!!drawerItem}
                onClose={() => setDrawerItem(null)}
                title={drawerItem?.id ?? ""}
            >
                {drawerItem && (
                    <div className="space-y-4 text-sm">
                        <Section title="ID">
                            <code className="text-xs break-all">{drawerItem.id}</code>
                        </Section>
                        <Section title="Document">
                            <p className="whitespace-pre-wrap" style={{ color: drawerItem.document ? "var(--color-text)" : "var(--color-text-dim)" }}>
                                {drawerItem.document ?? "No document"}
                            </p>
                        </Section>
                        <Section title="Metadata">
                            <pre
                                className="text-xs p-3 rounded-lg overflow-x-auto"
                                style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}
                            >
                                {JSON.stringify(drawerItem.metadata, null, 2) ?? "null"}
                            </pre>
                        </Section>
                        <Section title={`Embedding (${drawerItem.embeddingDims ?? 0} dims)`}>
                            <pre
                                className="text-xs p-3 rounded-lg overflow-x-auto max-h-40"
                                style={{ background: "var(--color-bg)", color: "var(--color-text-dim)" }}
                            >
                                [{drawerItem.embedding?.slice(0, 20).join(", ")}
                                {(drawerItem.embedding?.length ?? 0) > 20 ? ", …" : ""}]
                            </pre>
                        </Section>
                    </div>
                )}
            </RecordDrawer>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Query Tab
   ═════════════════════════════════════════════════════════════════════ */

function QueryTab({
    collectionId,
    metadataKeys,
}: {
    collectionId: string;
    metadataKeys: string[];
}) {
    const [queryText, setQueryText] = useState("");
    const [nResults, setNResults] = useState(10);
    const [filters, setFilters] = useState<MetadataFilter[]>([]);
    const [results, setResults] = useState<QueryResultRow[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    interface QueryResultRow {
        id: string;
        distance: number | null;
        document: string | null;
        metadata: Record<string, unknown> | null;
    }

    const runQuery = async () => {
        if (!queryText.trim()) {
            setError("Enter a query text to search by similarity.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const where = buildWhereClause(filters);

            const resp = await queryCollection(collectionId, {
                query_texts: [queryText.trim()],
                n_results: nResults,
                include: ["documents", "metadatas", "distances"],
                where,
            });

            const ids = resp.ids[0] ?? [];
            const rows: QueryResultRow[] = ids.map((id, i) => ({
                id,
                distance: resp.distances?.[0]?.[i] ?? null,
                document: resp.documents?.[0]?.[i] ?? null,
                metadata: resp.metadatas?.[0]?.[i] ?? null,
            }));

            setResults(rows);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnDef<QueryResultRow, unknown>[] = useMemo(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ getValue }) => (
                    <span className="font-mono text-xs">{String(getValue())}</span>
                ),
            },
            {
                accessorKey: "distance",
                header: "Distance",
                cell: ({ getValue }) => {
                    const d = getValue() as number | null;
                    return (
                        <span className="text-xs font-mono" style={{ color: "var(--color-accent)" }}>
                            {d != null ? d.toFixed(4) : "—"}
                        </span>
                    );
                },
            },
            {
                accessorKey: "document",
                header: "Document",
                cell: ({ getValue }) => {
                    const v = getValue() as string | null;
                    return (
                        <span className="text-xs line-clamp-2 max-w-sm">
                            {v ?? "—"}
                        </span>
                    );
                },
            },
            {
                accessorKey: "metadata",
                header: "Metadata",
                cell: ({ getValue }) => {
                    const m = getValue() as Record<string, unknown> | null;
                    if (!m) return "—";
                    return (
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {Object.keys(m).length} keys
                        </span>
                    );
                },
            },
        ],
        [],
    );

    return (
        <div className="space-y-4">
            {/* Query form */}
            <div
                className="p-5 rounded-2xl space-y-4"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                        Query Text
                    </label>
                    <textarea
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                        style={{
                            background: "var(--color-bg-input)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                        }}
                        placeholder="Enter text to search for similar documents…"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="sm:w-32">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                            Results (n)
                        </label>
                        <input
                            type="number"
                            value={nResults}
                            min={1}
                            max={100}
                            onChange={(e) => setNResults(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{
                                background: "var(--color-bg-input)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text)",
                            }}
                        />
                    </div>
                    <div className="flex-1">
                        <MetadataFilterBuilder
                            filters={filters}
                            onChange={setFilters}
                            availableKeys={metadataKeys}
                        />
                    </div>
                </div>
                <button
                    onClick={runQuery}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                    {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <SearchIcon size={16} />
                    )}
                    Run Query
                </button>
            </div>

            {error && <ErrorInline message={error} />}

            {results && (
                <DataTable
                    data={results}
                    columns={columns}
                    exportFilename="query-results"
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Analytics Tab
   ═════════════════════════════════════════════════════════════════════ */

function AnalyticsTab({
    collectionId,
    metadataKeys,
}: {
    collectionId: string;
    metadataKeys: string[];
}) {
    const snapshots = useMemo(() => getSnapshots(collectionId), [collectionId]);

    // Fetch a bigger sample for metadata distribution analysis
    const { data: analyticsSample, isLoading } = useQuery({
        queryKey: ["analytics-sample", collectionId],
        queryFn: () =>
            getItems(collectionId, {
                limit: 500,
                include: ["metadatas"],
            }),
        enabled: !!collectionId,
    });

    const metadatas = useMemo(
        () => analyticsSample?.metadatas ?? [],
        [analyticsSample],
    );

    return (
        <div className="space-y-6">
            {/* Section: Growth */}
            <div>
                <h3
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: "var(--color-text)" }}
                >
                    <TrendingUp size={15} style={{ color: "var(--color-accent)" }} />
                    Collection Growth
                </h3>
                <GrowthChart snapshots={snapshots} />
            </div>

            {/* Section: Metadata Distributions */}
            <div>
                <h3
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: "var(--color-text)" }}
                >
                    <BarChart3 size={15} style={{ color: "var(--color-accent)" }} />
                    Metadata Distribution
                    <span className="text-xs font-normal" style={{ color: "var(--color-text-dim)" }}>
                        ({metadataKeys.length} key{metadataKeys.length !== 1 && "s"}, sampled up to 500 items)
                    </span>
                </h3>

                {isLoading ? (
                    <div
                        className="flex items-center justify-center py-12 rounded-2xl"
                        style={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border)",
                        }}
                    >
                        <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-accent)" }} />
                        <span className="ml-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                            Loading sample data…
                        </span>
                    </div>
                ) : (
                    <MetadataCharts metadatas={metadatas} />
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Visualize Tab
   ═════════════════════════════════════════════════════════════════════ */

function VisualizeTab({ collectionId }: { collectionId: string }) {
    const [sampleSize, setSampleSize] = useState(200);
    const [fetched, setFetched] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ["embeddings", collectionId, sampleSize],
        queryFn: () =>
            getItems(collectionId, {
                limit: sampleSize,
                include: ["embeddings", "metadatas", "documents"],
            }),
        enabled: fetched,
    });

    const { points, metadataKeys } = useMemo(() => {
        if (!data || !data.embeddings) return { points: [], metadataKeys: [] };

        const validEmbeddings: number[][] = [];
        const validIndices: number[] = [];

        data.embeddings.forEach((emb, i) => {
            if (emb && emb.length > 0) {
                validEmbeddings.push(emb);
                validIndices.push(i);
            }
        });

        if (validEmbeddings.length === 0) return { points: [], metadataKeys: [] };

        const projected = pcaProject(validEmbeddings);
        const pts = projected.map((p, idx) => {
            const origIdx = validIndices[idx]!;
            return {
                id: data.ids[origIdx]!,
                x: p.x,
                y: p.y,
                metadata: data.metadatas?.[origIdx] ?? undefined,
                document: data.documents?.[origIdx] ?? undefined,
            };
        });

        const keySet = new Set<string>();
        data.metadatas?.forEach((m) => {
            if (m) Object.keys(m).forEach((k) => keySet.add(k));
        });

        return { points: pts, metadataKeys: Array.from(keySet) };
    }, [data]);

    if (!fetched) {
        return (
            <div
                className="p-8 rounded-2xl text-center"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <BarChart3
                    size={40}
                    className="mx-auto mb-4"
                    style={{ color: "var(--color-text-dim)" }}
                />
                <p className="text-sm mb-1 font-medium">Embedding Visualization</p>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-dim)" }}>
                    Fetch embeddings and project to 2D with PCA
                </p>
                <div className="flex items-center justify-center gap-3 mb-4">
                    <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Sample size:
                    </label>
                    <input
                        type="number"
                        value={sampleSize}
                        min={10}
                        max={2000}
                        onChange={(e) => setSampleSize(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 rounded-lg text-xs outline-none text-center"
                        style={{
                            background: "var(--color-bg-input)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                        }}
                    />
                </div>
                <button
                    onClick={() => setFetched(true)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                    Fetch &amp; Visualize
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-accent)" }} />
            </div>
        );
    }

    if (error) {
        return <ErrorInline message={(error as Error).message} />;
    }

    if (points.length === 0) {
        return (
            <div
                className="p-8 rounded-2xl text-center"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <p className="text-sm" style={{ color: "var(--color-text-dim)" }}>
                    No embeddings found in this collection.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <EmbeddingScatter points={points} metadataKeys={metadataKeys} />

            {/* Similarity Heatmap */}
            {data?.embeddings && (
                <div
                    className="p-5 rounded-2xl"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Activity size={15} style={{ color: "var(--color-accent)" }} />
                        Similarity Heatmap
                    </h3>
                    <SimilarityHeatmap
                        embeddings={data.embeddings}
                        ids={data.ids}
                        maxItems={50}
                    />
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Settings Tab
   ═════════════════════════════════════════════════════════════════════ */

function SettingsTab({
    collection,
    count,
    embDims,
    metadataKeys,
    onDeleted,
}: {
    collection: { id: string; name: string; metadata?: Record<string, unknown> | null };
    count: number | null;
    embDims: number | null;
    metadataKeys: string[];
    onDeleted: () => void;
}) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteCollection(collection.name);
            toast.success(`Deleted collection "${collection.name}"`);
            onDeleted();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <div className="space-y-5 max-w-2xl">
            {/* Info */}
            <div
                className="p-5 rounded-2xl space-y-3"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <h3 className="text-sm font-semibold">Collection Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <InfoRow label="Name" value={collection.name} />
                    <InfoRow label="ID" value={collection.id} />
                    <InfoRow
                        label="Items"
                        value={count !== null ? count.toLocaleString() : "—"}
                    />
                    <InfoRow
                        label="Embedding Dimensions"
                        value={embDims ? `${embDims}` : "—"}
                    />
                    <InfoRow
                        label="Metadata Keys"
                        value={metadataKeys.length > 0 ? metadataKeys.join(", ") : "—"}
                    />
                </div>
            </div>

            {/* Metadata */}
            {collection.metadata && Object.keys(collection.metadata).length > 0 && (
                <div
                    className="p-5 rounded-2xl"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <h3 className="text-sm font-semibold mb-3">Metadata</h3>
                    <pre
                        className="text-xs p-3 rounded-lg overflow-x-auto"
                        style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}
                    >
                        {JSON.stringify(collection.metadata, null, 2)}
                    </pre>
                </div>
            )}

            {/* Danger zone */}
            <div
                className="p-5 rounded-2xl"
                style={{
                    background: "rgba(255,71,87,0.04)",
                    border: "1px solid rgba(255,71,87,0.15)",
                }}
            >
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-error)" }}>
                    Danger Zone
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                    Deleting a collection is permanent and cannot be undone.
                </p>
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                    style={{
                        background: "rgba(255,71,87,0.12)",
                        color: "var(--color-error)",
                        border: "1px solid rgba(255,71,87,0.2)",
                    }}
                >
                    <Trash2 size={15} /> Delete Collection
                </button>
            </div>

            {/* Backup / Restore */}
            <div
                className="p-5 rounded-2xl"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <h3 className="text-sm font-semibold mb-3">Backup & Restore</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const totalCount = count ?? 0;
                                if (totalCount === 0) {
                                    toast.error("Collection is empty");
                                    return;
                                }
                                toast.loading("Exporting…", { id: "export" });
                                const all = await getAllItems(collection.id, totalCount);
                                const blob = new Blob([JSON.stringify({
                                    name: collection.name,
                                    metadata: collection.metadata,
                                    data: all,
                                    exportedAt: new Date().toISOString(),
                                }, null, 2)], { type: "application/json" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${collection.name}-backup.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success(`Exported ${all.ids.length} items`, { id: "export" });
                            } catch (err) {
                                toast.error((err as Error).message, { id: "export" });
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                        style={{
                            background: "var(--color-accent-glow)",
                            color: "var(--color-accent)",
                            border: "1px solid var(--color-accent)",
                        }}
                    >
                        <Database size={15} /> Export JSON
                    </button>
                </div>
                <p className="text-[11px] mt-2" style={{ color: "var(--color-text-dim)" }}>
                    Export all items (IDs, documents, metadata, embeddings) as a JSON file.
                </p>
            </div>

            {/* Delete modal */}
            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Collection"
            >
                <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                    Are you sure you want to delete{" "}
                    <strong style={{ color: "var(--color-text)" }}>{collection.name}</strong>?
                    This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 rounded-xl text-sm cursor-pointer"
                        style={{
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-muted)",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60"
                        style={{ background: "var(--color-error)", color: "#fff" }}
                    >
                        {deleting && <Loader2 size={14} className="animate-spin" />}
                        Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
}

/* ── Shared helpers ────────────────────────────────────────────────── */

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <h4
                className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--color-text-dim)" }}
            >
                {title}
            </h4>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                {label}
            </span>
            <p className="text-sm font-medium truncate">{value}</p>
        </div>
    );
}

function ErrorInline({ message }: { message: string }) {
    return (
        <div
            className="p-4 rounded-2xl flex items-start gap-3"
            style={{
                background: "rgba(255,71,87,0.06)",
                border: "1px solid rgba(255,71,87,0.2)",
            }}
        >
            <AlertCircle size={18} style={{ color: "var(--color-error)" }} className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {message}
            </p>
        </div>
    );
}
