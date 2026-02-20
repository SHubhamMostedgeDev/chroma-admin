const STORAGE_KEYS = {
    BASE_URL: "chroma-admin:baseUrl",
    CONNECTION_MODE: "chroma-admin:connectionMode",
    AUTH_TYPE: "chroma-admin:authType",
    AUTH_CREDENTIALS: "chroma-admin:authCredentials",
} as const;

export type ConnectionMode = "direct" | "proxy";
export type AuthType = "none" | "token" | "basic" | "x-chroma-token";

export interface AuthCredentials {
    token?: string;
    username?: string;
    password?: string;
}

// ── Connection ───────────────────────────────────────────────────────

export function getBaseUrl(): string {
    return (
        localStorage.getItem(STORAGE_KEYS.BASE_URL) ??
        import.meta.env.VITE_DEFAULT_CHROMA_URL ??
        "http://localhost:8000"
    );
}

export function setBaseUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.BASE_URL, url.replace(/\/+$/, ""));
}

export function getConnectionMode(): ConnectionMode {
    return (
        (localStorage.getItem(STORAGE_KEYS.CONNECTION_MODE) as ConnectionMode) ??
        "direct"
    );
}

export function setConnectionMode(mode: ConnectionMode): void {
    localStorage.setItem(STORAGE_KEYS.CONNECTION_MODE, mode);
}

// ── Authentication ───────────────────────────────────────────────────

export function getAuthType(): AuthType {
    return (localStorage.getItem(STORAGE_KEYS.AUTH_TYPE) as AuthType) ?? "none";
}

export function getAuthCredentials(): AuthCredentials {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.AUTH_CREDENTIALS);
        return raw ? (JSON.parse(raw) as AuthCredentials) : {};
    } catch {
        return {};
    }
}

export function setAuth(type: AuthType, credentials: AuthCredentials): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TYPE, type);
    localStorage.setItem(
        STORAGE_KEYS.AUTH_CREDENTIALS,
        JSON.stringify(credentials),
    );
}

export function clearAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TYPE);
    localStorage.removeItem(STORAGE_KEYS.AUTH_CREDENTIALS);
}

/**
 * Build HTTP headers for the configured auth type.
 */
export function getAuthHeaders(): Record<string, string> {
    const type = getAuthType();
    const creds = getAuthCredentials();

    switch (type) {
        case "token":
            return creds.token
                ? { Authorization: `Bearer ${creds.token}` }
                : {};
        case "basic": {
            if (!creds.username) return {};
            const encoded = btoa(`${creds.username}:${creds.password ?? ""}`);
            return { Authorization: `Basic ${encoded}` };
        }
        case "x-chroma-token":
            return creds.token
                ? { "X-Chroma-Token": creds.token }
                : {};
        default:
            return {};
    }
}

// ── Cleanup ──────────────────────────────────────────────────────────

export function clearConnection(): void {
    localStorage.removeItem(STORAGE_KEYS.BASE_URL);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_MODE);
    clearAuth();
}

// ── Server Profiles ──────────────────────────────────────────────────

const PROFILES_KEY = "chroma-admin:profiles";
const ACTIVE_PROFILE_KEY = "chroma-admin:activeProfile";

export interface ServerProfile {
    id: string;
    name: string;
    url: string;
    mode: ConnectionMode;
    authType: AuthType;
    authCredentials: AuthCredentials;
    createdAt: number;
}

export function getProfiles(): ServerProfile[] {
    try {
        const raw = localStorage.getItem(PROFILES_KEY);
        return raw ? (JSON.parse(raw) as ServerProfile[]) : [];
    } catch {
        return [];
    }
}

export function saveProfile(profile: Omit<ServerProfile, "id" | "createdAt">): ServerProfile {
    const profiles = getProfiles();
    const newProfile: ServerProfile = {
        ...profile,
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
    };
    profiles.push(newProfile);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    return newProfile;
}

export function deleteProfile(id: string): void {
    const profiles = getProfiles().filter((p) => p.id !== id);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    if (getActiveProfileId() === id) {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
}

export function getActiveProfileId(): string | null {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfile(id: string): void {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function applyProfile(profile: ServerProfile): void {
    setBaseUrl(profile.url);
    setConnectionMode(profile.mode);
    setAuth(profile.authType, profile.authCredentials);
    setActiveProfile(profile.id);
}

