import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: () => { },
});

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}

function getSystemTheme(): ResolvedTheme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function resolve(theme: Theme): ResolvedTheme {
    return theme === "system" ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem("chroma-admin:theme");
        if (saved === "dark" || saved === "light" || saved === "system") return saved;
        return "dark";
    });

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        resolve(theme),
    );

    // Apply theme to DOM
    useEffect(() => {
        const resolved = resolve(theme);
        setResolvedTheme(resolved);
        document.documentElement.setAttribute("data-theme", resolved);
    }, [theme]);

    // Listen for system theme changes when in "system" mode
    useEffect(() => {
        if (theme !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            const resolved = getSystemTheme();
            setResolvedTheme(resolved);
            document.documentElement.setAttribute("data-theme", resolved);
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    const setTheme = (t: Theme) => {
        setThemeState(t);
        localStorage.setItem("chroma-admin:theme", t);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
