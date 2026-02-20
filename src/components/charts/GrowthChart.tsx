import { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { GrowthSnapshot } from "../../lib/growthTracker";

interface GrowthChartProps {
    snapshots: GrowthSnapshot[];
}

function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function GrowthChart({ snapshots }: GrowthChartProps) {
    const data = useMemo(
        () =>
            snapshots.map((s) => ({
                ...s,
                label: formatDate(s.timestamp),
            })),
        [snapshots],
    );

    if (data.length < 2) {
        return (
            <div
                className="flex flex-col items-center justify-center py-12 rounded-2xl text-sm"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-dim)",
                }}
            >
                <p className="font-medium mb-1">Not enough data yet</p>
                <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                    Growth tracking requires at least 2 snapshots. Visit this collection
                    again later to see the chart.
                </p>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl p-4"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
        >
            <h4
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--color-text)" }}
            >
                Item Count Over Time
            </h4>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--color-text-dim)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                        tick={{ fill: "var(--color-text-dim)", fontSize: 11 }}
                        axisLine={{ stroke: "var(--color-border)" }}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "12px",
                            fontSize: "12px",
                            color: "var(--color-text)",
                        }}
                        labelStyle={{ color: "var(--color-text-muted)" }}
                        formatter={(value: number) => [value.toLocaleString(), "Items"]}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#6c5ce7"
                        strokeWidth={2}
                        fill="url(#growthGrad)"
                        dot={{ fill: "#6c5ce7", r: 3 }}
                        activeDot={{ r: 5, fill: "#a78bfa" }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
