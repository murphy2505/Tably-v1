// apps/api/src/index.ts
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Helper: load env file if it exists
function loadEnv(filePath: string, opts?: { override?: boolean }) {
  if (!fs.existsSync(filePath)) return false;
  dotenv.config({ path: filePath, override: opts?.override ?? false });
  console.log(`[env] loaded ${filePath}${opts?.override ? " (override)" : ""}`);
  return true;
}

/**
 * ENV strategy (monorepo-safe)
 * - Load root .env as base (no override)
 * - Load apps/api/.env to inject API secrets (override=true)
 * - Load packages/db/.env to inject DATABASE_URL (override=true)
 *
 * This guarantees:
 * - SUMUP_API_KEY comes from apps/api/.env
 * - DATABASE_URL comes from packages/db/.env
 */
// Locate repo root robustly even if process.cwd() varies
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
        const ws = json?.workspaces;
        if (ws && Array.isArray(ws) && ws.some((p: string) => p.startsWith("apps/"))) {
          return dir;
        }
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}
const repoRoot = findRepoRoot(process.cwd());
const rootEnv = path.resolve(repoRoot, ".env");
const apiEnv = path.resolve(repoRoot, "apps/api/.env");
const dbEnv = path.resolve(repoRoot, "packages/db/.env");

// Base
loadEnv(rootEnv, { override: false });

// Service-specific override
loadEnv(apiEnv, { override: true });
loadEnv(dbEnv, { override: true });

// Proof: show if SumUp envs are visible to the process (no secret values)
const hasKey = !!process.env.SUMUP_API_KEY;
const hasToken = !!process.env.SUMUP_ACCESS_TOKEN;
const keyLength = (process.env.SUMUP_API_KEY || "").length;
const tokenLength = (process.env.SUMUP_ACCESS_TOKEN || "").length;
console.log("[env] has SUMUP_API_KEY:", hasKey, "len:", keyLength);
console.log("[env] has SUMUP_ACCESS_TOKEN:", hasToken, "len:", tokenLength);
console.log("[env] cwd:", process.cwd());

import { createServer } from "./server";

const port = Number(process.env.PORT || 4002);
const host = process.env.HOST || "0.0.0.0";

const app = createServer();

app.listen(port, host, () => {
  console.log(`[api] listening on http://${host}:${port}`);
});
