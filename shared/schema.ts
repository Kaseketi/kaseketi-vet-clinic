import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ==================== USERS TABLE ====================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("receptionist"), // admin, veterinarian, technician, receptionist
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email),
  uniqueIndex("users_username_idx").on(table.username),
  index("users_role_idx").on(table.role),
  index("users_is_active_idx").on(table.isActive),
]);

export const usersRelations = relations(users, ({ many }) => ({
  exams: many(exams),
  vaccinationsAdministered: many(vaccinationRecords),
}));

// ==================== PATIENTS TABLE ====================
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  sex: text("sex").notNull(),
  neuterStatus: text("neuter_status").notNull(),
  age: text("age"),
  dateOfBirth: date("date_of_birth"),
  weight: text("weight"),
  color: text("color"),
  markings: text("markings"),
  microchipNumber: text("microchip_number"),
  allergies: jsonb("allergies").$type<string[]>(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("patients_species_idx").on(table.species),
  index("patients_client_name_idx").on(table.clientName),
  index("patients_client_email_idx").on(table.clientEmail),
  index("patients_microchip_idx").on(table.microchipNumber),
  index("patients_is_active_idx").on(table.isActive),
  index("patients_created_at_idx").on(table.createdAt),
]);

export const patientsRelations = relations(patients, ({ many }) => ({
  exams: many(exams),
  vaccinations: many(vaccinationRecords),
}));

// ==================== EXAMS TABLE ====================
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  examDate: timestamp("exam_date").notNull(),
  examiner: text("examiner"),
  examinerId: varchar("examiner_id").references(() => users.id, { onDelete: "set null" }),
  presentingComplaint: text("presenting_complaint"),
  planNotes: text("plan_notes"),
  status: text("status").notNull().default("draft"), // draft, in-progress, completed, signed
  generatedReport: text("generated_report"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("exams_patient_id_idx").on(table.patientId),
  index("exams_examiner_id_idx").on(table.examinerId),
  index("exams_exam_date_idx").on(table.examDate),
  index("exams_status_idx").on(table.status),
  index("exams_created_at_idx").on(table.createdAt),
]);

export const examsRelations = relations(exams, ({ one, many }) => ({
  patient: one(patients, {
    fields: [exams.patientId],
    references: [patients.id],
  }),
  examinerUser: one(users, {
    fields: [exams.examinerId],
    references: [users.id],
  }),
  findings: many(examFindings),
}));

// ==================== EXAM FINDINGS TABLE ====================
export const examFindings = pgTable("exam_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  systemName: text("system_name").notNull(),
  isNormal: boolean("is_normal").notNull().default(true),
  severity: text("severity"), // mild, moderate, severe
  findings: jsonb("findings"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("exam_findings_exam_id_idx").on(table.examId),
  index("exam_findings_system_name_idx").on(table.systemName),
  index("exam_findings_is_normal_idx").on(table.isNormal),
]);

export const examFindingsRelations = relations(examFindings, ({ one }) => ({
  exam: one(exams, {
    fields: [examFindings.examId],
    references: [exams.id],
  }),
}));

// ==================== VACCINATION RECORDS TABLE ====================
export const vaccinationRecords = pgTable("vaccination_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  vaccineName: text("vaccine_name").notNull(),
  dateAdministered: timestamp("date_administered").notNull(),
  expirationDate: timestamp("expiration_date"),
  lotNumber: text("lot_number"),
  administeredById: varchar("administered_by_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("vaccination_records_patient_id_idx").on(table.patientId),
  index("vaccination_records_vaccine_name_idx").on(table.vaccineName),
  index("vaccination_records_date_administered_idx").on(table.dateAdministered),
  index("vaccination_records_expiration_date_idx").on(table.expirationDate),
  index("vaccination_records_administered_by_idx").on(table.administeredById),
]);

export const vaccinationRecordsRelations = relations(vaccinationRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [vaccinationRecords.patientId],
    references: [patients.id],
  }),
  administeredBy: one(users, {
    fields: [vaccinationRecords.administeredById],
    references: [users.id],
  }),
}));

