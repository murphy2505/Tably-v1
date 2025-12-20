# Tably v1 — Step 1 Backbone

Single-tenant backbone using DEFAULT_TENANT_ID. Monorepo with API and DB.

## Setup

```bash
# 1) Install deps
npm install

# 2) Start Postgres
npm run db:up

# 3) Generate Prisma client
npm run prisma:generate

# 4) Apply migration
npm run db:migrate

# 5) Seed demo data
npm run db:seed

# 6) Start API (port 4002)
npm run dev

# 7) Start Web (port 5173)
npm run dev:web
```

### Dev Servers
- API runs on `:4002`; Web runs on `:5173`.
- Run only one instance of each. Avoid duplicate `npm run dev` processes.
- If ports are busy or you see exit code 130, stop all Node processes and restart:

```bash
# macOS examples
pkill -f "node.*4002" || true
pkill -f "vite" || true

# Re-generate Prisma client from shared schema
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Start API only and verify
npm run dev
curl -s http://localhost:4002/ready | jq
```

Copy `.env.example` to `.env` and adjust if needed. Step 1 is single-tenant via `DEFAULT_TENANT_ID`.

## Checks (PORT=4002)
Use these curl checks. Expect 200 responses without 404/500.

```bash
# 1) GET revenue-groups
curl -s http://localhost:4002/core/catalog/revenue-groups | jq

# 2) POST revenue-groups
curl -s -X POST http://localhost:4002/core/catalog/revenue-groups \
  -H 'Content-Type: application/json' \
  -d '{"name":"Nieuw RG","sortOrder":10,"isActive":true}' | jq

# 3) GET product-groups
curl -s http://localhost:4002/core/catalog/product-groups | jq

# 4) GET products
curl -s http://localhost:4002/core/catalog/products | jq

# 5) GET menus
curl -s http://localhost:4002/core/menu/menus | jq

# 6) GET active-pos-menu
curl -s http://localhost:4002/core/menu/active-pos-menu | jq

# 7) POST product (minimale velden)
curl -s -X POST http://localhost:4002/core/catalog/products \
  -H 'Content-Type: application/json' \
  -d '{"productGroupId":"REPLACE_WITH_PRODUCT_GROUP_ID","name":"Test Product","basePriceCents":500,"vatRateBps":900}' | jq

# 8) GET variants?productId=...
curl -s "http://localhost:4002/core/catalog/variants?productId=REPLACE_WITH_PRODUCT_ID" | jq
```

Replace IDs using data from previous list endpoints.

## If You See Drift
If Prisma reports drift or missing applied migrations:

```bash
npm run db:reset
npm run db:migrate
npm run db:seed
```

Keep `packages/db/prisma/migrations` committed in git to avoid drift.

## Optional Tenant Override (Testing)
You can override the tenant per request using the `x-tenant-id` header. If omitted, `DEFAULT_TENANT_ID` is used.

Example:
```bash
curl -s http://localhost:4002/core/catalog/revenue-groups \
  -H 'x-tenant-id: cafetaria-centrum' | jq
```

Note: Using `x-tenant-id` automatically creates the tenant on first request.

Create data under a custom tenant:
```bash
curl -s -X POST http://localhost:4002/core/catalog/revenue-groups \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: test-tenant' \
  -d '{"name":"Test RG","sortOrder":1,"isActive":true}' | jq
```

## POS Contract (active-pos-menu DTO)
## Web
- URL: http://localhost:5173
- The web app fetches `/core/menu/active-pos-menu` and renders a grid of tiles.
- Configure API base via `VITE_API_URL` (defaults to `http://localhost:4002`).

### iPad Printing via LAN
- Open POS on iPad Safari at `http://192.168.2.12:5173` (replace with your Mac's LAN IP).
- Vite dev server proxies `"/api"` to the local backend at `http://127.0.0.1:4002`.
- Backend listens on `0.0.0.0` and CORS allows `http://localhost:5173` and `http://192.168.2.12:5173` with common methods/headers.
- Frontend uses relative paths (`/api/...`) so requests work from iPad.
- Quick test: press the print test button in Settings → Printers or run:

```bash
curl -sS -X POST http://192.168.2.12:5173/api/print/test \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expect `{ ok: true }` and a printed test receipt.

Quick API check used by web:
```bash
curl -s http://localhost:4002/core/menu/active-pos-menu | jq
```
The `/core/menu/active-pos-menu` endpoint returns a minimal DTO for POS:

```json
{
  "data": {
    "id": "...",
    "name": "Kassa basis",
    "slug": "kassa-basis",
    "channel": "BOTH",
    "layoutType": "GRID",
    "columns": 4,
    "items": [
      {
        "id": "...",
        "sortOrder": 1,
        "priceCents": 250,
        "product": { "id": "...", "name": "Friet", "description": "Heerlijke friet", "imageUrl": null, "vatRateBps": 900, "allergenTags": null },
        "variant": { "id": "...", "name": "Klein" },
        "course": { "id": "...", "name": "Snacks", "shortLabel": "Snacks" }
      }
    ]
  }
}
```
