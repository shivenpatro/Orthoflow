"use client";

/**
 * Doctor Dashboard — /doctor/dashboard
 *
 * Shows a list of patients with their session compliance stats
 * and ROM (range of motion) progress charts using Recharts.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SessionTelemetry, Patient } from "@/db/schema";

// ── Types (extended with nested relations) ────────────────────────────────────
type PatientWithSessions = Patient & {
  sessionTelemetry: SessionTelemetry[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avgOf(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const [patients, setPatients] = useState<PatientWithSessions[]>([]);
  const [selected, setSelected] = useState<PatientWithSessions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data: { patients: PatientWithSessions[] }) => {
        setPatients(data.patients);
        if (data.patients.length > 0) setSelected(data.patients[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derived chart data for selected patient
  const chartData = (selected?.sessionTelemetry ?? [])
    .slice()
    .reverse()
    .map((s) => ({
      date: formatDate(s.sessionDate),
      reps: s.totalReps,
      depth: s.avgKneeFlexionAngle ? Math.round(s.avgKneeFlexionAngle) : null,
      errors: s.valgusCollapseCount,
    }));

  const avgCompliance = selected?.sessionTelemetry.length
    ? Math.round(
        (avgOf(selected.sessionTelemetry.map((s) => s.completionRate)) ?? 0) * 100
      )
    : 0;

  const totalSessions = selected?.sessionTelemetry.length ?? 0;
  const totalErrors = selected?.sessionTelemetry.reduce(
    (a, s) => a + s.valgusCollapseCount, 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-6 lg:p-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            OrthoFlow <span className="text-indigo-400">Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Patient compliance & ROM progress</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Live DB</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Patient list */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-1"
        >
          <Card className="bg-white/5 border-white/8 text-white">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 uppercase tracking-wider font-medium">
                My Patients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>
              ) : patients.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No patients found.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {patients.map((p) => {
                    const isActive = selected?.id === p.id;
                    const lastSession = p.sessionTelemetry[0];
                    const compliance = lastSession
                      ? Math.round(lastSession.completionRate * 100)
                      : null;

                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => setSelected(p)}
                          className={`w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                            isActive ? "bg-indigo-500/10 border-l-2 border-indigo-400" : ""
                          }`}
                        >
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="bg-indigo-600/30 text-indigo-200 text-xs font-bold">
                              {initials(p.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-slate-300"}`}>
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{p.diagnosis ?? "No diagnosis"}</p>
                          </div>
                          {compliance !== null && (
                            <Badge
                              className={`text-[10px] shrink-0 ${
                                compliance >= 80
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : compliance >= 50
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-red-500/20 text-red-300 border-red-500/30"
                              }`}
                            >
                              {compliance}%
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts & stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 flex flex-col gap-6"
        >
          {selected ? (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Sessions", value: totalSessions, color: "text-indigo-400" },
                  { label: "Avg Compliance", value: `${avgCompliance}%`, color: avgCompliance >= 80 ? "text-emerald-400" : "text-amber-400" },
                  { label: "Form Errors", value: totalErrors, color: totalErrors > 5 ? "text-red-400" : "text-emerald-400" },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-white/5 border-white/8">
                    <CardContent className="pt-5 pb-4 px-5">
                      <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ROM Progress Chart */}
              <Card className="bg-white/5 border-white/8">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Knee Flexion Depth (°) — ROM Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No sessions yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis domain={[60, 180]} reversed tick={{ fill: "#64748b", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ background: "#1e1e30", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#a5b4fc" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="depth"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ fill: "#6366f1", r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Avg Depth (°)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Compliance Bar Chart */}
              <Card className="bg-white/5 border-white/8">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Rep Compliance & Form Errors per Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No sessions yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ background: "#1e1e30", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                        <Bar dataKey="reps" fill="#6366f1" radius={[4, 4, 0, 0]} name="Reps Completed" />
                        <Bar dataKey="errors" fill="#ef4444" radius={[4, 4, 0, 0]} name="Form Errors" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Session history table */}
              <Card className="bg-white/5 border-white/8">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Session History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/8 hover:bg-transparent">
                        <TableHead className="text-slate-500 text-xs">Date</TableHead>
                        <TableHead className="text-slate-500 text-xs">Reps</TableHead>
                        <TableHead className="text-slate-500 text-xs">Compliance</TableHead>
                        <TableHead className="text-slate-500 text-xs">Avg Depth</TableHead>
                        <TableHead className="text-slate-500 text-xs">Valgus</TableHead>
                        <TableHead className="text-slate-500 text-xs">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.sessionTelemetry.map((s) => (
                        <TableRow key={s.id} className="border-white/5 hover:bg-white/3">
                          <TableCell className="text-slate-300 text-sm">
                            {formatDate(s.sessionDate)}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {s.totalReps}/{s.targetReps}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${
                              s.completionRate >= 0.8
                                ? "bg-emerald-500/20 text-emerald-300"
                                : s.completionRate >= 0.5
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-red-500/20 text-red-300"
                            }`}>
                              {Math.round(s.completionRate * 100)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {s.avgKneeFlexionAngle
                              ? `${Math.round(s.avgKneeFlexionAngle)}°`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${
                              s.valgusCollapseCount === 0
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }`}>
                              {s.valgusCollapseCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {s.durationSeconds ? `${s.durationSeconds}s` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            !loading && (
              <div className="flex items-center justify-center h-64 text-slate-500">
                Select a patient to view their data
              </div>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}
