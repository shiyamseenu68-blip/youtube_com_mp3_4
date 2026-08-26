import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log detailed technical stack trace on server side only
  console.error(`[API Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || 500;
  const userMessage = err.message || 'An unexpected server error occurred. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: userMessage,
  });
}
