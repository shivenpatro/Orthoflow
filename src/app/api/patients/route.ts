import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, doctors } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/patients?doctorId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");

  try {
    const result = doctorId
      ? await db.query.patients.findMany({
          where: eq(patients.doctorId, doctorId),
          with: { sessionTelemetry: { orderBy: (t, { desc }) => [desc(t.sessionDate)], limit: 20 } },
        })
      : await db.query.patients.findMany({
          with: { sessionTelemetry: { orderBy: (t, { desc }) => [desc(t.sessionDate)], limit: 20 } },
        });

    return NextResponse.json({ patients: result });
  } catch (error) {
    console.error("[API /patients] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/patients — create a demo patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name: string; email: string; doctorId?: string };
    const [patient] = await db.insert(patients).values({
      name: body.name,
      email: body.email,
      doctorId: body.doctorId ?? null,
    }).returning();
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error("[API /patients] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
