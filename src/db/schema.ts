import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["doctor", "patient"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "completed",
  "abandoned",
]);

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  specialty: varchar("specialty", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Patients ──────────────────────────────────────────────────────────────────
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .references(() => doctors.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  diagnosis: text("diagnosis"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Prescribed Routines ───────────────────────────────────────────────────────
export const prescribedRoutines = pgTable("prescribed_routines", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => doctors.id, { onDelete: "set null" }),
  exerciseName: varchar("exercise_name", { length: 255 }).notNull(),
  exerciseType: varchar("exercise_type", { length: 100 }).notNull().default("squat"),
  targetReps: integer("target_reps").notNull().default(10),
  targetSets: integer("target_sets").notNull().default(3),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Session Telemetry ─────────────────────────────────────────────────────────
export const sessionTelemetry = pgTable("session_telemetry", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  routineId: uuid("routine_id")
    .references(() => prescribedRoutines.id, { onDelete: "set null" }),
  // Core Rep Metrics
  totalReps: integer("total_reps").notNull().default(0),
  targetReps: integer("target_reps").notNull().default(10),
  completionRate: real("completion_rate").notNull().default(0), // 0.0 – 1.0
  // Range of Motion (degrees)
  avgKneeFlexionAngle: real("avg_knee_flexion_angle"), // avg depth across all reps
  minKneeFlexionAngle: real("min_knee_flexion_angle"), // deepest squat achieved
  maxKneeFlexionAngle: real("max_knee_flexion_angle"), // shallowest (closest to standing)
  // Form Errors
  valgusCollapseCount: integer("valgus_collapse_count").notNull().default(0),
  formErrorCount: integer("form_error_count").notNull().default(0),
  // Session Metadata
  durationSeconds: integer("duration_seconds"),
  status: sessionStatusEnum("status").notNull().default("completed"),
  exerciseType: varchar("exercise_type", { length: 100 }).notNull().default("squat"),
  sessionDate: timestamp("session_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const doctorsRelations = relations(doctors, ({ many }) => ({
  patients: many(patients),
  prescribedRoutines: many(prescribedRoutines),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  doctor: one(doctors, {
    fields: [patients.doctorId],
    references: [doctors.id],
  }),
  prescribedRoutines: many(prescribedRoutines),
  sessionTelemetry: many(sessionTelemetry),
}));

export const prescribedRoutinesRelations = relations(
  prescribedRoutines,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [prescribedRoutines.patientId],
      references: [patients.id],
    }),
    doctor: one(doctors, {
      fields: [prescribedRoutines.doctorId],
      references: [doctors.id],
    }),
    sessions: many(sessionTelemetry),
  })
);

export const sessionTelemetryRelations = relations(
  sessionTelemetry,
  ({ one }) => ({
    patient: one(patients, {
      fields: [sessionTelemetry.patientId],
      references: [patients.id],
    }),
    routine: one(prescribedRoutines, {
      fields: [sessionTelemetry.routineId],
      references: [prescribedRoutines.id],
    }),
  })
);

// ── TypeScript Inferred Types ─────────────────────────────────────────────────
export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PrescribedRoutine = typeof prescribedRoutines.$inferSelect;
export type NewPrescribedRoutine = typeof prescribedRoutines.$inferInsert;
export type SessionTelemetry = typeof sessionTelemetry.$inferSelect;
export type NewSessionTelemetry = typeof sessionTelemetry.$inferInsert;
