import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

export type AdminToken = {
  sub: string;
  email: string;
};

export function signAdminToken(payload: AdminToken) {
  return jwt.sign(payload, env.SESSION_SECRET, { expiresIn: "12h" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_session;
  if (!token) {
    res.status(401).json({ message: "Sesion requerida" });
    return;
  }

  try {
    req.admin = jwt.verify(token, env.SESSION_SECRET) as AdminToken;
    next();
  } catch {
    res.status(401).json({ message: "Sesion invalida" });
  }
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminToken;
    }
  }
}

