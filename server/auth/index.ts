import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { hashPassword, verifyPassword } from "./password";
import {
  type User,
  type SafeUser,
  type UserRole,
  userRoleEnum,
  registerUserSchema,
  loginUserSchema,
} from "@shared/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

/**
 * Remove password from user object for safe transmission
 */
function sanitizeUser(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Configure Passport.js with local strategy
 */
function configurePassport(): void {
  // Serialize user ID to session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session by ID
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, sanitizeUser(user));
    } catch (error) {
      done(error);
    }
  });

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Check if user is active
        if (!user.isActive) {
          return done(null, false, { message: "Account is deactivated" });
        }

        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, sanitizeUser(user));
      } catch (error) {
        return done(error);
      }
    })
  );
}

/**
 * Setup authentication middleware and routes
 */
export function setupAuth(app: Express): void {
  // Configure session middleware
  const sessionSecret = process.env.SESSION_SECRET || "vet-clinical-exam-secret-key-change-in-production";

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport strategies
  configurePassport();

  // Register authentication routes
  registerAuthRoutes(app);
}

/**
 * Register authentication API routes
 */
function registerAuthRoutes(app: Express): void {
  // POST /api/auth/register - Register a new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validationResult = registerUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { username, email, password, firstName, lastName, role } = validationResult.data;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "receptionist",
      });

      // Log the user in automatically after registration
      const safeUser = sanitizeUser(newUser);
      req.login(safeUser, (err) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return res.status(201).json({ user: safeUser });
        }
        return res.status(201).json({ user: safeUser });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).json({ error: "Failed to register user" });
    }
  });

  // POST /api/auth/login - Login a user
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    const validationResult = loginUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors,
      });
    }

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: "Authentication failed" });
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ error: "Failed to establish session" });
        }

        return res.json({ user });
      });
    })(req, res, next);
  });

  // POST /api/auth/logout - Logout a user
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    });
  });

  // GET /api/auth/me - Get current authenticated user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.json({ user: req.user });
  });
}

/**
 * Middleware to require authentication
 * Use this to protect routes that require a logged-in user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * Middleware factory to require specific roles
 * Use this to protect routes that require specific user roles
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 *
 * @example
 * // Only admins can access
 * app.get("/api/admin/users", requireAuth, requireRole(["admin"]), handler);
 *
 * @example
 * // Admins and veterinarians can access
 * app.get("/api/medical/records", requireAuth, requireRole(["admin", "veterinarian"]), handler);
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // First check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userRole = req.user.role as UserRole;

    // Validate that the role is a valid UserRole
    const parseResult = userRoleEnum.safeParse(userRole);
    if (!parseResult.success) {
      res.status(403).json({ error: "Invalid user role" });
      return;
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: "Access denied",
        message: `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Helper function to check if a user has a specific role
 * Useful for conditional logic in route handlers
 */
export function hasRole(user: Express.User | undefined, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as UserRole);
}

/**
 * Helper function to check if user is admin
 */
export function isAdmin(user: Express.User | undefined): boolean {
  return hasRole(user, ["admin"]);
}

/**
 * Helper function to check if user is a veterinarian
 */
export function isVeterinarian(user: Express.User | undefined): boolean {
  return hasRole(user, ["veterinarian"]);
}

/**
 * Helper function to check if user can perform clinical tasks
 * (veterinarians and technicians)
 */
export function canPerformClinicalTasks(user: Express.User | undefined): boolean {
  return hasRole(user, ["admin", "veterinarian", "technician"]);
}

// Export password functions for use in other parts of the application
export { hashPassword, verifyPassword } from "./password";
