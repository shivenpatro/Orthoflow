/**
 * seed.ts — Populate the database with demo data for development
 *
 * Run: npx tsx src/db/seed.ts
 *
 * This creates:
 *   - 1 Doctor
 *   - 2 Patients assigned to that doctor
 *   - 1 Prescribed Routine per patient
 *   - 10 Session Telemetry records per patient (simulating 2 weeks of activity)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

async function seed() {
  console.log("🌱 Seeding OrthoFlow database…");

  // ── Doctor ─────────────────────────────────────────────────────────────────
  const [doctor] = await db
    .insert(schema.doctors)
    .values({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Dr. Sarah Chen",
      email: "dr.chen@orthoflow.health",
      specialty: "Sports Physical Therapy",
      licenseNumber: "PT-CA-123456",
    })
    .onConflictDoNothing()
    .returning();

  console.log("✅ Doctor:", doctor?.name ?? "already exists");

  // ── Patients ───────────────────────────────────────────────────────────────
  const patientsData = [
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      diagnosis: "Post-ACL reconstruction rehabilitation",
      dateOfBirth: "1995-07-14",
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Jordan Kim",
      email: "jordan.kim@example.com",
      diagnosis: "Patellofemoral pain syndrome (runner's knee)",
      dateOfBirth: "1988-11-22",
    },
  ];

  const insertedPatients = await db
    .insert(schema.patients)
    .values(patientsData.map((p) => ({ ...p, doctorId: "00000000-0000-0000-0000-000000000001" })))
    .onConflictDoNothing()
    .returning();

  console.log(`✅ Patients: ${insertedPatients.length} inserted (may already exist)`);

  // ── Prescribed Routines ────────────────────────────────────────────────────
  for (const patient of patientsData) {
    await db
      .insert(schema.prescribedRoutines)
      .values({
        patientId: patient.id,
        doctorId: "00000000-0000-0000-0000-000000000001",
        exerciseName: "Bodyweight Squat Protocol",
        exerciseType: "squat",
        targetReps: 10,
        targetSets: 3,
        notes: "Focus on knee tracking and depth. Stop if pain > 3/10.",
      })
      .onConflictDoNothing();
  }

  console.log("✅ Prescribed routines created");

  // ── Session Telemetry (2 weeks simulated) ─────────────────────────────────
  const now = Date.now();
  const DAY = 86400 * 1000;

  for (const patient of patientsData) {
    const sessions = Array.from({ length: 10 }, (_, i) => {
      // Simulate progressive improvement over 2 weeks
      const progressFactor = i / 9; // 0 → 1
      const reps = Math.round(randomBetween(5, 10) + progressFactor * 2);
      const capped = Math.min(reps, 10);
      const avgAngle = randomBetween(125 - progressFactor * 25, 145 - progressFactor * 25);
      const valgus = Math.max(0, Math.round(randomBetween(3, 0) - progressFactor * 3));

      return {
        patientId: patient.id,
        exerciseType: "squat",
        totalReps: capped,
        targetReps: 10,
        completionRate: capped / 10,
        avgKneeFlexionAngle: avgAngle,
        minKneeFlexionAngle: avgAngle - randomBetween(5, 15),
        maxKneeFlexionAngle: avgAngle + randomBetween(10, 30),
        valgusCollapseCount: valgus,
        formErrorCount: valgus,
        durationSeconds: Math.round(randomBetween(180, 420)),
        status: "completed" as const,
        sessionDate: new Date(now - (9 - i) * DAY),
      };
    });

    await db.insert(schema.sessionTelemetry).values(sessions);
  }

  console.log("✅ Session telemetry seeded (10 sessions × 2 patients)");
  console.log("🎉 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
