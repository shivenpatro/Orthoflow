// ── MediaPipe Landmark ─────────────────────────────────────────────────────────
export interface Landmark {
  x: number;       // normalized 0-1 (horizontal)
  y: number;       // normalized 0-1 (vertical)
  z: number;       // depth relative to hip, normalized
  visibility?: number; // confidence 0-1
}

// ── Exercise Types ─────────────────────────────────────────────────────────────
export type ExerciseType =
  | "squat"
  | "lunge"
  | "shoulder_press"
  | "lateral_raise"
  | "neck_tilt"
  | "hand_open_close";

// ── Exercise Phase State Machine ───────────────────────────────────────────────
export type ExercisePhase =
  | "IDLE"
  | "START"
  | "MOVING"
  | "HOLD"
  | "RETURN"
  | "COMPLETE";

// ── Form Error flags (extended for all exercises) ─────────────────────────────
export interface FormErrors {
  // Lower body
  valgusCollapse: boolean;         // knee caves inward
  insufficientDepth: boolean;      // not reaching target ROM
  forwardLean: boolean;            // torso too far forward
  // Upper body
  elbowFlare: boolean;             // elbow flares during shoulder press
  unevenShoulders: boolean;        // shoulders not level during lateral raise
  // Neck / head
  excessiveTilt: boolean;          // neck tilt beyond range
  // General
  asymmetry: boolean;              // left/right side deviation > threshold
  positionLost: boolean;           // landmarks lost (moved out of frame)
}

// ── Coaching Message ──────────────────────────────────────────────────────────
export interface CoachMessage {
  id: string;           // unique so AnimatePresence picks it up
  text: string;
  severity: "info" | "warning" | "error" | "success";
  speakAloud: boolean;
  timestamp: number;
}

// ── Per-Rep Data (stored for telemetry) ──────────────────────────────────────
export interface RepData {
  primaryAngle: number;      // deepest / peak angle during rep (degrees)
  errors: Partial<FormErrors>;
  durationMs: number;
}

// ── Exercise Configuration ─────────────────────────────────────────────────────
export interface ExerciseConfig {
  id: ExerciseType;
  name: string;
  emoji: string;
  description: string;
  targetReps: number;
  targetSets: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  targetAngle: number;   // goal ROM angle (for depth gauge)
  holdDurationMs?: number; // if exercise needs a hold
  instructions: string[];
  coachCues: {
    start: string;
    good: string;
    depth: string;
    error: string;
    complete: string;
  };
}

// ── Worker → Main Thread Messages ────────────────────────────────────────────
export interface WorkerPoseMessage {
  type: "POSE_RESULT";
  landmarks: Landmark[];
  timestamp: number;
}

export interface WorkerReadyMessage {
  type: "READY";
}

export interface WorkerErrorMessage {
  type: "ERROR";
  error: string;
}

export type WorkerOutboundMessage =
  | WorkerPoseMessage
  | WorkerReadyMessage
  | WorkerErrorMessage;

// ── Main Thread → Worker Messages ────────────────────────────────────────────
export interface WorkerInitMessage {
  type: "INIT";
  wasmPath: string;
  modelPath: string;
}

export interface WorkerFrameMessage {
  type: "FRAME";
  bitmap: ImageBitmap;
  timestamp: number;
}

export type WorkerInboundMessage = WorkerInitMessage | WorkerFrameMessage;

// ── Session Telemetry Payload ─────────────────────────────────────────────────
export interface SessionPayload {
  patientId: string;
  routineId?: string;
  exerciseType: string;
  totalReps: number;
  targetReps: number;
  completionRate: number;
  avgKneeFlexionAngle: number | null;
  minKneeFlexionAngle: number | null;
  maxKneeFlexionAngle: number | null;
  valgusCollapseCount: number;
  formErrorCount: number;
  durationSeconds: number;
}