// ==================== CLINIC SETTINGS TABLE ====================
export const clinicSettings = pgTable("clinic_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicName: text("clinic_name").notNull(),
  clinicAddress: text("clinic_address"),
  clinicPhone: text("clinic_phone"),
  clinicEmail: text("clinic_email"),
  clinicLogo: text("clinic_logo"), // URL to logo image
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== ZOD SCHEMAS ====================

// User role enum for validation
export const userRoleEnum = z.enum(["admin", "veterinarian", "technician", "receptionist"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// Exam status enum for validation
export const examStatusEnum = z.enum(["draft", "in-progress", "completed", "signed"]);
export type ExamStatus = z.infer<typeof examStatusEnum>;

// Severity enum for validation
export const severityEnum = z.enum(["mild", "moderate", "severe"]);
export type Severity = z.infer<typeof severityEnum>;

// User schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address"),
  role: userRoleEnum,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = insertUserSchema.partial().omit({
  password: true,
});

// Patient schemas
export const insertPatientSchema = createInsertSchema(patients, {
  name: z.string().min(1, "Patient name is required"),
  species: z.string().min(1, "Species is required"),
  sex: z.string().min(1, "Sex is required"),
  neuterStatus: z.string().min(1, "Neuter status is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  dateOfBirth: z.coerce.date().optional(),
  allergies: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePatientSchema = insertPatientSchema.partial();

// Exam schemas
export const insertExamSchema = createInsertSchema(exams, {
  examDate: z.coerce.date(),
  status: examStatusEnum.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateExamSchema = insertExamSchema.partial();

// Exam finding schemas
export const insertExamFindingSchema = createInsertSchema(examFindings, {
  severity: severityEnum.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateExamFindingSchema = insertExamFindingSchema.partial();

// Vaccination record schemas
export const insertVaccinationRecordSchema = createInsertSchema(vaccinationRecords, {
  vaccineName: z.string().min(1, "Vaccine name is required"),
  dateAdministered: z.coerce.date(),
  expirationDate: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const updateVaccinationRecordSchema = insertVaccinationRecordSchema.partial();

// Clinic settings schemas
export const insertClinicSettingsSchema = createInsertSchema(clinicSettings, {
  clinicName: z.string().min(1, "Clinic name is required"),
  clinicEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  clinicLogo: z.string().url("Invalid URL").optional().or(z.literal("")),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateClinicSettingsSchema = insertClinicSettingsSchema.partial();

// ==================== TYPESCRIPT TYPES ====================

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type InsertExamFinding = z.infer<typeof insertExamFindingSchema>;
export type InsertVaccinationRecord = z.infer<typeof insertVaccinationRecordSchema>;
export type InsertClinicSettings = z.infer<typeof insertClinicSettingsSchema>;

// Update types
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;
export type UpdateExam = z.infer<typeof updateExamSchema>;
export type UpdateExamFinding = z.infer<typeof updateExamFindingSchema>;
export type UpdateVaccinationRecord = z.infer<typeof updateVaccinationRecordSchema>;
export type UpdateClinicSettings = z.infer<typeof updateClinicSettingsSchema>;

// Select types (inferred from tables)
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type ExamFinding = typeof examFindings.$inferSelect;
export type VaccinationRecord = typeof vaccinationRecords.$inferSelect;
export type ClinicSettings = typeof clinicSettings.$inferSelect;

// ==================== INTERFACE TYPES ====================

export interface SystemField {
  name: string;
  label: string;
  type: "checkbox" | "select" | "multiselect" | "numeric" | "text";
  options?: string[];
  defaultValue?: string | number | boolean;
  unit?: string;
}

export interface ExamSystemConfig {
  name: string;
  displayName: string;
  displayOrder: number;
  defaultNormalText: string;
  fields: SystemField[];
}

// Extended types with relations
export interface ExamWithPatient extends Exam {
  patient: Patient;
}

export interface ExamWithFindings extends Exam {
  patient: Patient;
  findings: ExamFinding[];
}

export interface ExamWithFullDetails extends Exam {
  patient: Patient;
  findings: ExamFinding[];
  examinerUser?: User | null;
}

export interface PatientWithExams extends Patient {
  exams: Exam[];
}

export interface PatientWithVaccinations extends Patient {
  vaccinations: VaccinationRecord[];
}

export interface PatientWithFullHistory extends Patient {
  exams: Exam[];
  vaccinations: VaccinationRecord[];
}

export interface VaccinationRecordWithDetails extends VaccinationRecord {
  patient: Patient;
  administeredBy?: User | null;
}

// User without sensitive data for API responses
export type SafeUser = Omit<User, "password">;

// ==================== AUTHENTICATION SCHEMAS ====================

export const registerUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: userRoleEnum.optional().default("receptionist"),
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
