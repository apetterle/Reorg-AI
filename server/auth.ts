import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { type Express, type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";
import { pool } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export { hashPassword, comparePasswords };

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
    }
  }
}

export function setupAuth(app: Express): ReturnType<typeof session> {
  const PgStore = connectPgSimple(session);

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "reorg-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    store: new PgStore({
      pool: pool as any,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(csrfProtection);

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        const valid = await comparePasswords(password, user.password);
        if (!valid) return done(null, false, { message: "Invalid credentials" });
        return done(null, {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      });
    } catch (err) {
      done(err);
    }
  });

  return sessionMiddleware;
}

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  if (req.path === "/api/auth/login" || req.path === "/api/auth/register") {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    const origin = req.get("origin");
    const host = req.get("host");
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return res.status(403).json({ error: { code: "CSRF", message: "Cross-origin request blocked" } });
        }
      } catch {
        return res.status(403).json({ error: { code: "CSRF", message: "Invalid origin header" } });
      }
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function requireTenantAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const tenantSlug = req.params.tenantSlug;
  if (!tenantSlug) return next();

  const tenant = await storage.getTenantBySlug(tenantSlug);
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });

  const membership = await storage.getMembership(tenant.id, req.user!.id);
  if (!membership) return res.status(403).json({ message: "Access denied" });

  (req as any).tenant = tenant;
  (req as any).membership = membership;
  next();
}
