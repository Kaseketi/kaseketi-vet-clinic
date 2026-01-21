import {
  patients,
  exams,
  examFindings,
  users,
  vaccinationRecords,
  clinicSettings,
  type Patient,
  type InsertPatient,
  type UpdatePatient,
  type Exam,
  type InsertExam,
  type ExamFinding,
  type InsertExamFinding,
  type User,
  type InsertUser,
  type UpdateUser,
  type ExamWithPatient,
  type ExamWithFindings,
  type PatientWithFullHistory,
  type VaccinationRecord,
  type InsertVaccinationRecord,
  type UpdateVaccinationRecord,
  type ClinicSettings,
  type InsertClinicSettings,
  type UpdateClinicSettings,
  type UserRole,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, ilike, or, and, gte, lte, asc, count } from "drizzle-orm";

// ==================== CUSTOM ERRORS ====================

export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export class NotFoundError extends StorageError {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class DuplicateError extends StorageError {
  constructor(entity: string, field: string, value: string) {
    super(
      `${entity} with ${field} '${value}' already exists`,
      "DUPLICATE",
      409
    );
    this.name = "DuplicateError";
  }
}

export class ValidationError extends StorageError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class TransactionError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(
      `Transaction failed: ${message}${originalError ? ` - ${originalError.message}` : ""}`,
      "TRANSACTION_ERROR",
      500
    );
    this.name = "TransactionError";
  }
}

// ==================== PAGINATION TYPES ====================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ==================== INTERFACE ====================

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User>;
  searchUsers(query: string, pagination?: PaginationParams): Promise<PaginatedResult<User>>;
  deactivateUser(id: string): Promise<User>;
  updateUserRole(id: string, role: UserRole): Promise<User>;
  getUsersByRole(role: UserRole, pagination?: PaginationParams): Promise<PaginatedResult<User>>;
  getAllUsers(pagination?: PaginationParams): Promise<PaginatedResult<User>>;

  // Patient methods
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: string): Promise<Patient | undefined>;
  updatePatient(id: string, patient: UpdatePatient): Promise<Patient>;
  getAllPatients(pagination?: PaginationParams): Promise<PaginatedResult<Patient>>;
  searchPatients(query: string, pagination?: PaginationParams): Promise<PaginatedResult<Patient>>;
  getPatientWithFullHistory(id: string): Promise<PatientWithFullHistory | undefined>;
  softDeletePatient(id: string): Promise<Patient>;

  // Exam methods
  createExam(exam: InsertExam): Promise<Exam>;
  getExam(id: string): Promise<Exam | undefined>;
  getExamWithPatient(id: string): Promise<ExamWithPatient | undefined>;
  getExamWithFindings(id: string): Promise<ExamWithFindings | undefined>;
  getAllExamsWithPatients(pagination?: PaginationParams): Promise<PaginatedResult<ExamWithPatient>>;
  getExamsByPatient(patientId: string, pagination?: PaginationParams): Promise<PaginatedResult<Exam>>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam>;
  signExam(id: string, examinerId: string): Promise<Exam>;
  deleteExam(id: string): Promise<void>;

  // Exam finding methods
  createExamFinding(finding: InsertExamFinding): Promise<ExamFinding>;
  getExamFindings(examId: string): Promise<ExamFinding[]>;
  updateExamFinding(id: string, finding: Partial<InsertExamFinding>): Promise<ExamFinding>;
  deleteExamFinding(id: string): Promise<void>;

  // Transaction methods
  createExamWithFindings(
    exam: InsertExam,
    findings: InsertExamFinding[]
  ): Promise<{ exam: Exam; findings: ExamFinding[] }>;

  // Vaccination record methods
  createVaccinationRecord(record: InsertVaccinationRecord): Promise<VaccinationRecord>;
  getVaccinationRecord(id: string): Promise<VaccinationRecord | undefined>;
  getVaccinationsByPatient(patientId: string, pagination?: PaginationParams): Promise<PaginatedResult<VaccinationRecord>>;
  getUpcomingVaccinations(daysAhead: number, pagination?: PaginationParams): Promise<PaginatedResult<VaccinationRecord>>;
  updateVaccinationRecord(id: string, record: UpdateVaccinationRecord): Promise<VaccinationRecord>;
  deleteVaccinationRecord(id: string): Promise<void>;

  // Clinic settings methods
  getClinicSettings(): Promise<ClinicSettings | undefined>;
  createClinicSettings(settings: InsertClinicSettings): Promise<ClinicSettings>;
  updateClinicSettings(id: string, settings: UpdateClinicSettings): Promise<ClinicSettings>;
}

