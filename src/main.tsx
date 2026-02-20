import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider } from "./lib/themeContext";
import { ConnectionStatusProvider } from "./lib/connectionContext";
import { CommandPalette } from "./components/common/CommandPalette";
import { ConnectPage } from "./app/routes/connect/ConnectPage";
import { CollectionsPage } from "./app/routes/collections/CollectionsPage";
import { CollectionPage } from "./app/routes/collection/CollectionPage";
import { ServerPage } from "./app/routes/server/ServerPage";
import { AuditLogPage } from "./app/routes/audit/AuditLogPage";
import { ComparePage } from "./app/routes/compare/ComparePage";
import "./index.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <ConnectionStatusProvider>
                    <QueryClientProvider client={queryClient}>
                        <BrowserRouter>
                            <CommandPalette />
                            <Routes>
                                <Route path="/" element={<AppLayout />}>
                                    <Route index element={<Navigate to="/connect" replace />} />
                                    <Route path="connect" element={<ConnectPage />} />
                                    <Route path="collections" element={<CollectionsPage />} />
                                    <Route path="collections/:name" element={<CollectionPage />} />
                                    <Route path="server" element={<ServerPage />} />
                                    <Route path="compare" element={<ComparePage />} />
                                </Route>
                            </Routes>
                        </BrowserRouter>
                        <Toaster
                            position="bottom-right"
                            toastOptions={{
                                style: {
                                    background: "var(--color-bg-elevated)",
                                    color: "var(--color-text)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    fontSize: "14px",
                                },
                            }}
                        />
                    </QueryClientProvider>
                </ConnectionStatusProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </React.StrictMode>,
);
