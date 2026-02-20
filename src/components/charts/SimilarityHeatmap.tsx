import { useRef, useEffect, useMemo, useState } from "react";

interface SimilarityHeatmapProps {
    embeddings: (number[] | null)[];
    ids: string[];
    maxItems?: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i]! * b[i]!;
        magA += a[i]! * a[i]!;
        magB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

function interpolateColor(value: number): string {
    // Blue (dissimilar) → White (neutral) → Red (similar)
    const clamped = Math.max(0, Math.min(1, (value + 1) / 2)); // map [-1,1] to [0,1]
    if (clamped < 0.5) {
        const t = clamped * 2;
        const r = Math.round(59 + t * (255 - 59));
        const g = Math.round(130 + t * (255 - 130));
        const b = Math.round(246 + t * (255 - 246));
        return `rgb(${r},${g},${b})`;
    } else {
        const t = (clamped - 0.5) * 2;
        const r = Math.round(255 - t * (255 - 239));
        const g = Math.round(255 - t * (255 - 68));
        const b = Math.round(255 - t * (255 - 68));
        return `rgb(${r},${g},${b})`;
    }
}

export function SimilarityHeatmap({ embeddings, ids, maxItems = 50 }: SimilarityHeatmapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        idA: string;
        idB: string;
        sim: number;
    } | null>(null);
    const [sampleSize, setSampleSize] = useState(Math.min(maxItems, 40));

    // Filter valid embeddings
    const validData = useMemo(() => {
        const items: { id: string; emb: number[] }[] = [];
        for (let i = 0; i < embeddings.length && items.length < sampleSize; i++) {
            const emb = embeddings[i];
            if (emb) {
                items.push({ id: ids[i] ?? `item-${i}`, emb });
            }
        }
        return items;
    }, [embeddings, ids, sampleSize]);

    // Compute similarity matrix
    const matrix = useMemo(() => {
        const n = validData.length;
        const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
        for (let i = 0; i < n; i++) {
            mat[i]![i] = 1;
            for (let j = i + 1; j < n; j++) {
                const sim = cosineSimilarity(validData[i]!.emb, validData[j]!.emb);
                mat[i]![j] = sim;
                mat[j]![i] = sim;
            }
        }
        return mat;
    }, [validData]);

    const cellSize = Math.max(8, Math.min(20, Math.floor(500 / validData.length)));
    const size = cellSize * validData.length;

    // Draw
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        for (let i = 0; i < validData.length; i++) {
            for (let j = 0; j < validData.length; j++) {
                ctx.fillStyle = interpolateColor(matrix[i]![j]!);
                ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
            }
        }
    }, [matrix, validData.length, cellSize, size]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = Math.floor((e.clientX - rect.left) / cellSize);
        const y = Math.floor((e.clientY - rect.top) / cellSize);
        if (x >= 0 && x < validData.length && y >= 0 && y < validData.length) {
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                idA: validData[y]!.id,
                idB: validData[x]!.id,
                sim: matrix[y]![x]!,
            });
        } else {
            setTooltip(null);
        }
    };

    if (validData.length < 2) {
        return (
            <div
                className="text-center py-10 rounded-xl"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                <p className="text-sm" style={{ color: "var(--color-text-dim)" }}>
                    Need at least 2 items with embeddings to show heatmap
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center gap-4">
                <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Sample Size
                </label>
                <input
                    type="range"
                    min={5}
                    max={Math.min(maxItems, embeddings.filter(Boolean).length)}
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    className="flex-1 max-w-xs"
                    style={{ accentColor: "var(--color-accent)" }}
                />
                <span className="text-xs font-mono" style={{ color: "var(--color-text-dim)" }}>
                    {sampleSize}
                </span>
            </div>

            {/* Canvas */}
            <div className="relative inline-block">
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                    className="rounded-lg cursor-crosshair"
                    style={{ border: "1px solid var(--color-border)" }}
                />

                {tooltip && (
                    <div
                        ref={tooltipRef}
                        className="absolute z-10 px-3 py-2 rounded-lg text-xs pointer-events-none shadow-lg"
                        style={{
                            left: tooltip.x + 12,
                            top: tooltip.y - 40,
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                        }}
                    >
                        <div className="font-mono text-[10px]" style={{ color: "var(--color-text-dim)" }}>
                            {tooltip.idA.slice(0, 20)}
                        </div>
                        <div className="font-mono text-[10px]" style={{ color: "var(--color-text-dim)" }}>
                            {tooltip.idB.slice(0, 20)}
                        </div>
                        <div
                            className="font-bold mt-0.5"
                            style={{
                                color: tooltip.sim > 0.7
                                    ? "var(--color-error)"
                                    : tooltip.sim > 0.3
                                        ? "var(--color-warning)"
                                        : "var(--color-accent)",
                            }}
                        >
                            Similarity: {tooltip.sim.toFixed(4)}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-text-dim)" }}>
                <span>Dissimilar</span>
                <div
                    className="h-3 flex-1 max-w-[200px] rounded"
                    style={{
                        background: "linear-gradient(to right, rgb(59,130,246), rgb(255,255,255), rgb(239,68,68))",
                    }}
                />
                <span>Similar</span>
            </div>
        </div>
    );
}
