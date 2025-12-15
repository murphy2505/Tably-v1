# STATUS — Catalog / Assortiment (Tably-v1)
Datum: 2025-12-15

## 1) Overzicht modules
- apps/api: routes + controllers voor catalog (`/core/catalog/*`)
- apps/web: ProductsPage routes (`/products`, `/assortiment/products`)
- packages/db: Prisma schema met modellen voor Tenant, RevenueGroup, VatRate, ProductGroup, Category, Product, ProductVariant, Menu, Course, MenuItem

## 2) Huidige datamodellen (Prisma)
(Relevante velden/relaties die nu gebruikt worden — zie `packages/db/prisma/schema.prisma`)

- RevenueGroup
  - Velden: `id`, `tenantId`, `name`, `code?`, `sortOrder`, `isActive`, timestamps
  - Relaties: `tenant`, `productGroups[]`, `categories[]`, `products[]`

- ProductGroup
  - Velden: `id`, `tenantId`, `name`, `code?`, `sortOrder`, `isActive`, timestamps
  - Defaults/relaties: `revenueGroupId? -> RevenueGroup`, `vatRateId? -> VatRate`, `products[]`

- Category
  - Velden: `id`, `tenantId`, `name`, `sortOrder`, `isActive`
  - Defaults/relaties: `defaultRevenueGroupId? -> RevenueGroup`, `defaultVatRateId? -> VatRate`, `products[]`

- Product (BELANGRIJK)
  - Velden: `id`, `tenantId`, `productGroupId` (required), `categoryId` (required)
  - Overrides: `revenueGroupId?`, `vatRateId?` (foreign key naar `VatRate`)
  - Data: `name`, `description?`, `basePriceCents`, `imageUrl?`, `allergenTags?`, `isActive`, timestamps
  - Relaties: `productGroup`, `category`, `revenueGroup?`, `vatRate?`, `variants[]`, `menuItems[]`
  - Expliciet: Product heeft GEEN `vatRateBps` (eerder error). Product gebruikt `vatRateId` als BTW-koppeling.

- ProductVariant
  - Velden: `id`, `tenantId`, `productId`, `name`, `sortOrder`, `isActive`
  - Relaties: `product`, `menuItems[]`

- Opmerking: ProductGroup heeft nu `vatRateId` (relatie naar `VatRate`). In de HTTP API voor product-groups wordt nog gewerkt met een `vatRate`-veld (enum/relatie), dit is inconsistent/parallel — later eenduidige keuze maken.

## 3) API Endpoints (apps/api)
Alle endpoints onder `/core/catalog`. Header: `x-tenant-id` verplicht (afgevangen via `getTenantIdFromRequest`).

| Method | Path                             | Query params                                      | Request body (create/update)                                                                 | Response |
|-------:|----------------------------------|---------------------------------------------------|-----------------------------------------------------------------------------------------------|----------|
| GET    | `/revenue-groups`                | `isActive=true|false`, `orderBy=sortOrder|name`, `order=asc|desc` | —                                                                                             | `{ data: RevenueGroup[] }` |
| POST   | `/revenue-groups`                | —                                                 | `{ name, sortOrder?, isActive? }`                                                             | `{ data: RevenueGroup }` |
| PUT    | `/revenue-groups/:id`            | —                                                 | Partials van bovenstaande                                                                     | `{ data: RevenueGroup }` |
| DELETE | `/revenue-groups/:id`            | —                                                 | —                                                                                             | `{ data: RevenueGroup }` |
| GET    | `/product-groups`                | `isActive=true|false`, `orderBy=sortOrder|name`, `order=asc|desc` | —                                                                                             | `{ data: {id,name,code,vatRate,isActive}[] }` |
| POST   | `/product-groups`                | —                                                 | `name` (verplicht), `code?` (uppercase), `vatRate` (enum: HIGH|LOW|ZERO), `revenueGroupId?`, `sortOrder?`, `isActive?` | `{ data: ProductGroup }` |
| PUT    | `/product-groups/:id`            | —                                                 | Partials van bovenstaande                                                                     | `{ data: ProductGroup }` |
| DELETE | `/product-groups/:id`            | —                                                 | — (409 als er gekoppelde producten zijn)                                                      | `{ data: ProductGroup }` |
| GET    | `/categories`                    | `isActive=true|false`, `orderBy=sortOrder|name`, `order=asc|desc` | —                                                                                             | `{ data: Category[] }` |
| POST   | `/categories`                    | —                                                 | `{ name, sortOrder?, isActive? }`                                                             | `{ data: Category }` |
| PUT    | `/categories/:id`                | —                                                 | Partials van bovenstaande                                                                     | `{ data: Category }` |
| DELETE | `/categories/:id`                | —                                                 | — (409 als er gekoppelde producten zijn)                                                      | `{ data: Category }` |
| GET    | `/products`                      | `isActive=true|false`, `orderBy=name|createdAt`, `order=asc|desc` | —                                                                                             | `{ data: Product[] (incl. productGroup{id,name,code}, category{id,name}) }` |
| GET    | `/products/:id`                  | —                                                 | —                                                                                             | `{ data: Product (incl. productGroup, category, variants sorted asc) }` |
| POST   | `/products`                      | —                                                 | Zod schema (huidig): `{ productGroupId, categoryId?, name, description?, basePriceCents, vatRateBps, imageUrl?, allergenTags?, isActive? }` | `{ data: Product }` |
| PUT    | `/products/:id`                  | —                                                 | Partials van bovenstaande                                                                     | `{ data: Product }` |
| GET    | `/variants`                      | `productId?`, `isActive=true|false`, `orderBy=sortOrder|name`, `order=asc|desc` | —                                                                                             | `{ data: ProductVariant[] }` |
| POST   | `/variants`                      | —                                                 | `{ productId, name, priceOverrideCents?, sortOrder?, isActive? }`                             | `{ data: ProductVariant }` |
| PUT    | `/variants/:id`                  | —                                                 | Partials van bovenstaande                                                                     | `{ data: ProductVariant }` |
| DELETE | `/variants/:id`                  | —                                                 | —                                                                                             | `{ data: ProductVariant }` |

