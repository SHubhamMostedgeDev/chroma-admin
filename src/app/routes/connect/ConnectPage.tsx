import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
    PlugZap,
    CheckCircle2,
    XCircle,
    Loader2,
    Radio,
    Server,
    Shield,
    Key,
    Lock,
    User,
} from "lucide-react";
import {
    getBaseUrl,
    setBaseUrl,
    getConnectionMode,
    setConnectionMode,
    getAuthType,
    setAuth,
    getAuthCredentials,
    type ConnectionMode,
    type AuthType,
} from "../../../lib/storage";
import {
    testConnection,
    detectCapabilities,
    type Capabilities,
} from "../../../lib/chromaClient";
import { CorsHelpPanel } from "../../../components/common/CorsHelpPanel";

const ConnectFormSchema = z.object({
    baseUrl: z.string().url("Enter a valid URL"),
});
type ConnectForm = z.infer<typeof ConnectFormSchema>;

type TestState =
    | { status: "idle" }
    | { status: "loading" }
    | {
        status: "success";
        version: string;
        capabilities: Capabilities;
    }
    | { status: "error"; message: string; isCors: boolean };

export function ConnectPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<ConnectionMode>(getConnectionMode());
    const [testState, setTestState] = useState<TestState>({ status: "idle" });

    // Auth state
    const savedCreds = getAuthCredentials();
    const [authType, setAuthType] = useState<AuthType>(getAuthType());
    const [authToken, setAuthToken] = useState(savedCreds.token ?? "");
    const [authUsername, setAuthUsername] = useState(savedCreds.username ?? "");
    const [authPassword, setAuthPassword] = useState(savedCreds.password ?? "");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ConnectForm>({
        resolver: zodResolver(ConnectFormSchema),
        defaultValues: { baseUrl: getBaseUrl() },
    });

    const onSubmit = async (data: ConnectForm) => {
        setBaseUrl(data.baseUrl);
        setConnectionMode(mode);

        // Persist auth settings
        if (authType === "none") {
            setAuth("none", {});
        } else if (authType === "token") {
            setAuth("token", { token: authToken });
        } else if (authType === "basic") {
            setAuth("basic", { username: authUsername, password: authPassword });
        } else if (authType === "x-chroma-token") {
            setAuth("x-chroma-token", { token: authToken });
        }

        setTestState({ status: "loading" });

        try {
            const { version } = await testConnection();
            const capabilities = await detectCapabilities();
            setTestState({ status: "success", version, capabilities });
            toast.success("Connected to ChromaDB!");
        } catch (err) {
            const e = err as { message: string; isCors?: boolean };
            setTestState({
                status: "error",
                message: e.message,
                isCors: !!e.isCors,
            });
            toast.error("Connection failed");
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Title */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, var(--color-accent), #a78bfa)",
                        }}
                    >
                        <PlugZap size={20} color="#fff" />
                    </div>
                    Connect to ChromaDB
                </h1>
                <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Enter the HTTP URL of your Chroma server. The connection is made
                    directly from your browser.
                </p>
            </div>

            {/* Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5 p-6 rounded-2xl"
                style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                }}
            >
                {/* URL input */}
                <div>
                    <label className="block text-sm font-medium mb-1.5">
                        Chroma Base URL
                    </label>
                    <input
                        {...register("baseUrl")}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                        style={{
                            background: "var(--color-bg-input)",
                            border: errors.baseUrl
                                ? "1px solid var(--color-error)"
                                : "1px solid var(--color-border)",
                            color: "var(--color-text)",
                        }}
                        placeholder="http://localhost:8000"
                    />
                    {errors.baseUrl && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>
                            {errors.baseUrl.message}
                        </p>
                    )}
                </div>

                {/* Mode toggle */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Connection Mode
                    </label>
                    <div className="flex gap-3">
                        <ModeCard
                            active={mode === "direct"}
                            onClick={() => setMode("direct")}
                            icon={<Radio size={18} />}
                            title="Direct Mode"
                            desc="Browser connects directly (requires CORS)"
                        />
                        <ModeCard
                            active={mode === "proxy"}
                            onClick={() => setMode("proxy")}
                            icon={<Server size={18} />}
                            title="Dev Proxy"
                            desc="Vite proxies requests (dev only)"
                        />
                    </div>
                </div>

                {/* ── Authentication ─────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Shield size={15} /> Authentication
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <AuthTypeCard
                            active={authType === "none"}
                            onClick={() => setAuthType("none")}
                            label="None"
                            icon={<XCircle size={14} />}
                        />
                        <AuthTypeCard
                            active={authType === "token"}
                            onClick={() => setAuthType("token")}
                            label="Bearer"
                            icon={<Key size={14} />}
                        />
                        <AuthTypeCard
                            active={authType === "basic"}
                            onClick={() => setAuthType("basic")}
                            label="Basic Auth"
                            icon={<User size={14} />}
                        />
                        <AuthTypeCard
                            active={authType === "x-chroma-token"}
                            onClick={() => setAuthType("x-chroma-token")}
                            label="X-Chroma"
                            icon={<Lock size={14} />}
                        />
                    </div>

                    {/* Credential fields */}
                    {(authType === "token" || authType === "x-chroma-token") && (
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                                {authType === "token" ? "Bearer Token" : "X-Chroma-Token"}
                            </label>
                            <input
                                type="password"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
                                style={{
                                    background: "var(--color-bg-input)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text)",
                                }}
                                placeholder="Enter token…"
                            />
                        </div>
                    )}

                    {authType === "basic" && (
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={authUsername}
                                    onChange={(e) => setAuthUsername(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                                    style={{
                                        background: "var(--color-bg-input)",
                                        border: "1px solid var(--color-border)",
                                        color: "var(--color-text)",
                                    }}
                                    placeholder="admin"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                                    style={{
                                        background: "var(--color-bg-input)",
                                        border: "1px solid var(--color-border)",
                                        color: "var(--color-text)",
                                    }}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    )}

                    {authType !== "none" && (
                        <p className="text-xs mt-2" style={{ color: "var(--color-text-dim)" }}>
                            {authType === "token" && "Sent as: Authorization: Bearer <token>"}
                            {authType === "basic" && "Sent as: Authorization: Basic <base64(user:pass)>"}
                            {authType === "x-chroma-token" && "Sent as: X-Chroma-Token: <token>"}
                        </p>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={testState.status === "loading"}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    style={{
                        background: "var(--color-accent)",
                        color: "#fff",
                    }}
                >
                    {testState.status === "loading" ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <PlugZap size={16} />
                    )}
                    Test Connection
                </button>
            </form>

            {/* Results */}
            {testState.status === "success" && (
                <div
                    className="p-5 rounded-2xl space-y-3"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid rgba(0,214,143,0.3)",
                    }}
                >
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                        <CheckCircle2 size={18} /> Connected
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                        Version: <span style={{ color: "var(--color-text)" }}>{testState.version}</span>
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                        {Object.entries(testState.capabilities).map(([key, ok]) => (
                            <div
                                key={key}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                                style={{
                                    background: ok
                                        ? "rgba(0,214,143,0.08)"
                                        : "rgba(255,71,87,0.08)",
                                    color: ok
                                        ? "var(--color-success)"
                                        : "var(--color-error)",
                                }}
                            >
                                {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {key}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate("/collections")}
                        className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                        style={{
                            background: "var(--color-accent)",
                            color: "#fff",
                        }}
                    >
                        Browse Collections →
                    </button>
                </div>
            )}

            {testState.status === "error" && (
                <div
                    className="p-5 rounded-2xl space-y-3"
                    style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid rgba(255,71,87,0.3)",
                    }}
                >
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-error)" }}>
                        <XCircle size={18} /> Connection Failed
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {testState.message}
                    </p>
                </div>
            )}

            {/* CORS help */}
            {(testState.status === "error" && testState.isCors) ||
                testState.status === "idle" ? (
                <CorsHelpPanel />
            ) : null}
        </div>
    );
}

/* ── Mode card ─────────────────────────────────────────────────────── */

function ModeCard({
    active,
    onClick,
    icon,
    title,
    desc,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    desc: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex-1 p-4 rounded-xl text-left transition-all cursor-pointer"
            style={{
                background: active ? "var(--color-accent-glow)" : "var(--color-bg-input)",
                border: active
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                color: active ? "var(--color-accent-hover)" : "var(--color-text-muted)",
            }}
        >
            <div className="flex items-center gap-2 mb-1 font-medium text-sm">
                {icon}
                {title}
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                {desc}
            </p>
        </button>
    );
}

/* ── Auth type card ──────────────────────────────────────────────────── */

function AuthTypeCard({
    active,
    onClick,
    label,
    icon,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
            style={{
                background: active ? "var(--color-accent-glow)" : "var(--color-bg-input)",
                border: active
                    ? "1px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                color: active ? "var(--color-accent-hover)" : "var(--color-text-muted)",
            }}
        >
            {icon}
            {label}
        </button>
    );
}
