import type { Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { doubleCsrf } from "csrf-csrf";

/**
 * Security Middleware for Vet Clinical Exam Application
 *
 * This module provides production-ready security middleware including:
 * - Helmet for HTTP security headers
 * - Rate limiting for API and authentication endpoints
 * - CSRF protection
 * - Request sanitization
 */

// ============================================================================
// HELMET CONFIGURATION - Security Headers
// ============================================================================

/**
 * Helmet middleware configuration for setting secure HTTP headers.
 * Configured for a production Express.js application.
 */
export const helmetMiddleware = helmet({
  // Content Security Policy - Restricts resource loading sources
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust based on your frontend needs
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"], // Allow WebSocket connections
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Disable if embedding external resources
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Frameguard - Prevent clickjacking
  frameguard: { action: "deny" },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  // Disable IE downloads opening in site context
  ieNoOpen: true,
  // Prevent MIME type sniffing
  noSniff: true,
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // XSS Filter (legacy, but still useful for older browsers)
  xssFilter: true,
});

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Rate limit configuration options
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

/**
 * Standard rate limiter for general API endpoints.
 * Allows 100 requests per 15 minutes per IP address.
 */
const apiRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
};

export const apiRateLimiter = rateLimit({
  ...apiRateLimitConfig,
  keyGenerator: (req: Request): string => {
    // Use X-Forwarded-For header if behind a proxy, otherwise use IP
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.ip
      || req.socket.remoteAddress
      || "unknown";
  },
  skip: (req: Request): boolean => {
    // Skip rate limiting for health check endpoints
    return req.path === "/api/health" || req.path === "/api/ping";
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      error: "Too Many Requests",
      message: apiRateLimitConfig.message,
      retryAfter: Math.ceil(apiRateLimitConfig.windowMs / 1000),
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints.
 * Allows only 5 requests per 15 minutes per IP address to prevent brute force attacks.
 */
const authRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
};

export const authRateLimiter = rateLimit({
  ...authRateLimitConfig,
  keyGenerator: (req: Request): string => {
    // Use combination of IP and username/email for more precise limiting
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.ip
      || req.socket.remoteAddress
      || "unknown";
    const identifier = req.body?.email || req.body?.username || "";
    return `${ip}-${identifier}`;
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      error: "Too Many Authentication Attempts",
      message: authRateLimitConfig.message,
      retryAfter: Math.ceil(authRateLimitConfig.windowMs / 1000),
    });
  },
});

// ============================================================================
// CSRF PROTECTION CONFIGURATION
// ============================================================================

/**
 * CSRF protection using the double-submit cookie pattern.
 * This provides stateless CSRF protection suitable for REST APIs.
 */
const csrfSecret = process.env.CSRF_SECRET || "vet-clinical-exam-csrf-secret-change-in-production";

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req: Request): string => {
    // Use IP address as session identifier for stateless CSRF
    // In a session-based app, you would use req.session.id instead
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.ip
      || req.socket.remoteAddress
      || "unknown";
  },
  cookieName: "__Host-csrf-token", // Using __Host- prefix for additional security
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  },
  size: 64, // Token size in bytes
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // Methods that don't require CSRF validation
  getCsrfTokenFromRequest: (req: Request): string | null | undefined => {
    // Check for token in header first (preferred for APIs), then body
    return (req.headers["x-csrf-token"] as string)
      || (req.headers["x-xsrf-token"] as string)
      || req.body?._csrf
      || null;
  },
});

export const csrfProtection = doubleCsrfProtection;

/**
 * Middleware to generate and attach CSRF token to response.
 * Use this on routes that render forms or need to provide CSRF token to clients.
 */
export const csrfTokenGenerator: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = generateCsrfToken(req, res);
    res.locals.csrfToken = token;
    // Also set token in response header for SPA consumption
    res.setHeader("X-CSRF-Token", token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * API endpoint handler to get a new CSRF token.
 * Clients should call this endpoint before making state-changing requests.
 */
export const getCsrfToken: RequestHandler = (req: Request, res: Response): void => {
  try {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate CSRF token" });
  }
};

// ============================================================================
// REQUEST SANITIZATION
// ============================================================================

/**
 * Characters and patterns to sanitize from request inputs
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers
  /data:/gi, // Data URIs (potential XSS vector)
  /vbscript:/gi, // VBScript protocol
  /expression\s*\(/gi, // CSS expressions
];

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove dangerous patterns from string
 */
function removeDangerousPatterns(str: string): string {
  let sanitized = str;
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  return sanitized;
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  // Prevent deep recursion attacks
  if (depth > 10) {
    return obj;
  }

  if (typeof obj === "string") {
    return escapeHtml(removeDangerousPatterns(obj.trim()));
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Also sanitize keys
      const sanitizedKey = escapeHtml(removeDangerousPatterns(key));
      sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Request sanitization middleware.
 * Sanitizes request body, query parameters, and URL parameters.
 */
export const requestSanitizer: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body) as typeof req.body;
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query) as typeof req.query;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params) as typeof req.params;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate Content-Type for JSON endpoints.
 * Helps prevent CSRF attacks that rely on form submission.
 */
export const validateContentType: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const contentType = req.headers["content-type"];

  // Skip validation for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip if no body
  if (!req.body || Object.keys(req.body).length === 0) {
    return next();
  }

  // Require application/json for API endpoints with body
  if (req.path.startsWith("/api") && contentType && !contentType.includes("application/json")) {
    res.status(415).json({
      error: "Unsupported Media Type",
      message: "Content-Type must be application/json for API endpoints",
    });
    return;
  }

  next();
};

// ============================================================================
// ADDITIONAL SECURITY UTILITIES
// ============================================================================

/**
 * Security headers for API responses.
 * Adds additional headers not covered by Helmet.
 */
export const additionalSecurityHeaders: RequestHandler = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent caching of sensitive data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  // Additional security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  next();
};

/**
 * Error handler for security-related errors.
 * Provides consistent error responses for security violations.
 */
export const securityErrorHandler = (
  err: Error & { code?: string },
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle CSRF errors
  if (err.code === "EBADCSRFTOKEN" || err.message.includes("csrf")) {
    res.status(403).json({
      error: "Forbidden",
      message: "Invalid or missing CSRF token",
    });
    return;
  }

  // Handle rate limit errors
  if (err.message.includes("rate limit") || err.message.includes("Too many")) {
    res.status(429).json({
      error: "Too Many Requests",
      message: err.message,
    });
    return;
  }

  // Pass other errors to default handler
  next(err);
};

// ============================================================================
// COMBINED SECURITY MIDDLEWARE
// ============================================================================

/**
 * Combined security middleware array for easy application setup.
 * Apply in order: helmet -> sanitization -> content-type validation
 */
export const securityMiddleware: RequestHandler[] = [
  helmetMiddleware,
  requestSanitizer,
  validateContentType,
  additionalSecurityHeaders,
];

/**
 * Export all middleware functions for granular control
 */
export default {
  // Core security
  helmetMiddleware,
  securityMiddleware,

  // Rate limiting
  apiRateLimiter,
  authRateLimiter,

  // CSRF protection
  csrfProtection,
  csrfTokenGenerator,
  getCsrfToken,

  // Sanitization
  requestSanitizer,
  validateContentType,

  // Additional utilities
  additionalSecurityHeaders,
  securityErrorHandler,
};
