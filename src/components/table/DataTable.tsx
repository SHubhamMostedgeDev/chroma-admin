import { useState, useMemo, useCallback } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
} from "@tanstack/react-table";
import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronsLeft,
    ChevronsRight,
    ChevronLeft,
    ChevronRight,
    Download,
    Trash2,
    CheckSquare,
} from "lucide-react";

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T, unknown>[];
    onRowClick?: (row: T) => void;
    pageSize?: number;
    enableSelection?: boolean;
    onBulkDelete?: (rows: T[]) => void;
    exportFilename?: string;
}

function exportToCSV<T>(data: T[], columns: ColumnDef<T, unknown>[], filename: string) {
    const headers = columns
        .filter((col) => col.id !== "select")
        .map((col) => {
            if (typeof col.header === "string") return col.header;
            return col.id ?? "";
        });

    const rows = data.map((row) =>
        columns
            .filter((col) => col.id !== "select")
            .map((col) => {
                const key = (col as { accessorKey?: string }).accessorKey ?? col.id ?? "";
                const val = (row as Record<string, unknown>)[key];
                if (val === null || val === undefined) return "";
                if (typeof val === "object") return JSON.stringify(val);
                return String(val);
            })
            .map((v) => `"${v.replace(/"/g, '""')}"`)
            .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToJSON<T>(data: T[], filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function DataTable<T>({
    data,
    columns: userColumns,
    onRowClick,
    pageSize = 20,
    enableSelection = false,
    onBulkDelete,
    exportFilename = "export",
}: DataTableProps<T>) {
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columns = useMemo(() => {
        if (!enableSelection) return userColumns;
        const selectCol: ColumnDef<T, unknown> = {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className="rounded cursor-pointer accent-[var(--color-accent)]"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded cursor-pointer accent-[var(--color-accent)]"
                />
            ),
            size: 32,
            enableSorting: false,
        };
        return [selectCol, ...userColumns];
    }, [enableSelection, userColumns]);

    const table = useReactTable({
        data,
        columns,
        state: { globalFilter, sorting, rowSelection },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: enableSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize } },
    });

    const pageCount = table.getPageCount();
    const pageIndex = table.getState().pagination.pageIndex;
    const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
    const hasSelection = selectedRows.length > 0;

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search bar */}
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--color-text-dim)" }}
                    />
                    <input
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                        style={{
                            background: "var(--color-bg-input)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                        }}
                        placeholder="Search all columns…"
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {hasSelection && onBulkDelete && (
                        <button
                            onClick={() => {
                                onBulkDelete(selectedRows);
                                setRowSelection({});
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                            style={{
                                background: "rgba(255,71,87,0.15)",
                                color: "var(--color-error)",
                                border: "1px solid rgba(255,71,87,0.3)",
                            }}
                        >
                            <Trash2 size={13} />
                            Delete {selectedRows.length}
                        </button>
                    )}

                    {hasSelection && (
                        <span
                            className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                            style={{
                                background: "var(--color-accent-glow)",
                                color: "var(--color-accent)",
                            }}
                        >
                            <CheckSquare size={12} />
                            {selectedRows.length} selected
                        </span>
                    )}

                    {/* Export dropdown */}
                    <div className="relative group">
                        <button
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                            style={{
                                background: "var(--color-bg-elevated)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-muted)",
                            }}
                        >
                            <Download size={13} />
                            Export
                        </button>
                        <div
                            className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-10 hidden group-hover:block min-w-[120px]"
                            style={{
                                background: "var(--color-bg-card)",
                                border: "1px solid var(--color-border)",
                                boxShadow: "var(--shadow-card)",
                            }}
                        >
                            <button
                                onClick={() => exportToCSV(hasSelection ? selectedRows : data, userColumns, exportFilename)}
                                className="w-full text-left px-3 py-2 text-xs cursor-pointer transition-colors"
                                style={{ color: "var(--color-text)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-elevated)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                📄 Export CSV
                            </button>
                            <button
                                onClick={() => exportToJSON(hasSelection ? selectedRows : data, exportFilename)}
                                className="w-full text-left px-3 py-2 text-xs cursor-pointer transition-colors"
                                style={{ color: "var(--color-text)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-elevated)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                📋 Export JSON
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-card)",
                }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr
                                    key={hg.id}
                                    style={{
                                        borderBottom: "1px solid var(--color-border)",
                                        background: "var(--color-bg-elevated)",
                                    }}
                                >
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                                            style={{
                                                color: "var(--color-text-muted)",
                                                width: header.column.columnDef.size
                                                    ? `${header.column.columnDef.size}px`
                                                    : undefined,
                                            }}
                                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                        >
                                            <div className="flex items-center gap-1">
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext(),
                                                )}
                                                {header.column.getIsSorted() === "asc" && (
                                                    <ChevronUp size={14} />
                                                )}
                                                {header.column.getIsSorted() === "desc" && (
                                                    <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-8 text-center"
                                        style={{ color: "var(--color-text-dim)" }}
                                    >
                                        No data to display
                                    </td>
                                </tr>
                            )}
                            {table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="transition-colors"
                                    style={{
                                        borderBottom: "1px solid var(--color-border)",
                                        cursor: onRowClick ? "pointer" : "default",
                                        background: row.getIsSelected()
                                            ? "var(--color-accent-glow)"
                                            : "transparent",
                                    }}
                                    onClick={() => onRowClick?.(row.original)}
                                    onMouseEnter={(e) => {
                                        if (!row.getIsSelected()) {
                                            e.currentTarget.style.background = "var(--color-bg-elevated)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = row.getIsSelected()
                                            ? "var(--color-accent-glow)"
                                            : "transparent";
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-3">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <span>
                        Page {pageIndex + 1} of {pageCount} · {table.getFilteredRowModel().rows.length} rows
                    </span>
                    <div className="flex items-center gap-1">
                        <PaginationBtn
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronsLeft size={14} />
                        </PaginationBtn>
                        <PaginationBtn
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft size={14} />
                        </PaginationBtn>
                        <PaginationBtn
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight size={14} />
                        </PaginationBtn>
                        <PaginationBtn
                            onClick={() => table.setPageIndex(pageCount - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronsRight size={14} />
                        </PaginationBtn>
                    </div>
                </div>
            )}
        </div>
    );
}

function PaginationBtn({
    children,
    onClick,
    disabled,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
            }}
        >
            {children}
        </button>
    );
}
