"use client";

/**
 * ExercisePage — /patient/exercise
 *
 * Full-featured multi-exercise session page with:
 *  - Exercise selector carousel
 *  - Real-time AI skeleton overlay
 *  - TTS coaching with on/off toggle
 *  - Rep + Set counter
 *  - Live angle gauge
 *  - Coaching message feed
 *  - Form error panel
 *  - Session summary with per-rep breakdown
 */

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { usePoseStore } from "@/store/poseStore";
import PoseCanvas from "@/components/exercise/PoseCanvas";
import type { SessionPayload, ExerciseType } from "@/types/pose";
import { EXERCISES, EXERCISE_LIST } from "@/lib/exercises";

const DEMO_PATIENT_ID =
  process.env.NEXT_PUBLIC_DEMO_PATIENT_ID ?? "00000000-0000-0000-0000-000000000002";

// ── Phase colours ──────────────────────────────────────────────────────────────
const PHASE_META: Record<string, { label: string; color: string }> = {
  IDLE:     { label: "Ready",      color: "text-slate-400" },
  START:    { label: "Position",   color: "text-blue-400"   },
  MOVING:   { label: "Moving",     color: "text-amber-400"  },
  HOLD:     { label: "Hold!",      color: "text-violet-400" },
  RETURN:   { label: "Return",     color: "text-cyan-400"   },
  COMPLETE: { label: "Set Done ✓", color: "text-emerald-400"},
};

