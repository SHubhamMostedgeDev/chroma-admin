# Chroma Admin

A browser-based admin UI for [ChromaDB](https://www.trychroma.com/) — connect **directly** from the browser to any Chroma HTTP server.  
No custom backend required.

![React 18](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-teal)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
#    Enter your Chroma server URL and hit "Test Connection"
```

## Build for Production

```bash
npm run build    # output in dist/
npm run preview  # preview production build
```

---

## Connection Modes

### Direct Mode (default)

The browser makes requests directly to the Chroma HTTP server.  
**Requires CORS** to be enabled on the Chroma server.

### Vite Dev Proxy (development only)

During development, Vite proxies `/api/*` requests to the Chroma server — no CORS needed.

Set the target URL in `.env`:

```env
VITE_DEV_CHROMA_URL=http://localhost:8000
```

Then select **"Dev Proxy"** mode on the Connect page.

> **Note:** The proxy only works during `npm run dev`. For production builds, use Direct Mode with CORS enabled.

---

## Environment Variables

| Variable                 | Description                                | Default                  |
| ------------------------ | ------------------------------------------ | ------------------------ |
| `VITE_DEFAULT_CHROMA_URL`| Pre-fill the URL on the Connect page       | `http://localhost:8000`  |
| `VITE_DEV_CHROMA_URL`   | Vite dev proxy target                       | `http://localhost:8000`  |

Create a `.env` file in the project root:

```env
VITE_DEFAULT_CHROMA_URL=http://localhost:8000
VITE_DEV_CHROMA_URL=http://localhost:8000
```

---

## CORS Troubleshooting

### 1. Enable CORS on ChromaDB

ChromaDB enables CORS for all origins by default. If restricted, set:

```bash
CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]' chroma run --host 0.0.0.0 --port 8000
```

### 2. Use a Reverse Proxy

Place nginx or Caddy in front of Chroma and add CORS headers:

```nginx
location / {
    proxy_pass http://localhost:8000;
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
}
```

### 3. Use the Vite Dev Proxy

For local development, the Vite dev proxy avoids CORS entirely.

### 4. Private Network

If Chroma is on a private network, the browser can't reach it directly. Options:
- Deploy chroma-admin on the same network
- Use SSH tunneling (`ssh -L 8000:chroma-host:8000 user@jump-box`)

---

## Features

- **Connect** — enter Chroma URL, test connection, detect capabilities
- **Collections** — list all collections with item counts
- **Browse** — paginated table with global search, column sorting, record detail drawer
- **Query** — run similarity queries with `where` filters
- **Visualize** — PCA 2D scatter plot of embeddings, color by metadata key
- **Settings** — view collection metadata, delete with confirmation

---

## Tech Stack

- React 18 + TypeScript + Vite
- TailwindCSS v4
- TanStack Query (data fetching)
- TanStack Table (data tables)
- React Hook Form + Zod (forms & validation)
- Recharts (charts)
- Lucide React (icons)

---

## License

MIT