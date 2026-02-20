import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    Database,
    PlugZap,
    Layers,
    ChevronRight,
    Menu,
    X,
    Sun,
    Moon,
    Monitor,
    Server,
    FileText,
    GitCompare,
    Command,
} from "lucide-react";
import { useTheme } from "../../lib/themeContext";
import { useConnectionStatus } from "../../lib/connectionContext";

const NAV_ITEMS = [
    { to: "/connect", label: "Connect", icon: PlugZap },
    { to: "/collections", label: "Collections", icon: Layers },
    { to: "/server", label: "Server", icon: Server },
    { to: "/compare", label: "Compare", icon: GitCompare },
    { to: "/audit", label: "Audit Log", icon: FileText },
];

function ConnectionDot() {
    const { status } = useConnectionStatus();

    const colorMap = {
        connected: "var(--color-success)",
        disconnected: "var(--color-error)",
        checking: "var(--color-warning)",
    };

    const labelMap = {
        connected: "Connected",
        disconnected: "Disconnected",
        checking: "Checking…",
    };

    return (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <span
                className="relative flex h-2.5 w-2.5"
            >
                {status === "connected" && (
                    <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                            background: colorMap[status],
                            opacity: 0.4,
                            animationDuration: "2s",
                        }}
                    />
                )}
                <span
                    className="relative inline-flex rounded-full h-2.5 w-2.5"
                    style={{ background: colorMap[status] }}
                />
            </span>
            {labelMap[status]}
        </div>
    );
}

const THEME_CYCLE: ("dark" | "light" | "system")[] = ["dark", "light", "system"];
const THEME_ICONS = {
    dark: Moon,
    light: Sun,
    system: Monitor,
};
const THEME_LABELS = {
    dark: "Dark",
    light: "Light",
    system: "System",
};

export function AppLayout() {
    const location = useLocation();
    const { theme, setTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const cycleTheme = () => {
        const idx = THEME_CYCLE.indexOf(theme);
        setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!);
    };

    const ThemeIcon = THEME_ICONS[theme];

    const sidebarContent = (
        <>
            {/* Brand */}
            <div
                className="flex items-center gap-3 px-5 py-5 border-b"
                style={{ borderColor: "var(--color-border)" }}
            >
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                        background:
                            "linear-gradient(135deg, var(--color-accent), #a78bfa)",
                    }}
                >
                    <Database size={18} color="#fff" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-semibold leading-tight">
                        Chroma Admin
                    </h1>
                    <p
                        className="text-xs leading-tight"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        Database Explorer
                    </p>
                </div>
                {/* Mobile close */}
                <button
                    className="lg:hidden p-1 rounded-lg cursor-pointer"
                    onClick={() => setSidebarOpen(false)}
                    style={{ color: "var(--color-text-muted)" }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1 px-3 pt-4 flex-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                    const active = location.pathname.startsWith(to);
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                            style={{
                                background: active ? "var(--color-accent-glow)" : "transparent",
                                color: active
                                    ? "var(--color-accent-hover)"
                                    : "var(--color-text-muted)",
                            }}
                        >
                            <Icon size={18} />
                            <span className="flex-1">{label}</span>
                            {active && (
                                <ChevronRight
                                    size={14}
                                    style={{ color: "var(--color-accent)" }}
                                />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                className="px-5 py-4 border-t space-y-3"
                style={{ borderColor: "var(--color-border)" }}
            >
                <ConnectionDot />
                <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                        {THEME_LABELS[theme]} Theme
                    </span>
                    <button
                        onClick={cycleTheme}
                        className="p-1.5 rounded-lg cursor-pointer transition-colors"
                        style={{
                            background: "var(--color-bg-elevated)",
                            color: "var(--color-text-muted)",
                        }}
                        title={`Switch theme (current: ${THEME_LABELS[theme]})`}
                    >
                        <ThemeIcon size={14} />
                    </button>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--color-text-dim)" }}>
                    <Command size={10} />
                    <span>Ctrl+K for commands</span>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-screen overflow-hidden">
            {/* ── Mobile sidebar overlay ────────────── */}
            <div
                className={`sidebar-overlay lg:hidden ${sidebarOpen ? "visible" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ── Sidebar ────────────────────────────── */}
            <aside
                className={`
                    flex flex-col w-60 shrink-0 border-r
                    fixed lg:static inset-y-0 left-0 z-50
                    transform transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
                style={{
                    background: "var(--color-bg-card)",
                    borderColor: "var(--color-border)",
                }}
            >
                {sidebarContent}
            </aside>

            {/* ── Main ───────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile header */}
                <header
                    className="lg:hidden flex items-center gap-3 px-4 py-3 border-b shrink-0"
                    style={{
                        background: "var(--color-bg-card)",
                        borderColor: "var(--color-border)",
                    }}
                >
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 rounded-lg cursor-pointer"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2 flex-1">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
                            }}
                        >
                            <Database size={13} color="#fff" />
                        </div>
                        <span className="text-sm font-semibold">Chroma Admin</span>
                    </div>
                    <ConnectionDot />
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
