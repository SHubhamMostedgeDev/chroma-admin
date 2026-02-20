import { z } from "zod";
import { getBaseUrl, getConnectionMode, getAuthHeaders } from "./storage";
import {
    HeartbeatSchema,
    VersionSchema,
    CollectionListSchema,
    CollectionSchema,
    CountSchema,
    GetItemsResponseSchema,
    QueryResponseSchema,
    type Collection,
    type GetItemsResponse,
    type QueryResponse,
    type Heartbeat,
} from "./zodSchemas";

// ── Error types ──────────────────────────────────────────────────────

export class ChromaError extends Error {
    status?: number;
    isCors: boolean;
    constructor(message: string, status?: number, isCors = false) {
        super(message);
        this.name = "ChromaError";
        this.status = status;
        this.isCors = isCors;
    }
}

// ── API version detection ────────────────────────────────────────────

type ApiVersion = "v2" | "v1";
let detectedApiVersion: ApiVersion | null = null;

const DEFAULT_TENANT = "default_tenant";
const DEFAULT_DATABASE = "default_database";

function apiPrefix(): string {
    const v = detectedApiVersion ?? "v2";
    if (v === "v2") {
        return `/api/v2/tenants/${DEFAULT_TENANT}/databases/${DEFAULT_DATABASE}`;
    }
    return "/api/v1";
}

function apiBase(): string {
    const v = detectedApiVersion ?? "v2";
    return `/api/${v}`;
}

// ── URL resolution ───────────────────────────────────────────────────

function resolveUrl(path: string): string {
    const mode = getConnectionMode();
    const base = getBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    if (mode === "proxy") {
        return `/api${cleanPath}`;
    }
    return `${base}${cleanPath}`;
}

// ── Core fetch wrapper ───────────────────────────────────────────────

const DEFAULT_TIMEOUT = 15_000;

async function chromaFetch<T>(
    path: string,
    schema: z.ZodType<T>,
    opts: RequestInit & { timeout?: number } = {},
): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT, ...fetchOpts } = opts;
    const url = resolveUrl(path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            ...fetchOpts,
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
                ...fetchOpts.headers,
            },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new ChromaError(
                `Chroma HTTP ${res.status}: ${text || res.statusText}`,
                res.status,
            );
        }

        const json: unknown = await res.json();
        return schema.parse(json);
    } catch (err) {
        if (err instanceof ChromaError) throw err;

        if (err instanceof z.ZodError) {
            throw new ChromaError(`Invalid response shape: ${err.message}`);
        }

        const e = err as Error;

        // Detect probable CORS
        if (
            e.name === "TypeError" &&
            (e.message.includes("Failed to fetch") ||
                e.message.includes("NetworkError") ||
                e.message.includes("Load failed"))
        ) {
            throw new ChromaError(
                "Network error – this is likely a CORS issue. " +
                "Make sure the Chroma server has CORS enabled or use the Vite dev proxy.",
                undefined,
                true,
            );
        }

        if (e.name === "AbortError") {
            throw new ChromaError(`Request timed out after ${timeout}ms`);
        }

        throw new ChromaError(e.message);
    } finally {
        clearTimeout(timer);
    }
}

// ── Capability detection ─────────────────────────────────────────────

export interface Capabilities {
    heartbeat: boolean;
    version: boolean;
    listCollections: boolean;
    getCollection: boolean;
    countCollection: boolean;
    getItems: boolean;
    query: boolean;
    apiVersion: string;
}

let cachedCapabilities: Capabilities | null = null;

export function getCachedCapabilities(): Capabilities | null {
    return cachedCapabilities;
}

