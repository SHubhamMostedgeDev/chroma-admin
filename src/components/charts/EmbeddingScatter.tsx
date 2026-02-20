import { useMemo, useState } from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ZAxis,
} from "recharts";

interface EmbeddingPoint {
    id: string;
    x: number;
    y: number;
    metadata?: Record<string, unknown>;
    document?: string | null;
    cluster?: number;
}

interface EmbeddingScatterProps {
    points: EmbeddingPoint[];
    metadataKeys?: string[];
}

// ── Colour palette ──────────────────────────────────────────────────

const PALETTE = [
    "#6c5ce7",
    "#00d68f",
    "#3ec2f7",
    "#ff4757",
    "#ffc048",
    "#a78bfa",
    "#f472b6",
    "#34d399",
    "#facc15",
    "#fb923c",
];

function getColor(index: number): string {
    return PALETTE[index % PALETTE.length]!;
}

// ── PCA (simple 2-component) ────────────────────────────────────────

export function pcaProject(
    embeddings: number[][],
): { x: number; y: number }[] {
    const n = embeddings.length;
    if (n === 0) return [];
    const dim = embeddings[0]!.length;

    // Mean center
    const mean = new Array<number>(dim).fill(0);
    for (const vec of embeddings) {
        for (let j = 0; j < dim; j++) mean[j]! += vec[j]!;
    }
    for (let j = 0; j < dim; j++) mean[j]! /= n;

    const centered = embeddings.map((vec) => vec.map((v, j) => v - mean[j]!));

    // Power iteration for top-2 components
    const projectOnto = (component: number[]): number[] =>
        centered.map((vec) =>
            vec.reduce((s, v, j) => s + v * component[j]!, 0),
        );

    function powerIteration(deflected: number[][]): number[] {
        let vec = Array.from({ length: dim }, () => Math.random() - 0.5);
        for (let iter = 0; iter < 100; iter++) {
            const newVec = new Array<number>(dim).fill(0);
            for (const row of deflected) {
                const dot = row.reduce((s, v, j) => s + v * vec[j]!, 0);
                for (let j = 0; j < dim; j++) newVec[j]! += dot * row[j]!;
            }
            const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0)) || 1;
            vec = newVec.map((v) => v / norm);
        }
        return vec;
    }

    const pc1 = powerIteration(centered);
    const proj1 = projectOnto(pc1);

    // Deflate
    const deflected = centered.map((vec, i) =>
        vec.map((v, j) => v - proj1[i]! * pc1[j]!),
    );
    const pc2 = powerIteration(deflected);
    const proj2 = projectOnto(pc2);

    return proj1.map((x, i) => ({ x, y: proj2[i]! }));
}

// ── K-Means clustering ──────────────────────────────────────────────

export function kMeans(
    points: { x: number; y: number }[],
    k: number,
    maxIter = 50,
): { labels: number[]; centroids: { x: number; y: number }[] } {
    const n = points.length;
    if (n === 0) return { labels: [], centroids: [] };

    // Initialize centroids using k-means++
    const centroids: { x: number; y: number }[] = [];
    centroids.push({ ...points[Math.floor(Math.random() * n)]! });

    for (let c = 1; c < k; c++) {
        const dists = points.map((p) => {
            let minD = Infinity;
            for (const cen of centroids) {
                const d = (p.x - cen.x) ** 2 + (p.y - cen.y) ** 2;
                if (d < minD) minD = d;
            }
            return minD;
        });
        const total = dists.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < n; i++) {
            r -= dists[i]!;
            if (r <= 0) {
                centroids.push({ ...points[i]! });
                break;
            }
        }
        if (centroids.length === c) {
            // fallback
            centroids.push({ ...points[Math.floor(Math.random() * n)]! });
        }
    }

    let labels = new Array<number>(n).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
        // Assign
        const newLabels = points.map((p) => {
            let minD = Infinity;
            let best = 0;
            for (let c = 0; c < k; c++) {
                const d =
                    (p.x - centroids[c]!.x) ** 2 + (p.y - centroids[c]!.y) ** 2;
                if (d < minD) {
                    minD = d;
                    best = c;
                }
            }
            return best;
        });

        // Update centroids
        let changed = false;
        for (let c = 0; c < k; c++) {
            let sumX = 0,
                sumY = 0,
                cnt = 0;
            for (let i = 0; i < n; i++) {
                if (newLabels[i] === c) {
                    sumX += points[i]!.x;
                    sumY += points[i]!.y;
                    cnt++;
                }
            }
            if (cnt > 0) {
                const nx = sumX / cnt;
                const ny = sumY / cnt;
                if (nx !== centroids[c]!.x || ny !== centroids[c]!.y) changed = true;
                centroids[c] = { x: nx, y: ny };
            }
        }

        labels = newLabels;
        if (!changed) break;
    }

    return { labels, centroids };
}

// ── Component ───────────────────────────────────────────────────────