const SEVERITY_STYLES: Record<string, string> = {
  info:    "border-blue-500/40 bg-blue-500/10 text-blue-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  error:   "border-red-500/40 bg-red-500/10 text-red-300",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

export default function ExercisePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionResult, setSessionResult] = useState<{
    totalReps: number;
    totalSets: number;
    errorCount: number;
    avgAngle: number | null;
    exerciseName: string;
    duration: number;
  } | null>(null);

  usePoseDetection(videoRef);

  const {
    isCameraReady, isWorkerReady, isSessionActive,
    repCount, setCount, repHistory, formErrors,
    exerciseType, exercisePhase, primaryAngle,
    coachMessages, sessionStartTime, ttsEnabled,
    setExerciseType, setTtsEnabled,
    startSession, endSession, resetSession,
  } = usePoseStore();

  const isReady = isCameraReady && isWorkerReady;
  const config = EXERCISES[exerciseType];

  // ── End session → save telemetry ──────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    endSession();
    const durationSec = sessionStartTime
      ? Math.round((Date.now() - sessionStartTime) / 1000)
      : 0;

    const angles = repHistory.map((r) => r.primaryAngle).filter((a) => a > 0);
    const avgAngle = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : null;
    const minAngle = angles.length ? Math.min(...angles) : null;
    const maxAngle = angles.length ? Math.max(...angles) : null;
    const valgusCount = repHistory.filter((r) => r.errors.valgusCollapse).length;
    const errorCount = repHistory.filter((r) => Object.values(r.errors).some(Boolean)).length;

    const payload: SessionPayload = {
      patientId: DEMO_PATIENT_ID,
      exerciseType,
      totalReps: repCount,
      targetReps: config?.targetReps ?? 10,
      completionRate: Math.min(repCount / (config?.targetReps ?? 10), 1),
      avgKneeFlexionAngle: avgAngle,
      minKneeFlexionAngle: minAngle,
      maxKneeFlexionAngle: maxAngle,
      valgusCollapseCount: valgusCount,
      formErrorCount: errorCount,
      durationSeconds: durationSec,
    };

    setIsSaving(true);
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* non-fatal */ }
    finally { setIsSaving(false); }

    setSessionResult({
      totalReps: repCount,
      totalSets: setCount,
      errorCount,
      avgAngle,
      exerciseName: config?.name ?? exerciseType,
      duration: durationSec,
    });
  }, [endSession, repCount, repHistory, sessionStartTime, exerciseType, config, setCount]);

  const handleNewSession = useCallback(() => {
    setSessionResult(null);
    resetSession();
  }, [resetSession]);

  const handleExerciseSelect = useCallback((type: ExerciseType) => {
    if (isSessionActive) return;
    setExerciseType(type);
  }, [isSessionActive, setExerciseType]);

  // ── Post-session summary ────────────────────────────────────────────────────
  if (sessionResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090912] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-7xl mb-4"
          >
            🏆
          </motion.div>
          <h2 className="text-3xl font-black text-white mb-1">Session Complete!</h2>
          <p className="text-slate-400 text-sm mb-2">{sessionResult.exerciseName}</p>
          <p className="text-slate-500 text-xs mb-8">
            Duration: {Math.floor(sessionResult.duration / 60)}m {sessionResult.duration % 60}s
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: "Total Reps", value: sessionResult.totalReps, sub: `/ ${config?.targetReps ?? 10}` },
              { label: "Sets",       value: sessionResult.totalSets, sub: "" },
              { label: "Avg Angle",  value: sessionResult.avgAngle ? `${Math.round(sessionResult.avgAngle)}°` : "—", sub: "" },
              { label: "Errors",     value: sessionResult.errorCount, sub: "reps with errors" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <div className="text-2xl font-black text-white">{stat.value}
                  {stat.sub && <span className="text-sm text-slate-500 ml-1">{stat.sub}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {sessionResult.errorCount === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-emerald-400 text-sm mb-6 font-semibold"
            >
              ✨ Perfect session — zero form errors!
            </motion.p>
          )}

          <button
            onClick={handleNewSession}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            New Session
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main exercise screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#090912] flex flex-col text-white overflow-hidden">
      {/* ── Top bar ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-lg">⚡</div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">OrthoFlow AI</h1>
            <p className="text-[11px] text-slate-500">Real-time Exercise Coach</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {/* TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Mute voice coach" : "Enable voice coach"}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              ttsEnabled
                ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                : "border-slate-700 bg-white/5 text-slate-500"
            }`}
          >
            {ttsEnabled ? "🔊" : "🔇"}
            <span className="hidden sm:inline">{ttsEnabled ? "Voice On" : "Voice Off"}</span>
          </button>
          <StatusDot label="Camera" active={isCameraReady} />
          <StatusDot label="AI" active={isWorkerReady} />
        </div>
      </motion.header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Exercise Selector ── */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-56 shrink-0 border-r border-white/5 flex flex-col gap-1 p-3 overflow-y-auto"
        >
          <p className="text-[10px] text-slate-600 uppercase tracking-widest px-2 mb-2">Exercises</p>
          {EXERCISE_LIST.map((ex) => {
            const isActive = exerciseType === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => handleExerciseSelect(ex.id as ExerciseType)}
                disabled={isSessionActive}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isActive
                    ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                    : "hover:bg-white/5 border border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-xl">{ex.emoji}</span>
                <div>
                  <div className="text-xs font-semibold leading-tight">{ex.name}</div>
                  <div className={`text-[10px] mt-0.5 ${
                    ex.difficulty === "beginner" ? "text-emerald-500" :
                    ex.difficulty === "intermediate" ? "text-amber-500" : "text-red-500"
                  }`}>
                    {ex.difficulty}
                  </div>
                </div>
              </button>
            );
          })}
        </motion.aside>

        {/* ── Center: Camera + Overlay ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 min-w-0">
          {/* Exercise title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={exerciseType}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center"
            >
              <h2 className="text-lg font-bold text-white">
                {config?.emoji} {config?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{config?.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Camera viewport */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="relative w-full max-w-2xl aspect-video bg-slate-950/60 rounded-2xl overflow-hidden border border-white/8 shadow-2xl"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-fill"
              style={{ transform: "scaleX(-1)" }}
              muted playsInline
            />
            <PoseCanvas videoRef={videoRef} />

            {/* Valgus border flash */}
            <AnimatePresence>
              {formErrors.valgusCollapse && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute inset-0 border-4 border-red-500 rounded-2xl pointer-events-none"
                  style={{ boxShadow: "inset 0 0 40px rgba(239,68,68,0.4)" }}
                />
              )}
            </AnimatePresence>

            {/* Loading overlay */}
            <AnimatePresence>
              {!isReady && (
                <motion.div
                  initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-sm text-slate-400">
                    {!isCameraReady ? "Starting camera…" : "Loading AI model…"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Paused overlay */}
            <AnimatePresence>
              {isReady && !isSessionActive && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm gap-4"
                >
                  <div className="text-4xl">{config?.emoji}</div>
                  <p className="text-slate-200 text-lg font-semibold">
                    Press <span className="text-indigo-400 font-black">Start</span> when ready
                  </p>
                  <div className="max-w-xs space-y-1.5">
                    {config?.instructions.map((ins, i) => (
                      <p key={i} className="text-xs text-slate-400 text-center flex items-start gap-2">
                        <span className="text-indigo-500 mt-0.5 shrink-0">{i + 1}.</span> {ins}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase badge */}
            {isSessionActive && (
              <div className="absolute top-3 left-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm ${PHASE_META[exercisePhase]?.color ?? "text-white"}`}>
                  {PHASE_META[exercisePhase]?.label ?? exercisePhase}
                </span>
              </div>
            )}
          </motion.div>

          {/* Coaching message feed */}
          <div className="w-full max-w-2xl h-14 relative overflow-hidden">
            <AnimatePresence mode="popLayout">
              {coachMessages.slice(-1).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border ${SEVERITY_STYLES[msg.severity]}`}
                >
                  <span>{msg.severity === "error" ? "⚠️" : msg.severity === "success" ? "✅" : msg.severity === "warning" ? "📢" : "💬"}</span>
                  {msg.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Session controls */}
          <div className="flex gap-3 w-full max-w-2xl">
            {isSessionActive ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleEndSession}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-40"
                >
                  {isSaving ? "Saving…" : "⏹ End Session"}
                </motion.button>
              </>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startSession}
                disabled={!isReady}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ▶ Start Session
              </motion.button>
            )}
          </div>
        </div>

        {/* ── Right: Stats Panel ── */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-56 shrink-0 border-l border-white/5 flex flex-col gap-3 p-3 overflow-y-auto"
        >
          {/* Rep counter */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Progress</p>
            <RepRing repCount={repCount} targetReps={config?.targetReps ?? 10} />
            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>Set {setCount} / {config?.targetSets ?? 3}</span>
              <span>{config?.targetReps ?? 10} reps/set</span>
            </div>
          </div>

          {/* Angle gauge */}
          <AngleGauge angle={primaryAngle} exerciseType={exerciseType} />

          {/* Form errors */}
          <FormPanel errors={formErrors} />

          {/* Rep history */}
          {repHistory.length > 0 && (
            <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Rep History</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {repHistory.slice(-8).map((rep, i) => {
                  const hasError = Object.values(rep.errors).some(Boolean);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Rep {repHistory.length - (repHistory.slice(-8).length - 1 - i)}</span>
                      <span className={hasError ? "text-red-400" : "text-emerald-400"}>
                        {Math.round(rep.primaryAngle)}{exerciseType === "hand_open_close" ? "%" : "°"}
                        {hasError ? " ⚠" : " ✓"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusDot({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-slate-700"}`} />
      <span className={`text-xs ${active ? "text-slate-400" : "text-slate-600"}`}>{label}</span>
    </div>
  );
}

function RepRing({ repCount, targetReps }: { repCount: number; targetReps: number }) {
  const pct = Math.min(repCount / targetReps, 1);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="40" cy="40" r={r}
            fill="none"
            stroke="url(#repGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ type: "spring", stiffness: 80 }}
          />
          <defs>
            <linearGradient id="repGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={repCount}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-black text-white leading-none"
          >
            {repCount}
          </motion.span>
          <span className="text-[10px] text-slate-500">/ {targetReps}</span>
        </div>
      </div>
    </div>
  );
}

function AngleGauge({ angle, exerciseType }: { angle: number; exerciseType: string }) {
  const isHand = exerciseType === "hand_open_close";
  const displayAngle = isHand ? `${Math.round(angle)}%` : `${Math.round(angle)}°`;

  let color = "text-emerald-400";
  let label = "Standing";

  if (exerciseType === "squat" || exerciseType === "lunge") {
    if (angle < 100) { color = "text-violet-400"; label = "Deep"; }
    else if (angle < 140) { color = "text-amber-400"; label = "Descending"; }
    else { color = "text-emerald-400"; label = "Standing"; }
  } else if (exerciseType === "shoulder_press") {
    if (angle > 155) { color = "text-violet-400"; label = "Extended"; }
    else if (angle > 110) { color = "text-amber-400"; label = "Pressing"; }
    else { color = "text-emerald-400"; label = "Ready"; }
  } else if (exerciseType === "lateral_raise") {
    if (angle > 70) { color = "text-violet-400"; label = "At Height"; }
    else if (angle > 30) { color = "text-amber-400"; label = "Raising"; }
    else { color = "text-emerald-400"; label = "Rest"; }
  } else if (exerciseType === "hand_open_close") {
    if (angle > 60) { color = "text-blue-400"; label = "Open"; }
    else if (angle > 25) { color = "text-amber-400"; label = "Moving"; }
    else { color = "text-emerald-400"; label = "Closed"; }
  }

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Live Angle</p>
      <motion.div
        key={Math.round(angle / 5) * 5} // only animate on 5° changes
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.2 }}
        className={`text-3xl font-black ${color}`}
      >
        {displayAngle}
      </motion.div>
      <p className="text-xs text-slate-600 mt-1">{label}</p>
    </div>
  );
}

function FormPanel({ errors }: { errors: import("@/types/pose").FormErrors }) {
  const rows: { key: keyof typeof errors; label: string; tip: string }[] = [
    { key: "valgusCollapse",    label: "Knee Alignment", tip: "Push knees out" },
    { key: "forwardLean",       label: "Torso Upright",  tip: "Chest tall" },
    { key: "elbowFlare",        label: "Elbow Path",     tip: "Tuck elbows in" },
    { key: "unevenShoulders",   label: "Shoulder Level", tip: "Level up" },
    { key: "excessiveTilt",     label: "Tilt Range",     tip: "Ease back" },
    { key: "asymmetry",         label: "Symmetry",       tip: "Match both sides" },
    { key: "positionLost",      label: "In Frame",       tip: "Step back" },
  ];

  const activeErrors = rows.filter((r) => errors[r.key]);
  const allGood = activeErrors.length === 0;

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Form Check</p>
      {allGood ? (
        <p className="text-xs text-emerald-400 font-semibold">✓ Form looks great!</p>
      ) : (
        <div className="space-y-2">
          {activeErrors.map((r) => (
            <motion.div
              key={r.key}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs text-slate-400">{r.label}</span>
              </div>
              <span className="text-[10px] text-red-400">{r.tip}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
