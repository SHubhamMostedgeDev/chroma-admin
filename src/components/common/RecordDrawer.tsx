import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface RecordDrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function RecordDrawer({ open, onClose, title, children }: RecordDrawerProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (open) window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className="fixed top-0 right-0 z-50 h-full w-full max-w-lg shadow-2xl transition-transform duration-300 flex flex-col"
                style={{
                    transform: open ? "translateX(0)" : "translateX(100%)",
                    background: "var(--color-bg-card)",
                    borderLeft: "1px solid var(--color-border)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: "var(--color-border)" }}
                >
                    <h3 className="text-lg font-semibold truncate">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer"
                        style={{ color: "var(--color-text-muted)" }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </div>
        </>
    );
}
