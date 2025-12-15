# Tably DB (Prisma)

Env guidance:
- Place database env vars in `packages/db/.env` (e.g. `DATABASE_URL`, `DEFAULT_TENANT_ID`).
- Keep root `.env` for app-level vars (`apps/api`, `apps/web`). Avoid duplicating DB vars there to prevent conflicts.

Common commands (run from repo root):

```zsh
npx prisma validate --schema packages/db/prisma/schema.prisma
npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma migrate dev --schema packages/db/prisma/schema.prisma --name step1-remove-variant-vat
npm run -w packages/db prisma:seed
npx prisma studio --schema packages/db/prisma/schema.prisma
```
