import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-8"
                    style={{ background: "var(--color-bg)" }}>
                    <div
                        className="max-w-lg w-full p-8 rounded-2xl text-center"
                        style={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border)",
                        }}
                    >
                        <div
                            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(255,71,87,0.12)" }}
                        >
                            <AlertTriangle size={28} style={{ color: "var(--color-error)" }} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">
                            Something went wrong
                        </h2>
                        <p
                            className="text-sm mb-6"
                            style={{ color: "var(--color-text-muted)" }}
                        >
                            {this.state.error?.message ?? "An unexpected error occurred."}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                            style={{
                                background: "var(--color-accent)",
                                color: "#fff",
                            }}
                        >
                            <RefreshCw size={16} /> Reload page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
