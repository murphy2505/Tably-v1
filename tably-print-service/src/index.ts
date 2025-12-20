import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import printRouter from "./routes/print";

const app = express();
app.use(cors());
app.use(express.json());

// Simple health endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Routes
app.use("/print", printRouter);

// Global error handler (safety)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  const message = err?.message || "INTERNAL_ERROR";
  res.status(status).json({ ok: false, error: message });
});

const PORT = Number(process.env.PORT || 4010);
app.listen(PORT, () => {
  console.log(`[tably-print-service] listening on http://localhost:${PORT}`);
});
