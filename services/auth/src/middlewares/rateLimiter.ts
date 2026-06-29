import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequestCounts = new Map<string, RateLimitRecord>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = ipRequestCounts.get(ip);

    if (!record || now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      res.status(429).json({
        message: "Too many requests, please try again later.",
      });
      return;
    }

    record.count += 1;
    next();
  };
};
