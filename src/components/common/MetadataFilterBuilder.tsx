import { Plus, X } from "lucide-react";

export interface MetadataFilter {
    _id: string;
    key: string;
    operator: string;
    value: string;
}

interface MetadataFilterBuilderProps {
    filters: MetadataFilter[];
    onChange: (filters: MetadataFilter[]) => void;
    availableKeys?: string[];
}

let _filterId = 0;
function nextFilterId(): string {
    return `mf-${++_filterId}-${Date.now()}`;
}

const OPERATORS = [
    { value: "$eq", label: "=" },
    { value: "$ne", label: "≠" },
    { value: "$gt", label: ">" },
    { value: "$gte", label: "≥" },
    { value: "$lt", label: "<" },
    { value: "$lte", label: "≤" },
    { value: "$in", label: "in" },
    { value: "$nin", label: "not in" },
];

export function buildWhereClause(
    filters: MetadataFilter[],
): Record<string, unknown> | undefined {
    const active = filters.filter(
        (f) => f.key.trim() && f.key !== "Select key…" && f.value.trim(),
    );
    if (active.length === 0) return undefined;

    const conditions = active.map((f) => {
        const parsedValue = parseFilterValue(f.value, f.operator);
        return { [f.key.trim()]: { [f.operator]: parsedValue } };
    });

    if (conditions.length === 1) return conditions[0]!;
    return { $and: conditions };
}

function parseFilterValue(val: string, operator: string): unknown {
    const trimmed = val.trim();

    // $in / $nin expect an array
    if (operator === "$in" || operator === "$nin") {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // Fall back: split by comma
        }
        return trimmed.split(",").map((s) => {
            const t = s.trim();
            const num = Number(t);
            return isNaN(num) ? t : num;
        });
    }

    // Try number
    const num = Number(trimmed);
    if (trimmed !== "" && !isNaN(num)) return num;

    // Try boolean
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;

    // Try JSON (for objects/arrays)
    try {
        return JSON.parse(trimmed);
    } catch {
        return trimmed;
    }
}

export function MetadataFilterBuilder({
    filters,
    onChange,
    availableKeys = [],
}: MetadataFilterBuilderProps) {
    const addFilter = () => {
        onChange([...filters, { _id: nextFilterId(), key: "", operator: "$eq", value: "" }]);
    };

    const removeFilter = (index: number) => {
        onChange(filters.filter((_, i) => i !== index));
    };

    const updateFilter = (index: number, field: keyof MetadataFilter, value: string) => {
        const updated = filters.map((f, i) =>
            i === index ? { ...f, [field]: value } : f,
        );
        onChange(updated);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Metadata Filters
                </label>
                <button
                    type="button"
                    onClick={addFilter}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg cursor-pointer transition-colors"
                    style={{
                        background: "var(--color-accent-glow)",
                        color: "var(--color-accent)",
                    }}
                >
                    <Plus size={12} /> Add Filter
                </button>
            </div>

            {filters.length === 0 && (
                <p className="text-xs py-2" style={{ color: "var(--color-text-dim)" }}>
                    No filters applied. Click "Add Filter" to filter by metadata.
                </p>
            )}

            {filters.map((filter, i) => (
                <div key={filter._id} className="flex items-center gap-2">
                    {/* Key */}
                    {availableKeys.length > 0 ? (
                        <select
                            value={filter.key}
                            onChange={(e) => updateFilter(i, "key", e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                            style={{
                                background: "var(--color-bg-input)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text)",
                            }}
                        >
                            <option value="">Select key…</option>
                            {availableKeys.map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            value={filter.key}
                            onChange={(e) => updateFilter(i, "key", e.target.value)}
                            placeholder="key"
                            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                            style={{
                                background: "var(--color-bg-input)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text)",
                            }}
                        />
                    )}

                    {/* Operator */}
                    <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(i, "operator", e.target.value)}
                        className="w-16 px-2 py-2 rounded-lg text-xs outline-none cursor-pointer text-center"
                        style={{
                            background: "var(--color-bg-input)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-accent)",
                        }}
                    >
                        {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>

                    {/* Value */}
                    <input
                        value={filter.value}
                        onChange={(e) => updateFilter(i, "value", e.target.value)}
                        placeholder="value"
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none font-mono"
                        style={{
                            background: "var(--color-bg-input)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                        }}
                    />

                    {/* Remove */}
                    <button
                        type="button"
                        onClick={() => removeFilter(i)}
                        className="p-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
                        style={{ color: "var(--color-error)" }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