Belangrijke notities (actuele code):
- Controllers gebruiken `vatRateId` voor Product (create/update), maar Zod `productCreateSchema`/`productUpdateSchema` in `schema.ts` eist nog `vatRateBps`. Dit veroorzaakt validatie-fouten bij POST/PUT products als de client `vatRateId` stuurt. (Router valideert vóór de controller.)
- `listProducts` en `getProduct` includen veilige velden (`productGroup {id,name,code}`, `category {id,name}`) na recente fix om legacy velden te vermijden.
- Variants-handlers gebruiken nu correct `getTenantIdFromRequest(req)` i.p.v. een niet-bestaande `getTenantId()`.

## 4) Web UI (apps/web)
- ProductsPage: `apps/web/src/pages/ProductsPage.tsx`
- Routes die hiernaar wijzen: `/products` en `/assortiment/products` (zie `apps/web/src/main.tsx`)
- Gebruikte API-modules:
  - `apps/web/src/api/pos/products.ts` (list/create/update/delete)
  - `apps/web/src/api/pos/categories.ts` (list/create/update/delete)
  - `apps/web/src/api/pos/product-groups.ts` (list; DTO bevat `vatRate` enum — legacy/parallel)
- Modal velden (nu): `name`, `basePriceCents` (EUR invoer naar cents), `productGroupId`, `categoryId`, `isActive`, `vatRateId` (placeholder dropdown; stuurt `null` als onbekend)
- Bekende fixes die doorgevoerd zijn:
  - Frontend/Backend afgestemd op `vatRateId` (frontend stuurt `vatRateId`, controller accepteert dit). Zod-schema nog niet bijgewerkt (zie waarschuwing hieronder).
  - 500 op products list door legacy select verholpen in controller.
  - Routing: dubbele/alternatieve route naar ProductsPage werkt nu (`/products` en `/assortiment/products`).
  - Variants: tenant-ID ophalen gefikst in controller.

⚠️ Mismatch nu: Frontend stuurt `vatRateId`, maar Zod validatie in `apps/api/src/modules/catalog/schema.ts` verwacht `vatRateBps`. Hierdoor zullen POST/PUT products via API-validatie falen tenzij `vatRateBps` wordt meegeleverd (wat de frontend niet meer doet).

## 5) BTW / Omzetgroep / Productgroep — waarheid & keuze
- Huidige stand:
  - Product gebruikt `vatRateId` (FK naar `VatRate`) voor BTW-koppeling.
  - ProductGroup heeft `vatRateId` in Prisma (relatie naar `VatRate`), maar HTTP API en web-DTO hanteren nog een `vatRate` enum/relatie; dit is inconsistent.
- Botsing: Wanneer ProductGroup een eigen BTW-veld heeft en Product ook, moet worden bepaald welke bron leidend is en wanneer overrides gelden.
- Opties:
  - A) BTW altijd op Product (via `vatRateId`); ProductGroup heeft geen BTW meer (verwijderen/ignoreren).
  - B) BTW default op ProductGroup; Product erft standaard; Product kan override via `vatRateId` hebben.
- Advies: Kies één route na stabilisatie. Optie B geeft een nette default/override-structuur, maar vergt duidelijke resolutieregels in API en consistente validatie.

## 6) Wat werkt nu (checklist)
- ✅ categories CRUD (endpoints aanwezig, controller + validatie OK)
- ✅ productGroups CRUD (endpoints aanwezig, controller + validatie OK; let op: veld `vatRate` is enum/relatie in API, schema heeft `vatRateId`)
- ✅ revenueGroups CRUD
- ✅ products list (inclusief category & productGroup informatie)
- ⚠️ products create/update/delete (controller OK met `vatRateId`; Zod-validatie verwacht nog `vatRateBps` → mismatch)
- ✅ productGroups dropdown in modal (gebruikt list endpoint)
- ✅ variants endpoints (bug met tenant-ID gefixt; geen UI)
- ✅ tenant isolation (vereist `x-tenant-id`, enforced via middleware en queries)

## 7) Next steps (roadmap)
1) Harmoniseer validatie voor Product: wijzig Zod-schema naar `vatRateId?: string|null` en maak `productGroupId`/`categoryId` verplicht conform Prisma.
2) Seed VatRate-tabel met `LOW (9%)` en `HIGH (21%)` en toon echte lijst in UI (ipv placeholder).
3) Kies BTW-strategie: A) enkel op Product, of B) default op ProductGroup + override op Product. Pas API/DTOs daarop aan.
4) Pas `product-groups` API/DTO aan naar `vatRateId` (weg van enum), of verwijder BTW van ProductGroup als optie A gekozen wordt.
5) ProductsPage: laad VAT rates en gebruik `vatRateId` dropdown met echte IDs.
6) Product create: valideer presence van `productGroupId` en `categoryId` vóór Prisma-call (conform schema) en geef 400 met details bij ontbrekende velden.
7) Product detailpagina met varianten-overzicht en BTW/resolutie-weergave.
8) Variants UI (CRUD) en koppeling in ProductsPage/detail.
9) Eenduidige ordering/filters hergebruiken via helpers (reeds deels gedaan in controller).
10) Documenteer tenant setup en CORS/proxy LAN-config (vastgelegd, maar toevoegen aan README/docs).
