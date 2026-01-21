import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type PaginationParams } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import {
  securityMiddleware,
  apiRateLimiter,
  authRateLimiter,
  getCsrfToken,
  securityErrorHandler,
} from "./middleware/security";
import {
  insertPatientSchema,
  updatePatientSchema,
  insertExamSchema,
  updateExamSchema,
  insertExamFindingSchema,
  updateExamFindingSchema,
  insertVaccinationRecordSchema,
  updateVaccinationRecordSchema,
  updateClinicSettingsSchema,
  userRoleEnum,
  type UserRole,
  type SafeUser,
} from "@shared/schema";
import { z } from "zod";

// ==================== ERROR RESPONSE TYPES ====================

interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
  code?: string;
}

interface ApiSuccess<T = unknown> {
  data?: T;
  message?: string;
}

// ==================== VALIDATION SCHEMAS ====================

// Pagination query schema
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// UUID parameter schema
const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

// Patient ID parameter schema
const patientIdParamSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
});

// Exam ID parameter schema
const examIdParamSchema = z.object({
  examId: z.string().uuid("Invalid exam ID format"),
});

// Search query schema
const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(100),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Upcoming vaccinations query schema
const upcomingVaccinationsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

// User role update schema
const updateUserRoleSchema = z.object({
  role: userRoleEnum,
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  res: Response,
  status: number,
  error: string,
  message?: string,
  details?: unknown
): void {
  const response: ApiError = { error };
  if (message) response.message = message;
  if (details) response.details = details;
  res.status(status).json(response);
}

/**
 * Parses pagination parameters from query string
 */
function parsePagination(query: Record<string, unknown>): PaginationParams {
  const result = paginationSchema.safeParse(query);
  if (result.success) {
    return { page: result.data.page, limit: result.data.limit };
  }
  return { page: 1, limit: 20 };
}

/**
 * Removes password from user object for safe responses
 */
function sanitizeUser(user: { password?: string; [key: string]: unknown }): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser as SafeUser;
}

