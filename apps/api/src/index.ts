import path from "node:path";
import dotenv from "dotenv";

// Load root .env first, then db package envs, before importing server/prisma
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "packages/db/.env") });

// Import server after envs are loaded to ensure prisma sees DATABASE_URL
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createServer } = require("./server");

const port = Number(process.env.PORT || 4002);
const host = process.env.HOST || "0.0.0.0";

const app = createServer();

app.listen(port, host, () => {
  console.log(`[api] listening on http://${host}:${port}`);
});
