import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessionTelemetry } from "@/db/schema";
import type { SessionPayload } from "@/types/pose";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionPayload;

    // Basic validation
    if (!body.patientId || typeof body.totalReps !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: patientId, totalReps" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(sessionTelemetry)
      .values({
        patientId: body.patientId,
        routineId: body.routineId ?? null,
        exerciseType: body.exerciseType,
        totalReps: body.totalReps,
        targetReps: body.targetReps,
        completionRate: body.completionRate,
        avgKneeFlexionAngle: body.avgKneeFlexionAngle ?? null,
        minKneeFlexionAngle: body.minKneeFlexionAngle ?? null,
        maxKneeFlexionAngle: body.maxKneeFlexionAngle ?? null,
        valgusCollapseCount: body.valgusCollapseCount,
        formErrorCount: body.formErrorCount,
        durationSeconds: body.durationSeconds,
        status: "completed",
      })
      .returning();

    return NextResponse.json({ success: true, session: inserted }, { status: 201 });
  } catch (error) {
    console.error("[API /session] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sessions = await db.query.sessionTelemetry.findMany({
      with: { patient: true },
      orderBy: (table, { desc }) => [desc(table.sessionDate)],
      limit: 100,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[API /session] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
