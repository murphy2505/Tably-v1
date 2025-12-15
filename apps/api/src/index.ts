import path from "node:path";
import dotenv from "dotenv";
import { createServer } from "./server";

// Load root .env (optional app-level) and db package envs
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "packages/db/.env") });

const port = Number(process.env.PORT || 4002);
const host = process.env.HOST || "0.0.0.0";

const app = createServer();

app.listen(port, host, () => {
  console.log(`[api] listening on http://${host}:${port}`);
});
