/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DEFAULT_CHROMA_URL?: string;
    readonly VITE_DEV_CHROMA_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