export function EmbeddingScatter({ points, metadataKeys = [] }: EmbeddingScatterProps) {
    const [colorKey, setColorKey] = useState<string>("");
    const [clustering, setClustering] = useState(false);
    const [clusterK, setClusterK] = useState(3);

    // Compute k-means clusters
    const clustered = useMemo(() => {
        if (!clustering || points.length < clusterK) return null;
        const coords = points.map((p) => ({ x: p.x, y: p.y }));
        return kMeans(coords, clusterK);
    }, [points, clustering, clusterK]);

    const groups = useMemo(() => {
        // Clustering overrides color-by
        if (clustering && clustered) {
            const map: Record<string, EmbeddingPoint[]> = {};
            for (let i = 0; i < points.length; i++) {
                const label = `Cluster ${clustered.labels[i]! + 1}`;
                if (!map[label]) map[label] = [];
                map[label]!.push({ ...points[i]!, cluster: clustered.labels[i] });
            }
            return map;
        }

        if (!colorKey) return { "All points": points };
        const map: Record<string, EmbeddingPoint[]> = {};
        for (const p of points) {
            const val = String(p.metadata?.[colorKey] ?? "—");
            if (!map[val]) map[val] = [];
            map[val]!.push(p);
        }
        return map;
    }, [points, colorKey, clustering, clustered]);

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                {metadataKeys.length > 0 && !clustering && (
                    <>
                        <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                            Color by:
                        </span>
                        <select
                            value={colorKey}
                            onChange={(e) => setColorKey(e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                            style={{
                                background: "var(--color-bg-input)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text)",
                            }}
                        >
                            <option value="">None</option>
                            {metadataKeys.map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                        </select>
                    </>
                )}

                {/* Cluster toggle */}
                <button
                    onClick={() => setClustering(!clustering)}
                    className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                        background: clustering
                            ? "var(--color-accent)"
                            : "var(--color-bg-input)",
                        border: clustering
                            ? "1px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        color: clustering ? "#fff" : "var(--color-text-muted)",
                    }}
                >
                    {clustering ? "✦ Clustered" : "Auto-cluster"}
                </button>

                {clustering && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                            k =
                        </span>
                        <input
                            type="range"
                            min={2}
                            max={Math.min(10, points.length)}
                            value={clusterK}
                            onChange={(e) => setClusterK(Number(e.target.value))}
                            className="w-20 accent-[#6c5ce7]"
                        />
                        <span className="text-xs font-mono" style={{ color: "var(--color-text)" }}>
                            {clusterK}
                        </span>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div
                className="rounded-2xl p-4"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <ResponsiveContainer width="100%" height={450}>
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="x"
                            type="number"
                            tick={{ fill: "var(--color-text-dim)", fontSize: 11 }}
                            axisLine={{ stroke: "var(--color-border)" }}
                            name="PC1"
                        />
                        <YAxis
                            dataKey="y"
                            type="number"
                            tick={{ fill: "var(--color-text-dim)", fontSize: 11 }}
                            axisLine={{ stroke: "var(--color-border)" }}
                            name="PC2"
                        />
                        <ZAxis range={[40, 40]} />
                        <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={({ payload }) => {
                                if (!payload?.length) return null;
                                const p = payload[0]?.payload as EmbeddingPoint | undefined;
                                if (!p) return null;
                                return (
                                    <div
                                        className="p-3 rounded-xl text-xs max-w-xs shadow-lg"
                                        style={{
                                            background: "var(--color-bg-elevated)",
                                            border: "1px solid var(--color-border)",
                                            color: "var(--color-text)",
                                        }}
                                    >
                                        <p className="font-semibold mb-1">{p.id}</p>
                                        {p.document && (
                                            <p className="truncate" style={{ color: "var(--color-text-muted)" }}>
                                                {p.document}
                                            </p>
                                        )}
                                        {p.cluster !== undefined && (
                                            <p style={{ color: getColor(p.cluster) }}>
                                                Cluster {p.cluster + 1}
                                            </p>
                                        )}
                                    </div>
                                );
                            }}
                        />
                        {Object.entries(groups).map(([label, pts], idx) => (
                            <Scatter
                                key={label}
                                name={label}
                                data={pts}
                                fill={getColor(idx)}
                                fillOpacity={0.8}
                            />
                        ))}

                        {/* Cluster centroids */}
                        {clustering && clustered && (
                            <Scatter
                                name="Centroids"
                                data={clustered.centroids.map((c, i) => ({
                                    ...c,
                                    id: `centroid-${i}`,
                                }))}
                                fill="#fff"
                                stroke="#000"
                                strokeWidth={2}
                                shape="diamond"
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            {Object.keys(groups).length > 1 && (
                <div className="flex flex-wrap gap-3">
                    {Object.keys(groups).map((label, idx) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: getColor(idx) }}
                            />
                            <span style={{ color: "var(--color-text-muted)" }}>
                                {label} ({groups[label]!.length})
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
