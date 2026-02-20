import { useQuery } from "@tanstack/react-query";
import {
    Server,
    Heart,
    Cpu,
    Database,
    Layers,
    Activity,
    Loader2,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { testConnection, listCollections, detectCapabilities } from "../../../lib/chromaClient";

export function ServerPage() {
    const heartbeatQuery = useQuery({
        queryKey: ["server-heartbeat"],
        queryFn: testConnection,
        refetchInterval: 10_000,
    });

    const collectionsQuery = useQuery({
        queryKey: ["server-collections"],
        queryFn: listCollections,
    });

    const capabilitiesQuery = useQuery({
        queryKey: ["server-capabilities"],
        queryFn: detectCapabilities,
    });

    const isLoading =
        heartbeatQuery.isLoading ||
        collectionsQuery.isLoading ||
        capabilitiesQuery.isLoading;

    const isError = heartbeatQuery.isError;

    const cards = [
        {
            icon: Heart,
            label: "Status",
            value: heartbeatQuery.isSuccess ? "Healthy" : isError ? "Unreachable" : "Checking…",
            color: heartbeatQuery.isSuccess
                ? "var(--color-success)"
                : isError
                    ? "var(--color-error)"
                    : "var(--color-warning)",
            sub: heartbeatQuery.data?.heartbeat
                ? `Heartbeat: ${JSON.stringify(heartbeatQuery.data.heartbeat)}`
                : undefined,
        },
        {
            icon: Cpu,
            label: "Version",
            value: heartbeatQuery.data?.version ?? "—",
            color: "var(--color-accent)",
            sub: capabilitiesQuery.data?.apiVersion
                ? `API: ${capabilitiesQuery.data.apiVersion}`
                : undefined,
        },
        {
            icon: Layers,
            label: "Collections",
            value: collectionsQuery.data?.length?.toString() ?? "—",
            color: "#a78bfa",
            sub: "Total collections",
        },
        {
            icon: Database,
            label: "Tenant",
            value: "default_tenant",
            color: "#f59e0b",
            sub: "Database: default_database",
        },
    ];

    const capabilities = capabilitiesQuery.data;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
                    }}
                >
                    <Server size={20} color="#fff" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Server Dashboard</h1>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Monitor your ChromaDB server health and capabilities
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

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-2xl p-5 transition-all hover:scale-[1.02]"
                        style={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border)",
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{
                                    background: `${card.color}18`,
                                }}
                            >
                                <card.icon size={16} style={{ color: card.color }} />
                            </div>
                            <span
                                className="text-xs font-medium uppercase tracking-wider"
                                style={{ color: "var(--color-text-dim)" }}
                            >
                                {card.label}
                            </span>
                        </div>
                        <p className="text-xl font-bold" style={{ color: card.color }}>
                            {card.value}
                        </p>
                        {card.sub && (
                            <p
                                className="text-[11px] mt-1 truncate"
                                style={{ color: "var(--color-text-dim)" }}
                            >
                                {card.sub}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Capabilities */}
            {capabilities && (
                <div
                    className="rounded-2xl p-6"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Activity size={16} style={{ color: "var(--color-accent)" }} />
                        API Capabilities
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {([
                            ["Heartbeat", capabilities.heartbeat],
                            ["Version", capabilities.version],
                            ["List Collections", capabilities.listCollections],
                            ["Get Collection", capabilities.getCollection],
                            ["Count Collection", capabilities.countCollection],
                            ["Get Items", capabilities.getItems],
                            ["Query", capabilities.query],
                        ] as [string, boolean][]).map(([name, supported]) => (
                            <div
                                key={name}
                                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                                style={{
                                    background: supported
                                        ? "rgba(52, 211, 153, 0.08)"
                                        : "rgba(239, 68, 68, 0.08)",
                                    color: supported
                                        ? "var(--color-success)"
                                        : "var(--color-error)",
                                }}
                            >
                                {supported ? (
                                    <CheckCircle2 size={14} />
                                ) : (
                                    <AlertCircle size={14} />
                                )}
                                {name}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error state */}
            {isError && (
                <div
                    className="flex items-center gap-3 rounded-2xl p-5"
                    style={{
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "var(--color-error)",
                    }}
                >
                    <AlertCircle size={20} />
                    <div>
                        <p className="text-sm font-medium">Cannot reach server</p>
                        <p className="text-xs mt-0.5" style={{ opacity: 0.7 }}>
                            Check your connection settings and make sure ChromaDB is running.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
