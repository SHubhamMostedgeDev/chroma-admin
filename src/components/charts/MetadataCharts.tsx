import { useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from "recharts";

const PALETTE = [
    "#6c5ce7", "#00d68f", "#3ec2f7", "#ff4757", "#ffc048",
    "#a78bfa", "#f472b6", "#34d399", "#facc15", "#fb923c",
];

interface MetadataChartsProps {
    /** Array of metadata objects from the collection items */
    metadatas: (Record<string, unknown> | null)[];
}

interface ValueCount {
    name: string;
    count: number;
}

function getDistribution(
    metadatas: (Record<string, unknown> | null)[],
    key: string,
): ValueCount[] {
    const counts: Record<string, number> = {};
    for (const m of metadatas) {
        if (!m) continue;
        const v = m[key];
        if (v === undefined || v === null) continue;
        const label = String(v);
        counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 25); // top 25 values
}

function isNumeric(values: ValueCount[]): boolean {
    return values.length > 0 && values.every((v) => !isNaN(Number(v.name)));
}

export function MetadataCharts({ metadatas }: MetadataChartsProps) {
    const keys = useMemo(() => {
        const keySet = new Set<string>();
        for (const m of metadatas) {
            if (m) Object.keys(m).forEach((k) => keySet.add(k));
        }
        return Array.from(keySet).sort();
    }, [metadatas]);

    const [selectedKey, setSelectedKey] = useState<string>(keys[0] ?? "");
    const [chartType, setChartType] = useState<"bar" | "pie">("bar");

    const distribution = useMemo(
        () => (selectedKey ? getDistribution(metadatas, selectedKey) : []),
        [metadatas, selectedKey],
    );

    const numeric = useMemo(() => isNumeric(distribution), [distribution]);

    if (keys.length === 0) {
        return (
            <div
                className="flex items-center justify-center py-12 rounded-2xl text-sm"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-dim)",
                }}
            >
                No metadata keys found in the sampled items.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="text-xs px-3 py-2 rounded-xl outline-none cursor-pointer"
                    style={{
                        background: "var(--color-bg-input)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                    }}
                >
                    {keys.map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>

                <div
                    className="flex rounded-lg overflow-hidden text-xs"
                    style={{ border: "1px solid var(--color-border)" }}
                >
                    <button
                        onClick={() => setChartType("bar")}
                        className="px-3 py-1.5 cursor-pointer transition-colors"
                        style={{
                            background:
                                chartType === "bar"
                                    ? "var(--color-accent)"
                                    : "var(--color-bg-input)",
                            color: chartType === "bar" ? "#fff" : "var(--color-text-muted)",
                        }}
                    >
                        Bar
                    </button>
                    <button
                        onClick={() => setChartType("pie")}
                        className="px-3 py-1.5 cursor-pointer transition-colors"
                        style={{
                            background:
                                chartType === "pie"
                                    ? "var(--color-accent)"
                                    : "var(--color-bg-input)",
                            color: chartType === "pie" ? "#fff" : "var(--color-text-muted)",
                        }}
                    >
                        Pie
                    </button>
                </div>

                <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                    {distribution.length} unique value{distribution.length !== 1 && "s"}
                    {numeric && " (numeric)"}
                </span>
            </div>

            {/* Chart */}
            <div
                className="rounded-2xl p-4"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                {distribution.length === 0 ? (
                    <p
                        className="text-center text-sm py-8"
                        style={{ color: "var(--color-text-dim)" }}
                    >
                        No values for key &quot;{selectedKey}&quot;
                    </p>
                ) : chartType === "bar" ? (
                    <ResponsiveContainer width="100%" height={Math.max(220, distribution.length * 32)}>
                        <BarChart
                            data={distribution}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--color-border)"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                tick={{ fill: "var(--color-text-dim)", fontSize: 11 }}
                                axisLine={{ stroke: "var(--color-border)" }}
                                allowDecimals={false}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={120}
                                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                                axisLine={{ stroke: "var(--color-border)" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--color-bg-elevated)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    color: "var(--color-text)",
                                }}
                                formatter={(value: number) => [value, "Count"]}
                            />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                {distribution.map((_, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={PALETTE[idx % PALETTE.length]}
                                        fillOpacity={0.85}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={distribution}
                                dataKey="count"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={110}
                                innerRadius={55}
                                paddingAngle={2}
                                label={({ name, percent }) =>
                                    `${name} (${(percent * 100).toFixed(0)}%)`
                                }
                                labelLine={{ stroke: "var(--color-text-dim)" }}
                            >
                                {distribution.map((_, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={PALETTE[idx % PALETTE.length]}
                                        fillOpacity={0.9}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: "var(--color-bg-elevated)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    color: "var(--color-text)",
                                }}
                                formatter={(value: number) => [value, "Count"]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Legend for pie */}
            {chartType === "pie" && distribution.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {distribution.slice(0, 12).map((d, idx) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: PALETTE[idx % PALETTE.length] }}
                            />
                            <span style={{ color: "var(--color-text-muted)" }}>
                                {d.name}{" "}
                                <span style={{ color: "var(--color-text-dim)" }}>
                                    ({d.count})
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
