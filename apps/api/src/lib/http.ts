import { NextFunction, Request, Response } from "express";

export function asyncHandler<T extends (req: Request, res: Response) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export function validationError(res: Response, details: any) {
  return res.status(400).json({ error: { message: "VALIDATION_ERROR", details } });
}

export function internalServerError(res: Response) {
  return res.status(500).json({ error: { message: "INTERNAL_SERVER_ERROR" } });
}

export function notFound(res: Response) {
  return res.status(404).json({ error: { message: "NOT_FOUND" } });
}

export function serviceUnavailable(res: Response) {
  return res.status(503).json({ error: { message: "NOT_READY" } });
}

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  internalServerError(res);
}