/**
 * Async route handler wrapper for error handling
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ==================== ROLE DEFINITIONS ====================

// Role constants for cleaner authorization
const ADMIN_ONLY: UserRole[] = ["admin"];
const VET_OR_ADMIN: UserRole[] = ["admin", "veterinarian"];
const CLINICAL_STAFF: UserRole[] = ["admin", "veterinarian", "technician"];
const ALL_STAFF: UserRole[] = ["admin", "veterinarian", "technician", "receptionist"];

// ==================== ROUTE REGISTRATION ====================

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== HEALTH CHECK (NO AUTH) ====================

  // Health check endpoint for Azure/container health probes
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    });
  });

  // ==================== SECURITY MIDDLEWARE ====================

  // Apply security middleware (helmet, sanitization, content-type validation)
  app.use(securityMiddleware);

  // Apply general API rate limiting
  app.use("/api", apiRateLimiter);

  // Apply stricter rate limiting to auth endpoints
  app.use("/api/auth/login", authRateLimiter);
  app.use("/api/auth/register", authRateLimiter);

  // ==================== AUTHENTICATION SETUP ====================

  // Setup authentication (passport, session, auth routes)
  setupAuth(app);

  // ==================== CSRF TOKEN ENDPOINT ====================

  // GET /api/csrf-token - Get CSRF token for state-changing requests
  app.get("/api/csrf-token", getCsrfToken);

  // ==================== HEALTH CHECK ====================

  // GET /api/health - Health check endpoint (no auth required)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // ==================== PATIENT ROUTES ====================

  // GET /api/patients - List all patients with pagination
  // Access: All authenticated staff
  app.get(
    "/api/patients",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const pagination = parsePagination(req.query);
      const result = await storage.getAllPatients(pagination);
      res.json(result);
    })
  );

  // GET /api/patients/search - Search patients
  // Access: All authenticated staff
  app.get(
    "/api/patients/search",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const validationResult = searchQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid search parameters",
          validationResult.error.errors
        );
      }

      const { q, page, limit } = validationResult.data;
      const result = await storage.searchPatients(q, { page, limit });
      res.json(result);
    })
  );

  // GET /api/patients/:id - Get single patient
  // Access: All authenticated staff
  app.get(
    "/api/patients/:id",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid patient ID format",
          paramValidation.error.errors
        );
      }

      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return createErrorResponse(res, 404, "Not Found", "Patient not found");
      }
      res.json(patient);
    })
  );

  // POST /api/patients - Create new patient
  // Access: Clinical staff (admin, veterinarian, technician)
  app.post(
    "/api/patients",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const validationResult = insertPatientSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid patient data",
          validationResult.error.errors
        );
      }

      const patient = await storage.createPatient(validationResult.data);
      res.status(201).json(patient);
    })
  );

  // PATCH /api/patients/:id - Update patient
  // Access: Clinical staff (admin, veterinarian, technician)
  app.patch(
    "/api/patients/:id",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid patient ID format",
          paramValidation.error.errors
        );
      }

      const validationResult = updatePatientSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid patient data",
          validationResult.error.errors
        );
      }

      const patient = await storage.updatePatient(req.params.id, validationResult.data);
      if (!patient) {
        return createErrorResponse(res, 404, "Not Found", "Patient not found");
      }
      res.json(patient);
    })
  );

  // ==================== EXAM ROUTES ====================

  // GET /api/exams - List all exams with pagination
  // Access: All authenticated staff
  app.get(
    "/api/exams",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const pagination = parsePagination(req.query);
      const result = await storage.getAllExamsWithPatients(pagination);
      res.json(result);
    })
  );

  // GET /api/exams/:id - Get single exam with findings
  // Access: All authenticated staff
  app.get(
    "/api/exams/:id",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid exam ID format",
          paramValidation.error.errors
        );
      }

      const exam = await storage.getExamWithFindings(req.params.id);
      if (!exam) {
        return createErrorResponse(res, 404, "Not Found", "Exam not found");
      }
      res.json(exam);
    })
  );

  // POST /api/exams - Create new exam
  // Access: Veterinarians and admins
  app.post(
    "/api/exams",
    requireAuth,
    requireRole(VET_OR_ADMIN),
    asyncHandler(async (req, res) => {
      const validationResult = insertExamSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid exam data",
          validationResult.error.errors
        );
      }

      // Automatically set the examiner to the current user if not provided
      const examData = {
        ...validationResult.data,
        examinerId: validationResult.data.examinerId || req.user?.id,
      };

      const exam = await storage.createExam(examData);
      res.status(201).json(exam);
    })
  );

  // PATCH /api/exams/:id - Update exam
  // Access: Clinical staff (admin, veterinarian, technician)
  app.patch(
    "/api/exams/:id",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid exam ID format",
          paramValidation.error.errors
        );
      }

      const validationResult = updateExamSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid exam data",
          validationResult.error.errors
        );
      }

      // Prevent changing status to 'signed' via PATCH (use dedicated endpoint)
      if (validationResult.data.status === "signed") {
        return createErrorResponse(
          res,
          400,
          "Invalid Operation",
          "Use POST /api/exams/:id/sign to sign an exam"
        );
      }

      const exam = await storage.updateExam(req.params.id, validationResult.data);
      if (!exam) {
        return createErrorResponse(res, 404, "Not Found", "Exam not found");
      }
      res.json(exam);
    })
  );

  // POST /api/exams/:id/sign - Sign an exam
  // Access: Veterinarians and admins only
  app.post(
    "/api/exams/:id/sign",
    requireAuth,
    requireRole(VET_OR_ADMIN),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid exam ID format",
          paramValidation.error.errors
        );
      }

      const existingExam = await storage.getExam(req.params.id);
      if (!existingExam) {
        return createErrorResponse(res, 404, "Not Found", "Exam not found");
      }

      if (existingExam.status === "signed") {
        return createErrorResponse(
          res,
          400,
          "Invalid Operation",
          "Exam is already signed"
        );
      }

      const exam = await storage.signExam(req.params.id, req.user!.id);
      res.json(exam);
    })
  );

  // ==================== EXAM FINDINGS ROUTES ====================

  // GET /api/exams/:examId/findings - Get exam findings
  // Access: All authenticated staff
  app.get(
    "/api/exams/:examId/findings",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = examIdParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid exam ID format",
          paramValidation.error.errors
        );
      }

      const findings = await storage.getExamFindings(req.params.examId);
      res.json(findings);
    })
  );

  // POST /api/exam-findings - Create exam finding
  // Access: Clinical staff (admin, veterinarian, technician)
  app.post(
    "/api/exam-findings",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const validationResult = insertExamFindingSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid finding data",
          validationResult.error.errors
        );
      }

      // Verify the exam exists
      const exam = await storage.getExam(validationResult.data.examId);
      if (!exam) {
        return createErrorResponse(res, 404, "Not Found", "Exam not found");
      }

      // Prevent adding findings to signed exams
      if (exam.status === "signed") {
        return createErrorResponse(
          res,
          400,
          "Invalid Operation",
          "Cannot add findings to a signed exam"
        );
      }

      const finding = await storage.createExamFinding(validationResult.data);
      res.status(201).json(finding);
    })
  );

  // PATCH /api/exam-findings/:id - Update exam finding
  // Access: Clinical staff (admin, veterinarian, technician)
  app.patch(
    "/api/exam-findings/:id",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid finding ID format",
          paramValidation.error.errors
        );
      }

      const validationResult = updateExamFindingSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid finding data",
          validationResult.error.errors
        );
      }

      const finding = await storage.updateExamFinding(req.params.id, validationResult.data);
      if (!finding) {
        return createErrorResponse(res, 404, "Not Found", "Finding not found");
      }
      res.json(finding);
    })
  );

  // ==================== VACCINATION ROUTES ====================

  // GET /api/vaccinations/upcoming - Get upcoming vaccination expirations
  // Access: All authenticated staff
  app.get(
    "/api/vaccinations/upcoming",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const validationResult = upcomingVaccinationsQuerySchema.safeParse(req.query);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid query parameters",
          validationResult.error.errors
        );
      }

      const vaccinations = await storage.getUpcomingVaccinations(
        validationResult.data.days
      );
      res.json(vaccinations);
    })
  );

  // GET /api/vaccinations/:patientId - Get patient vaccinations
  // Access: All authenticated staff
  app.get(
    "/api/vaccinations/:patientId",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = patientIdParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid patient ID format",
          paramValidation.error.errors
        );
      }

      // Verify patient exists
      const patient = await storage.getPatient(req.params.patientId);
      if (!patient) {
        return createErrorResponse(res, 404, "Not Found", "Patient not found");
      }

      const vaccinations = await storage.getVaccinationsByPatient(req.params.patientId);
      res.json(vaccinations);
    })
  );

  // POST /api/vaccinations - Create vaccination record
  // Access: Clinical staff (admin, veterinarian, technician)
  app.post(
    "/api/vaccinations",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const validationResult = insertVaccinationRecordSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid vaccination data",
          validationResult.error.errors
        );
      }

      // Verify patient exists
      const patient = await storage.getPatient(validationResult.data.patientId);
      if (!patient) {
        return createErrorResponse(res, 404, "Not Found", "Patient not found");
      }

      // Set administered by to current user if not provided
      const vaccinationData = {
        ...validationResult.data,
        administeredById: validationResult.data.administeredById || req.user?.id,
      };

      const vaccination = await storage.createVaccinationRecord(vaccinationData);
      res.status(201).json(vaccination);
    })
  );

  // PUT /api/vaccinations/:id - Update vaccination record
  // Access: Clinical staff (admin, veterinarian, technician)
  app.put(
    "/api/vaccinations/:id",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid vaccination ID format",
          paramValidation.error.errors
        );
      }

      const validationResult = updateVaccinationRecordSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid vaccination data",
          validationResult.error.errors
        );
      }

      const vaccination = await storage.updateVaccinationRecord(
        req.params.id,
        validationResult.data
      );
      if (!vaccination) {
        return createErrorResponse(res, 404, "Not Found", "Vaccination record not found");
      }
      res.json(vaccination);
    })
  );

  // DELETE /api/vaccinations/:id - Delete vaccination record
  // Access: Clinical staff (admin, veterinarian, technician)
  app.delete(
    "/api/vaccinations/:id",
    requireAuth,
    requireRole(CLINICAL_STAFF),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid vaccination ID format",
          paramValidation.error.errors
        );
      }

      try {
        await storage.deleteVaccinationRecord(req.params.id);
        res.status(204).send();
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          return createErrorResponse(res, 404, "Not Found", "Vaccination record not found");
        }
        throw err;
      }
    })
  );

  // ==================== CLINIC SETTINGS ROUTES ====================

  // GET /api/clinic-settings - Get clinic settings
  // Access: All authenticated staff
  app.get(
    "/api/clinic-settings",
    requireAuth,
    requireRole(ALL_STAFF),
    asyncHandler(async (_req, res) => {
      const settings = await storage.getClinicSettings();
      if (!settings) {
        // Return default settings if none exist
        res.json({
          clinicName: "Veterinary Clinic",
          clinicAddress: null,
          clinicPhone: null,
          clinicEmail: null,
          clinicLogo: null,
        });
        return;
      }
      res.json(settings);
    })
  );

  // PUT /api/clinic-settings - Update clinic settings
  // Access: Admin only
  app.put(
    "/api/clinic-settings",
    requireAuth,
    requireRole(ADMIN_ONLY),
    asyncHandler(async (req, res) => {
      const validationResult = updateClinicSettingsSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid clinic settings data",
          validationResult.error.errors
        );
      }

      // Get existing settings or create new
      let existingSettings = await storage.getClinicSettings();
      let settings;

      if (existingSettings) {
        settings = await storage.updateClinicSettings(existingSettings.id, validationResult.data);
      } else {
        settings = await storage.createClinicSettings({
          clinicName: validationResult.data.clinicName || "Kaseketi Veterinary Clinic",
          ...validationResult.data,
        });
      }
      res.json(settings);
    })
  );

  // ==================== USER MANAGEMENT ROUTES ====================

  // GET /api/users - List all users (admin only)
  // Access: Admin only
  app.get(
    "/api/users",
    requireAuth,
    requireRole(ADMIN_ONLY),
    asyncHandler(async (req, res) => {
      const pagination = parsePagination(req.query);
      const result = await storage.getAllUsers(pagination);

      // Sanitize user data - remove passwords
      const sanitizedData = result.data.map(sanitizeUser);

      res.json({
        ...result,
        data: sanitizedData,
      });
    })
  );

  // PUT /api/users/:id/role - Update user role (admin only)
  // Access: Admin only
  app.put(
    "/api/users/:id/role",
    requireAuth,
    requireRole(ADMIN_ONLY),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid user ID format",
          paramValidation.error.errors
        );
      }

      const validationResult = updateUserRoleSchema.safeParse(req.body);

      if (!validationResult.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid role data",
          validationResult.error.errors
        );
      }

      // Prevent admin from demoting themselves
      if (req.params.id === req.user?.id && validationResult.data.role !== "admin") {
        return createErrorResponse(
          res,
          400,
          "Invalid Operation",
          "You cannot demote yourself from admin role"
        );
      }

      const user = await storage.updateUserRole(req.params.id, validationResult.data.role);
      if (!user) {
        return createErrorResponse(res, 404, "Not Found", "User not found");
      }
      res.json(sanitizeUser(user));
    })
  );

  // PUT /api/users/:id/deactivate - Deactivate user (admin only)
  // Access: Admin only
  app.put(
    "/api/users/:id/deactivate",
    requireAuth,
    requireRole(ADMIN_ONLY),
    asyncHandler(async (req, res) => {
      const paramValidation = uuidParamSchema.safeParse(req.params);

      if (!paramValidation.success) {
        return createErrorResponse(
          res,
          400,
          "Validation Error",
          "Invalid user ID format",
          paramValidation.error.errors
        );
      }

      // Prevent admin from deactivating themselves
      if (req.params.id === req.user?.id) {
        return createErrorResponse(
          res,
          400,
          "Invalid Operation",
          "You cannot deactivate your own account"
        );
      }

      const user = await storage.deactivateUser(req.params.id);
      if (!user) {
        return createErrorResponse(res, 404, "Not Found", "User not found");
      }
      res.json(sanitizeUser(user));
    })
  );

  // ==================== ERROR HANDLING ====================

  // Security error handler (CSRF, rate limiting)
  app.use(securityErrorHandler);

  // Global error handler
  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      return createErrorResponse(
        res,
        400,
        "Validation Error",
        "Request validation failed",
        err.errors
      );
    }

    // Handle known error types
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;

    createErrorResponse(res, status, "Server Error", message);
  });

  return httpServer;
}
