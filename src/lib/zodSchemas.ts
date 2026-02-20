import { z } from "zod";

// ── Heartbeat / Version ──────────────────────────────────────────────

export const HeartbeatSchema = z.object({
    "nanosecond heartbeat": z.number().optional(),
}).passthrough();

export type Heartbeat = z.infer<typeof HeartbeatSchema>;

export const VersionSchema = z.string();

// ── Collection ───────────────────────────────────────────────────────

export const CollectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    metadata: z.record(z.unknown()).nullable().optional(),
    tenant: z.string().optional(),
    database: z.string().optional(),
});

export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionListSchema = z.array(CollectionSchema);

// ── Get Items (records) ──────────────────────────────────────────────

export const GetItemsResponseSchema = z.object({
    ids: z.array(z.string()),
    embeddings: z
        .array(z.array(z.number()).nullable())
        .nullable()
        .optional(),
    documents: z
        .array(z.string().nullable())
        .nullable()
        .optional(),
    metadatas: z
        .array(z.record(z.unknown()).nullable())
        .nullable()
        .optional(),
    uris: z
        .array(z.string().nullable())
        .nullable()
        .optional(),
});

export type GetItemsResponse = z.infer<typeof GetItemsResponseSchema>;

// ── Query ────────────────────────────────────────────────────────────

export const QueryResponseSchema = z.object({
    ids: z.array(z.array(z.string())),
    distances: z
        .array(z.array(z.number()).nullable())
        .nullable()
        .optional(),
    embeddings: z
        .array(z.array(z.array(z.number()).nullable()).nullable())
        .nullable()
        .optional(),
    documents: z
        .array(z.array(z.string().nullable()).nullable())
        .nullable()
        .optional(),
    metadatas: z
        .array(z.array(z.record(z.unknown()).nullable()).nullable())
        .nullable()
        .optional(),
});

export type QueryResponse = z.infer<typeof QueryResponseSchema>;

// ── Count ────────────────────────────────────────────────────────────

export const CountSchema = z.number();

// ── Pre-flight info (version endpoint) ───────────────────────────────

export const PreFlightSchema = z.string();
