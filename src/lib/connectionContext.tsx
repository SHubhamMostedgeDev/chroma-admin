import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { getBaseUrl, getConnectionMode, getAuthHeaders } from "./storage";

type ConnectionStatus = "connected" | "disconnected" | "checking";

interface ConnectionContextValue {
    status: ConnectionStatus;
    lastChecked: Date | null;
    checkNow: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue>({
    status: "disconnected",
    lastChecked: null,
    checkNow: () => { },
});

export function useConnectionStatus(): ConnectionContextValue {
    return useContext(ConnectionContext);
}

const POLL_INTERVAL = 15_000; // 15 seconds

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<ConnectionStatus>("checking");
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    const check = useCallback(async () => {
        setStatus("checking");
        try {
            const mode = getConnectionMode();
            const base = getBaseUrl();
            // Try v2 first, then v1
            const heartbeatPaths = ["/api/v2/heartbeat", "/api/v1/heartbeat"];
            let ok = false;

            for (const path of heartbeatPaths) {
                const url = mode === "proxy" ? `/api${path}` : `${base}${path}`;
                try {
                    const res = await fetch(url, {
                        signal: AbortSignal.timeout(5000),
                        headers: { ...getAuthHeaders() },
                    });
                    if (res.ok) {
                        ok = true;
                        break;
                    }
                } catch {
                    // try next
                }
            }

            setStatus(ok ? "connected" : "disconnected");
            setLastChecked(new Date());
        } catch {
            setStatus("disconnected");
            setLastChecked(new Date());
        }
    }, []);

    useEffect(() => {
        check();
        intervalRef.current = setInterval(check, POLL_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [check]);

    return (
        <ConnectionContext.Provider value={{ status, lastChecked, checkNow: check }}>
            {children}
        </ConnectionContext.Provider>
    );
}
