import type { Response } from 'express';

export function success<T = unknown>(res: Response, data: T, message = 'success'): void {
  res.json({ code: 0, data, message });
}

export function fail(res: Response, message: string, code = 400, status = 400): void {
  res.status(status).json({ code, message });
}
