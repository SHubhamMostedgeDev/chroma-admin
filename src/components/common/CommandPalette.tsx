import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ArrowRight, Moon, Sun, Monitor, Layers, PlugZap, Server, FileText, GitCompare } from "lucide-react";
import { useTheme } from "../../lib/themeContext";

interface Command {
    id: string;
    label: string;
    category: string;
    icon: React.ReactNode;
    action: () => void;
    keywords?: string;
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, setTheme } = useTheme();

    // Keyboard shortcut: Ctrl+K or Cmd+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setOpen((o) => !o);
            }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const commands: Command[] = useMemo(
        () => [
            // Navigation
            {
                id: "nav-connect",
                label: "Go to Connect",
                category: "Navigation",
                icon: <PlugZap size={16} />,
                action: () => navigate("/connect"),
                keywords: "connection settings url",
            },
            {
                id: "nav-collections",
                label: "Go to Collections",
                category: "Navigation",
                icon: <Layers size={16} />,
                action: () => navigate("/collections"),
                keywords: "list browse",
            },
            {
                id: "nav-server",
                label: "Go to Server Info",
                category: "Navigation",
                icon: <Server size={16} />,
                action: () => navigate("/server"),
                keywords: "dashboard health version",
            },
            {
                id: "nav-compare",
                label: "Go to Compare Collections",
                category: "Navigation",
                icon: <GitCompare size={16} />,
                action: () => navigate("/compare"),
                keywords: "comparison cross collection",
            },
            // Theme
            {
                id: "theme-dark",
                label: "Switch to Dark Theme",
                category: "Theme",
                icon: <Moon size={16} />,
                action: () => setTheme("dark"),
                keywords: "dark mode night",
            },
            {
                id: "theme-light",
                label: "Switch to Light Theme",
                category: "Theme",
                icon: <Sun size={16} />,
                action: () => setTheme("light"),
                keywords: "light mode bright",
            },
            {
                id: "theme-system",
                label: "Switch to System Theme",
                category: "Theme",
                icon: <Monitor size={16} />,
                action: () => setTheme("system"),
                keywords: "system auto os",
            },
        ],
        [navigate, setTheme],
    );

    const filtered = useMemo(() => {
        if (!search.trim()) return commands;
        const q = search.toLowerCase();
        return commands.filter(
            (c) =>
                c.label.toLowerCase().includes(q) ||
                c.category.toLowerCase().includes(q) ||
                c.keywords?.toLowerCase().includes(q),
        );
    }, [commands, search]);

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [filtered.length]);

    const runCommand = (cmd: Command) => {
        cmd.action();
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && filtered[selectedIndex]) {
            runCommand(filtered[selectedIndex]);
        }
    };

    // Scroll selected into view
    useEffect(() => {
        const el = listRef.current?.children[selectedIndex] as HTMLElement;
        el?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    if (!open) return null;

    // Group by category
    const grouped: Record<string, Command[]> = {};
    for (const cmd of filtered) {
        if (!grouped[cmd.category]) grouped[cmd.category] = [];
        grouped[cmd.category]!.push(cmd);
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <div
                className="fixed left-1/2 z-50 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    top: "20%",
                    transform: "translateX(-50%)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                }}
            >
                {/* Search input */}
                <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                    <Search size={18} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command…"
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: "var(--color-text)" }}
                    />
                    <kbd
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-dim)",
                        }}
                    >
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    className="max-h-72 overflow-y-auto py-2"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {filtered.length === 0 && (
                        <p
                            className="text-center text-xs py-6"
                            style={{ color: "var(--color-text-dim)" }}
                        >
                            No commands found
                        </p>
                    )}
                    {Object.entries(grouped).map(([category, cmds]) => (
                        <div key={category}>
                            <p
                                className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider"
                                style={{ color: "var(--color-text-dim)" }}
                            >
                                {category}
                            </p>
                            {cmds.map((cmd) => {
                                const idx = filtered.indexOf(cmd);
                                const isSelected = idx === selectedIndex;
                                return (
                                    <button
                                        key={cmd.id}
                                        onClick={() => runCommand(cmd)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors"
                                        style={{
                                            background: isSelected
                                                ? "var(--color-accent-glow)"
                                                : "transparent",
                                            color: isSelected
                                                ? "var(--color-accent)"
                                                : "var(--color-text)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                color: isSelected
                                                    ? "var(--color-accent)"
                                                    : "var(--color-text-muted)",
                                            }}
                                        >
                                            {cmd.icon}
                                        </span>
                                        <span className="flex-1 text-left">{cmd.label}</span>
                                        <ArrowRight
                                            size={12}
                                            style={{
                                                opacity: isSelected ? 1 : 0,
                                                color: "var(--color-accent)",
                                            }}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div
                    className="flex items-center justify-between px-4 py-2 text-[10px]"
                    style={{
                        borderTop: "1px solid var(--color-border)",
                        color: "var(--color-text-dim)",
                    }}
                >
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>
                        <kbd className="font-mono">Ctrl</kbd>+<kbd className="font-mono">K</kbd> Toggle
                    </span>
                </div>
            </div>
        </>
    );
}