// ==================== IMPLEMENTATION ====================

export class DatabaseStorage implements IStorage {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  /**
   * Normalizes pagination parameters with defaults and bounds checking
   */
  private normalizePagination(params?: PaginationParams): { page: number; limit: number; offset: number } {
    const page = Math.max(1, params?.page ?? this.DEFAULT_PAGE);
    const limit = Math.min(this.MAX_LIMIT, Math.max(1, params?.limit ?? this.DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  /**
   * Creates a standardized paginated result object
   */
  private createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  // ==================== USER METHODS ====================

  async getUser(id: string): Promise<User | undefined> {
    if (!id) {
      throw new ValidationError("User ID is required");
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) {
      throw new ValidationError("Username is required");
    }
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) {
      throw new ValidationError("Email is required");
    }
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Check for existing username
    const existingUsername = await this.getUserByUsername(insertUser.username);
    if (existingUsername) {
      throw new DuplicateError("User", "username", insertUser.username);
    }

    // Check for existing email
    const existingEmail = await this.getUserByEmail(insertUser.email);
    if (existingEmail) {
      throw new DuplicateError("User", "email", insertUser.email);
    }

    const [user] = await db.insert(users).values(insertUser).returning();
    if (!user) {
      throw new StorageError("Failed to create user", "CREATE_FAILED");
    }
    return user;
  }

  async updateUser(id: string, userData: UpdateUser): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) {
      throw new NotFoundError("User", id);
    }

    // Check for duplicate username if being updated
    if (userData.username && userData.username !== existing.username) {
      const existingUsername = await this.getUserByUsername(userData.username);
      if (existingUsername) {
        throw new DuplicateError("User", "username", userData.username);
      }
    }

    // Check for duplicate email if being updated
    if (userData.email && userData.email !== existing.email) {
      const existingEmail = await this.getUserByEmail(userData.email);
      if (existingEmail) {
        throw new DuplicateError("User", "email", userData.email);
      }
    }

    const [updated] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update user", "UPDATE_FAILED");
    }
    return updated;
  }

  async searchUsers(query: string, pagination?: PaginationParams): Promise<PaginatedResult<User>> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError("Search query is required");
    }

    const { page, limit, offset } = this.normalizePagination(pagination);
    const searchPattern = `%${query.trim()}%`;

    const whereClause = or(
      ilike(users.username, searchPattern),
      ilike(users.email, searchPattern),
      ilike(users.firstName, searchPattern),
      ilike(users.lastName, searchPattern)
    );

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(asc(users.lastName), asc(users.firstName))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(users)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async deactivateUser(id: string): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) {
      throw new NotFoundError("User", id);
    }

    if (!existing.isActive) {
      throw new ValidationError("User is already deactivated");
    }

    const [updated] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to deactivate user", "UPDATE_FAILED");
    }
    return updated;
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const existing = await this.getUser(id);
    if (!existing) {
      throw new NotFoundError("User", id);
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update user role", "UPDATE_FAILED");
    }
    return updated;
  }

  async getUsersByRole(role: UserRole, pagination?: PaginationParams): Promise<PaginatedResult<User>> {
    const { page, limit, offset } = this.normalizePagination(pagination);

    const whereClause = eq(users.role, role);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(asc(users.lastName), asc(users.firstName))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(users)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async getAllUsers(pagination?: PaginationParams): Promise<PaginatedResult<User>> {
    const { page, limit, offset } = this.normalizePagination(pagination);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(users)
        .orderBy(asc(users.lastName), asc(users.firstName))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(users),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  // ==================== PATIENT METHODS ====================

  async createPatient(patient: InsertPatient): Promise<Patient> {
    // Convert dateOfBirth to string format if it's a Date object
    const patientData = {
      ...patient,
      dateOfBirth: patient.dateOfBirth instanceof Date
        ? patient.dateOfBirth.toISOString().split('T')[0]
        : patient.dateOfBirth,
    };
    const [newPatient] = await db.insert(patients).values(patientData).returning();
    if (!newPatient) {
      throw new StorageError("Failed to create patient", "CREATE_FAILED");
    }
    return newPatient;
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    if (!id) {
      throw new ValidationError("Patient ID is required");
    }
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async updatePatient(id: string, patientData: UpdatePatient): Promise<Patient> {
    const existing = await this.getPatient(id);
    if (!existing) {
      throw new NotFoundError("Patient", id);
    }

    const updateData = {
      ...patientData,
      updatedAt: new Date(),
      // Convert dateOfBirth to string format if it's a Date object
      dateOfBirth: patientData.dateOfBirth instanceof Date
        ? patientData.dateOfBirth.toISOString().split('T')[0]
        : patientData.dateOfBirth,
    };

    const [updated] = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update patient", "UPDATE_FAILED");
    }
    return updated;
  }

  async getAllPatients(pagination?: PaginationParams): Promise<PaginatedResult<Patient>> {
    const { page, limit, offset } = this.normalizePagination(pagination);

    // Only return active patients by default
    const whereClause = eq(patients.isActive, true);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(patients)
        .where(whereClause)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(patients)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async searchPatients(query: string, pagination?: PaginationParams): Promise<PaginatedResult<Patient>> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError("Search query is required");
    }

    const { page, limit, offset } = this.normalizePagination(pagination);
    const searchPattern = `%${query.trim()}%`;

    const whereClause = and(
      eq(patients.isActive, true),
      or(
        ilike(patients.name, searchPattern),
        ilike(patients.clientName, searchPattern),
        ilike(patients.microchipNumber, searchPattern),
        ilike(patients.clientEmail, searchPattern),
        ilike(patients.clientPhone, searchPattern),
        ilike(patients.species, searchPattern),
        ilike(patients.breed, searchPattern)
      )
    );

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(patients)
        .where(whereClause)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(patients)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async getPatientWithFullHistory(id: string): Promise<PatientWithFullHistory | undefined> {
    if (!id) {
      throw new ValidationError("Patient ID is required");
    }

    const result = await db.query.patients.findFirst({
      where: eq(patients.id, id),
      with: {
        exams: {
          orderBy: [desc(exams.examDate)],
        },
        vaccinations: {
          orderBy: [desc(vaccinationRecords.dateAdministered)],
        },
      },
    });

    return result as PatientWithFullHistory | undefined;
  }

  async softDeletePatient(id: string): Promise<Patient> {
    const existing = await this.getPatient(id);
    if (!existing) {
      throw new NotFoundError("Patient", id);
    }

    if (!existing.isActive) {
      throw new ValidationError("Patient is already inactive");
    }

    const [updated] = await db
      .update(patients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to soft delete patient", "UPDATE_FAILED");
    }
    return updated;
  }

  // ==================== EXAM METHODS ====================

  async createExam(exam: InsertExam): Promise<Exam> {
    // Verify patient exists
    const patient = await this.getPatient(exam.patientId);
    if (!patient) {
      throw new NotFoundError("Patient", exam.patientId);
    }

    if (!patient.isActive) {
      throw new ValidationError("Cannot create exam for inactive patient");
    }

    const [newExam] = await db
      .insert(exams)
      .values({
        ...exam,
        examDate: new Date(exam.examDate),
      })
      .returning();

    if (!newExam) {
      throw new StorageError("Failed to create exam", "CREATE_FAILED");
    }
    return newExam;
  }

  async getExam(id: string): Promise<Exam | undefined> {
    if (!id) {
      throw new ValidationError("Exam ID is required");
    }
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam || undefined;
  }

  async getExamWithPatient(id: string): Promise<ExamWithPatient | undefined> {
    if (!id) {
      throw new ValidationError("Exam ID is required");
    }
    const result = await db.query.exams.findFirst({
      where: eq(exams.id, id),
      with: {
        patient: true,
      },
    });
    return result as ExamWithPatient | undefined;
  }

  async getExamWithFindings(id: string): Promise<ExamWithFindings | undefined> {
    if (!id) {
      throw new ValidationError("Exam ID is required");
    }
    const result = await db.query.exams.findFirst({
      where: eq(exams.id, id),
      with: {
        patient: true,
        findings: true,
      },
    });
    return result as ExamWithFindings | undefined;
  }

  async getAllExamsWithPatients(pagination?: PaginationParams): Promise<PaginatedResult<ExamWithPatient>> {
    const { page, limit, offset } = this.normalizePagination(pagination);

    const [data, countResult] = await Promise.all([
      db.query.exams.findMany({
        with: {
          patient: true,
        },
        orderBy: [desc(exams.examDate)],
        limit,
        offset,
      }),
      db.select({ count: count() }).from(exams),
    ]);

    return this.createPaginatedResult(
      data as ExamWithPatient[],
      countResult[0]?.count ?? 0,
      page,
      limit
    );
  }

  async getExamsByPatient(patientId: string, pagination?: PaginationParams): Promise<PaginatedResult<Exam>> {
    if (!patientId) {
      throw new ValidationError("Patient ID is required");
    }

    const { page, limit, offset } = this.normalizePagination(pagination);
    const whereClause = eq(exams.patientId, patientId);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(exams)
        .where(whereClause)
        .orderBy(desc(exams.examDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(exams)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async updateExam(id: string, examData: Partial<InsertExam>): Promise<Exam> {
    const existing = await this.getExam(id);
    if (!existing) {
      throw new NotFoundError("Exam", id);
    }

    if (existing.status === "signed") {
      throw new ValidationError("Cannot modify a signed exam");
    }

    const updateData: Record<string, unknown> = { ...examData };
    if (examData.examDate) {
      updateData.examDate = new Date(examData.examDate);
    }
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(exams)
      .set(updateData)
      .where(eq(exams.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update exam", "UPDATE_FAILED");
    }
    return updated;
  }

  async signExam(id: string, examinerId: string): Promise<Exam> {
    const existing = await this.getExam(id);
    if (!existing) {
      throw new NotFoundError("Exam", id);
    }

    if (existing.status === "signed") {
      throw new ValidationError("Exam is already signed");
    }

    // Verify examiner exists
    const examiner = await this.getUser(examinerId);
    if (!examiner) {
      throw new NotFoundError("User", examinerId);
    }

    if (examiner.role !== "veterinarian" && examiner.role !== "admin") {
      throw new ValidationError("Only veterinarians or admins can sign exams");
    }

    const [updated] = await db
      .update(exams)
      .set({
        status: "signed",
        examinerId,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to sign exam", "UPDATE_FAILED");
    }
    return updated;
  }

  async deleteExam(id: string): Promise<void> {
    const existing = await this.getExam(id);
    if (!existing) {
      throw new NotFoundError("Exam", id);
    }

    if (existing.status === "signed") {
      throw new ValidationError("Cannot delete a signed exam");
    }

    await db.delete(exams).where(eq(exams.id, id));
  }

  // ==================== EXAM FINDING METHODS ====================

  async createExamFinding(finding: InsertExamFinding): Promise<ExamFinding> {
    // Verify exam exists
    const exam = await this.getExam(finding.examId);
    if (!exam) {
      throw new NotFoundError("Exam", finding.examId);
    }

    if (exam.status === "signed") {
      throw new ValidationError("Cannot add findings to a signed exam");
    }

    const [newFinding] = await db.insert(examFindings).values(finding).returning();
    if (!newFinding) {
      throw new StorageError("Failed to create exam finding", "CREATE_FAILED");
    }
    return newFinding;
  }

  async getExamFindings(examId: string): Promise<ExamFinding[]> {
    if (!examId) {
      throw new ValidationError("Exam ID is required");
    }
    return db.select().from(examFindings).where(eq(examFindings.examId, examId));
  }

  async updateExamFinding(id: string, findingData: Partial<InsertExamFinding>): Promise<ExamFinding> {
    const [existing] = await db
      .select()
      .from(examFindings)
      .where(eq(examFindings.id, id));

    if (!existing) {
      throw new NotFoundError("ExamFinding", id);
    }

    // Check if parent exam is signed
    const exam = await this.getExam(existing.examId);
    if (exam?.status === "signed") {
      throw new ValidationError("Cannot modify findings of a signed exam");
    }

    const [updated] = await db
      .update(examFindings)
      .set({ ...findingData, updatedAt: new Date() })
      .where(eq(examFindings.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update exam finding", "UPDATE_FAILED");
    }
    return updated;
  }

  async deleteExamFinding(id: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(examFindings)
      .where(eq(examFindings.id, id));

    if (!existing) {
      throw new NotFoundError("ExamFinding", id);
    }

    // Check if parent exam is signed
    const exam = await this.getExam(existing.examId);
    if (exam?.status === "signed") {
      throw new ValidationError("Cannot delete findings from a signed exam");
    }

    await db.delete(examFindings).where(eq(examFindings.id, id));
  }

  // ==================== TRANSACTION METHODS ====================

  /**
   * Creates an exam with findings in a single transaction.
   * If any part fails, the entire operation is rolled back.
   */
  async createExamWithFindings(
    examData: InsertExam,
    findingsData: InsertExamFinding[]
  ): Promise<{ exam: Exam; findings: ExamFinding[] }> {
    // Verify patient exists before starting transaction
    const patient = await this.getPatient(examData.patientId);
    if (!patient) {
      throw new NotFoundError("Patient", examData.patientId);
    }

    if (!patient.isActive) {
      throw new ValidationError("Cannot create exam for inactive patient");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Create the exam
      const examResult = await client.query(
        `INSERT INTO exams (patient_id, exam_date, examiner, examiner_id, presenting_complaint, plan_notes, status, generated_report)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          examData.patientId,
          new Date(examData.examDate),
          examData.examiner || null,
          examData.examinerId || null,
          examData.presentingComplaint || null,
          examData.planNotes || null,
          examData.status || "draft",
          examData.generatedReport || null,
        ]
      );

      if (examResult.rows.length === 0) {
        throw new Error("Failed to insert exam");
      }

      const exam = this.mapExamRow(examResult.rows[0]);

      // Create all findings
      const findings: ExamFinding[] = [];
      for (const findingData of findingsData) {
        const findingResult = await client.query(
          `INSERT INTO exam_findings (exam_id, system_name, is_normal, severity, findings, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            exam.id,
            findingData.systemName,
            findingData.isNormal ?? true,
            findingData.severity || null,
            findingData.findings ? JSON.stringify(findingData.findings) : null,
            findingData.notes || null,
          ]
        );

        if (findingResult.rows.length === 0) {
          throw new Error(`Failed to insert finding for system: ${findingData.systemName}`);
        }

        findings.push(this.mapExamFindingRow(findingResult.rows[0]));
      }

      await client.query("COMMIT");

      return { exam, findings };
    } catch (error) {
      await client.query("ROLLBACK");
      throw new TransactionError(
        "Failed to create exam with findings",
        error instanceof Error ? error : undefined
      );
    } finally {
      client.release();
    }
  }

  /**
   * Maps a raw database row to an Exam object
   */
  private mapExamRow(row: Record<string, unknown>): Exam {
    return {
      id: row.id as string,
      patientId: row.patient_id as string,
      examDate: new Date(row.exam_date as string),
      examiner: row.examiner as string | null,
      examinerId: row.examiner_id as string | null,
      presentingComplaint: row.presenting_complaint as string | null,
      planNotes: row.plan_notes as string | null,
      status: row.status as string,
      generatedReport: row.generated_report as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Maps a raw database row to an ExamFinding object
   */
  private mapExamFindingRow(row: Record<string, unknown>): ExamFinding {
    return {
      id: row.id as string,
      examId: row.exam_id as string,
      systemName: row.system_name as string,
      isNormal: row.is_normal as boolean,
      severity: row.severity as string | null,
      findings: row.findings as unknown,
      notes: row.notes as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ==================== VACCINATION RECORD METHODS ====================

  async createVaccinationRecord(record: InsertVaccinationRecord): Promise<VaccinationRecord> {
    // Verify patient exists
    const patient = await this.getPatient(record.patientId);
    if (!patient) {
      throw new NotFoundError("Patient", record.patientId);
    }

    if (!patient.isActive) {
      throw new ValidationError("Cannot create vaccination record for inactive patient");
    }

    // Verify administeredBy user exists if provided
    if (record.administeredById) {
      const user = await this.getUser(record.administeredById);
      if (!user) {
        throw new NotFoundError("User", record.administeredById);
      }
    }

    const [newRecord] = await db
      .insert(vaccinationRecords)
      .values({
        ...record,
        dateAdministered: new Date(record.dateAdministered),
        expirationDate: record.expirationDate ? new Date(record.expirationDate) : null,
      })
      .returning();

    if (!newRecord) {
      throw new StorageError("Failed to create vaccination record", "CREATE_FAILED");
    }
    return newRecord;
  }

  async getVaccinationRecord(id: string): Promise<VaccinationRecord | undefined> {
    if (!id) {
      throw new ValidationError("Vaccination record ID is required");
    }
    const [record] = await db
      .select()
      .from(vaccinationRecords)
      .where(eq(vaccinationRecords.id, id));
    return record || undefined;
  }

  async getVaccinationsByPatient(
    patientId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<VaccinationRecord>> {
    if (!patientId) {
      throw new ValidationError("Patient ID is required");
    }

    const { page, limit, offset } = this.normalizePagination(pagination);
    const whereClause = eq(vaccinationRecords.patientId, patientId);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(vaccinationRecords)
        .where(whereClause)
        .orderBy(desc(vaccinationRecords.dateAdministered))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(vaccinationRecords)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async getUpcomingVaccinations(
    daysAhead: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<VaccinationRecord>> {
    if (daysAhead < 0) {
      throw new ValidationError("daysAhead must be a non-negative number");
    }

    const { page, limit, offset } = this.normalizePagination(pagination);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Find vaccinations where expiration date is between now and futureDate
    const whereClause = and(
      gte(vaccinationRecords.expirationDate, now),
      lte(vaccinationRecords.expirationDate, futureDate)
    );

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(vaccinationRecords)
        .where(whereClause)
        .orderBy(asc(vaccinationRecords.expirationDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(vaccinationRecords)
        .where(whereClause),
    ]);

    return this.createPaginatedResult(data, countResult[0]?.count ?? 0, page, limit);
  }

  async updateVaccinationRecord(
    id: string,
    recordData: UpdateVaccinationRecord
  ): Promise<VaccinationRecord> {
    const existing = await this.getVaccinationRecord(id);
    if (!existing) {
      throw new NotFoundError("VaccinationRecord", id);
    }

    const updateData: Record<string, unknown> = { ...recordData };
    if (recordData.dateAdministered) {
      updateData.dateAdministered = new Date(recordData.dateAdministered);
    }
    if (recordData.expirationDate) {
      updateData.expirationDate = new Date(recordData.expirationDate);
    }

    const [updated] = await db
      .update(vaccinationRecords)
      .set(updateData)
      .where(eq(vaccinationRecords.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update vaccination record", "UPDATE_FAILED");
    }
    return updated;
  }

  async deleteVaccinationRecord(id: string): Promise<void> {
    const existing = await this.getVaccinationRecord(id);
    if (!existing) {
      throw new NotFoundError("VaccinationRecord", id);
    }

    await db.delete(vaccinationRecords).where(eq(vaccinationRecords.id, id));
  }

  // ==================== CLINIC SETTINGS METHODS ====================

  async getClinicSettings(): Promise<ClinicSettings | undefined> {
    const [settings] = await db
      .select()
      .from(clinicSettings)
      .orderBy(desc(clinicSettings.createdAt))
      .limit(1);
    return settings || undefined;
  }

  async createClinicSettings(settings: InsertClinicSettings): Promise<ClinicSettings> {
    // Check if settings already exist
    const existing = await this.getClinicSettings();
    if (existing) {
      throw new DuplicateError("ClinicSettings", "id", existing.id);
    }

    const [newSettings] = await db.insert(clinicSettings).values(settings).returning();
    if (!newSettings) {
      throw new StorageError("Failed to create clinic settings", "CREATE_FAILED");
    }
    return newSettings;
  }

  async updateClinicSettings(
    id: string,
    settingsData: UpdateClinicSettings
  ): Promise<ClinicSettings> {
    const [existing] = await db
      .select()
      .from(clinicSettings)
      .where(eq(clinicSettings.id, id));

    if (!existing) {
      throw new NotFoundError("ClinicSettings", id);
    }

    const [updated] = await db
      .update(clinicSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(clinicSettings.id, id))
      .returning();

    if (!updated) {
      throw new StorageError("Failed to update clinic settings", "UPDATE_FAILED");
    }
    return updated;
  }
}

export const storage = new DatabaseStorage();
