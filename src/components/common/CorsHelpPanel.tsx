import { useState } from "react";
import { ShieldAlert, ChevronDown, ChevronUp, Globe, Server, Wifi } from "lucide-react";

export function CorsHelpPanel() {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
            }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer"
                style={{ color: "var(--color-warning)" }}
            >
                <ShieldAlert size={20} />
                <span className="flex-1 text-sm font-medium">
                    CORS / Network Troubleshooting
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {open && (
                <div
                    className="px-5 pb-5 space-y-4 text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    <HelpItem
                        icon={<Globe size={16} />}
                        title="Enable CORS on ChromaDB"
                    >
                        Start Chroma with CORS headers enabled:
                        <code className="block mt-2 p-3 rounded-lg text-xs" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
                            chroma run --host 0.0.0.0 --port 8000
                        </code>
                        <p className="mt-2">
                            ChromaDB enables CORS by default for all origins. If it's been
                            restricted, set{" "}
                            <code style={{ color: "var(--color-accent)" }}>
                                CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'
                            </code>
                        </p>
                    </HelpItem>

                    <HelpItem
                        icon={<Server size={16} />}
                        title="Use a Reverse Proxy (nginx)"
                    >
                        Place an nginx or Caddy reverse proxy in front of Chroma and
                        add CORS headers there. Example nginx location block:
                        <code className="block mt-2 p-3 rounded-lg text-xs" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
                            {`location / {
  proxy_pass http://localhost:8000;
  add_header Access-Control-Allow-Origin *;
  add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
  add_header Access-Control-Allow-Headers "Content-Type";
}`}
                        </code>
                    </HelpItem>

                    <HelpItem
                        icon={<Server size={16} />}
                        title="Use the Vite Dev Proxy (dev only)"
                    >
                        Set <code style={{ color: "var(--color-accent)" }}>VITE_DEV_CHROMA_URL</code>{" "}
                        and switch to <strong>"Proxy mode"</strong> on the Connect page.
                        This avoids CORS entirely during development.
                    </HelpItem>

                    <HelpItem
                        icon={<Wifi size={16} />}
                        title="Private Network Limitations"
                    >
                        If Chroma is on a private network (e.g., VPN, internal IP), the
                        browser may block requests entirely. Deploy this admin app on the
                        same network or use SSH tunneling.
                    </HelpItem>
                </div>
            )}
        </div>
    );
}

function HelpItem({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="p-4 rounded-xl"
            style={{ background: "var(--color-bg-elevated)" }}
        >
            <div className="flex items-center gap-2 mb-2 font-medium" style={{ color: "var(--color-text)" }}>
                {icon}
                {title}
            </div>
            <div className="leading-relaxed">{children}</div>
        </div>
    );
}