async function probeUrl(path: string): Promise<boolean> {
    try {
        const url = resolveUrl(path);
        const res = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
            headers: { ...getAuthHeaders() },
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function detectCapabilities(): Promise<Capabilities> {
    // Try v2 heartbeat first, fall back to v1
    const v2ok = await probeUrl("/api/v2/heartbeat");
    if (v2ok) {
        detectedApiVersion = "v2";
    } else {
        const v1ok = await probeUrl("/api/v1/heartbeat");
        detectedApiVersion = v1ok ? "v1" : "v2";
    }

    const caps: Capabilities = {
        heartbeat: await probeUrl(`${apiBase()}/heartbeat`),
        version: await probeUrl(`${apiBase()}/version`),
        listCollections: await probeUrl(`${apiPrefix()}/collections`),
        getCollection: false,
        countCollection: false,
        getItems: false,
        query: false,
        apiVersion: detectedApiVersion,
    };

    if (caps.listCollections) {
        try {
            const collections = await listCollections();
            if (collections.length > 0) {
                const first = collections[0]!;
                caps.getCollection = await probeUrl(
                    `${apiPrefix()}/collections/${first.id}`,
                );
                caps.countCollection = await probeUrl(
                    `${apiPrefix()}/collections/${first.id}/count`,
                );
                caps.getItems = true;
                caps.query = true;
            } else {
                caps.getCollection = true;
                caps.countCollection = true;
                caps.getItems = true;
                caps.query = true;
            }
        } catch {
            // leave as false
        }
    }

    cachedCapabilities = caps;
    return caps;
}

// ── High-level API ───────────────────────────────────────────────────

export async function testConnection(): Promise<{
    heartbeat: Heartbeat;
    version: string;
}> {
    const start = Date.now();
    try {
        // Auto-detect API version
        const v2ok = await probeUrl("/api/v2/heartbeat");
        if (v2ok) {
            detectedApiVersion = "v2";
        } else {
            detectedApiVersion = "v1";
        }

        const heartbeat = await chromaFetch(`${apiBase()}/heartbeat`, HeartbeatSchema);
        const version = await chromaFetch(`${apiBase()}/version`, VersionSchema);
        return { heartbeat, version };
    } catch (err) {
        throw err;
    }
}

export async function listCollections(): Promise<Collection[]> {
    return chromaFetch(`${apiPrefix()}/collections`, CollectionListSchema);
}

export async function getCollection(name: string): Promise<Collection> {
    // v2 uses GET with query param, but also supports name-based lookup
    return chromaFetch(`${apiPrefix()}/collections/${encodeURIComponent(name)}`, CollectionSchema);
}

export async function getCollectionCount(collectionId: string): Promise<number> {
    return chromaFetch(`${apiPrefix()}/collections/${collectionId}/count`, CountSchema);
}

export async function getItems(
    collectionId: string,
    params: {
        limit?: number;
        offset?: number;
        include?: string[];
        where?: Record<string, unknown>;
        ids?: string[];
    } = {},
): Promise<GetItemsResponse> {
    const body: Record<string, unknown> = {};
    if (params.limit != null) body.limit = params.limit;
    if (params.offset != null) body.offset = params.offset;
    if (params.include) body.include = params.include;
    if (params.where) body.where = params.where;
    if (params.ids) body.ids = params.ids;

    return chromaFetch(
        `${apiPrefix()}/collections/${collectionId}/get`,
        GetItemsResponseSchema,
        {
            method: "POST",
            body: JSON.stringify(body),
        },
    );
}

export async function queryCollection(
    collectionId: string,
    params: {
        query_texts?: string[];
        query_embeddings?: number[][];
        n_results?: number;
        include?: string[];
        where?: Record<string, unknown>;
    },
): Promise<QueryResponse> {
    // ChromaDB v2 requires query_embeddings to always be present in the body
    const body = {
        query_embeddings: params.query_embeddings ?? [],
        ...(params.query_texts ? { query_texts: params.query_texts } : {}),
        n_results: params.n_results ?? 10,
        include: params.include ?? ["documents", "metadatas", "distances"],
        ...(params.where ? { where: params.where } : {}),
    };

    return chromaFetch(
        `${apiPrefix()}/collections/${collectionId}/query`,
        QueryResponseSchema,
        {
            method: "POST",
            body: JSON.stringify(body),
        },
    );
}

export async function deleteCollection(name: string): Promise<void> {
    const start = Date.now();
    try {
        const url = resolveUrl(`${apiPrefix()}/collections/${encodeURIComponent(name)}`);
        const res = await fetch(url, {
            method: "DELETE",
            headers: { ...getAuthHeaders() },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new ChromaError(`Delete failed: ${res.status} ${text}`, res.status);
        }
    } catch (err) {
        throw err;
    }
}

// ── Backup / Restore helpers ─────────────────────────────────────────

export async function getAllItems(
    collectionId: string,
    totalCount: number,
    onProgress?: (fetched: number) => void,
): Promise<GetItemsResponse> {
    const pageSize = 500;
    const allIds: string[] = [];
    const allDocs: (string | null)[] = [];
    const allMetas: (Record<string, unknown> | null)[] = [];
    const allEmbeddings: (number[] | null)[] = [];

    for (let offset = 0; offset < totalCount; offset += pageSize) {
        const page = await getItems(collectionId, {
            limit: pageSize,
            offset,
            include: ["documents", "metadatas", "embeddings"],
        });
        allIds.push(...page.ids);
        page.documents?.forEach((d) => allDocs.push(d));
        page.metadatas?.forEach((m) => allMetas.push(m));
        page.embeddings?.forEach((e) => allEmbeddings.push(e));
        onProgress?.(allIds.length);
    }

    return {
        ids: allIds,
        documents: allDocs.length > 0 ? allDocs : undefined,
        metadatas: allMetas.length > 0 ? allMetas : undefined,
        embeddings: allEmbeddings.length > 0 ? allEmbeddings : undefined,
    };
}

export async function addItems(
    collectionId: string,
    data: {
        ids: string[];
        documents?: (string | null)[];
        metadatas?: (Record<string, unknown> | null)[];
        embeddings?: (number[] | null)[];
    },
): Promise<void> {
    const body: Record<string, unknown> = { ids: data.ids };
    if (data.documents) body.documents = data.documents;
    if (data.metadatas) body.metadatas = data.metadatas;
    if (data.embeddings) body.embeddings = data.embeddings;

    const url = resolveUrl(`${apiPrefix()}/collections/${collectionId}/add`);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ChromaError(`Add items failed: ${res.status} ${text}`, res.status);
    }
}

export async function deleteItems(
    collectionId: string,
    ids: string[],
): Promise<void> {
    const url = resolveUrl(`${apiPrefix()}/collections/${collectionId}/delete`);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ChromaError(`Delete items failed: ${res.status} ${text}`, res.status);
    }
}

