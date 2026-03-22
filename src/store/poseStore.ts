import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Landmark, FormErrors, ExerciseType, RepData, CoachMessage, ExercisePhase } from "@/types/pose";

// ── State Shape ───────────────────────────────────────────────────────────────
interface PoseState {
  // Raw landmarks from MediaPipe (33 keypoints)
  landmarks: Landmark[];
  landmarkTimestamp: number;

  // Current exercise
  exerciseType: ExerciseType;

  // Derived kinematics (updated at 30 FPS)
  primaryAngle: number;     // universal: knee angle, elbow angle, tilt angle, openness %
  formErrors: FormErrors;
  exercisePhase: ExercisePhase;

  // Rep tracking
  repCount: number;
  setCount: number;
  repHistory: RepData[];

  // Coaching
  coachMessages: CoachMessage[];
  lastCoachText: string;

  // Session state
  isSessionActive: boolean;
  sessionStartTime: number | null;

  // Camera / worker state
  isCameraReady: boolean;
  isWorkerReady: boolean;
  ttsEnabled: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setLandmarks: (landmarks: Landmark[], timestamp: number) => void;
  setExerciseType: (type: ExerciseType) => void;
  setPrimaryAngle: (angle: number) => void;
  setFormErrors: (errors: FormErrors) => void;
  setExercisePhase: (phase: ExercisePhase) => void;
  incrementRep: (repData: RepData) => void;
  incrementSet: () => void;
  addCoachMessage: (msg: Omit<CoachMessage, "id" | "timestamp">) => void;
  startSession: () => void;
  endSession: () => void;
  setCameraReady: (ready: boolean) => void;
  setWorkerReady: (ready: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  resetSession: () => void;
}

const defaultFormErrors: FormErrors = {
  valgusCollapse: false,
  insufficientDepth: false,
  forwardLean: false,
  elbowFlare: false,
  unevenShoulders: false,
  excessiveTilt: false,
  asymmetry: false,
  positionLost: false,
};

export const usePoseStore = create<PoseState>()(
  subscribeWithSelector((set) => ({
    // ── Initial State ──────────────────────────────────────────────────────────
    landmarks: [],
    landmarkTimestamp: 0,
    exerciseType: "squat",
    primaryAngle: 180,
    formErrors: { ...defaultFormErrors },
    exercisePhase: "IDLE",
    repCount: 0,
    setCount: 1,
    repHistory: [],
    coachMessages: [],
    lastCoachText: "",
    isSessionActive: false,
    sessionStartTime: null,
    isCameraReady: false,
    isWorkerReady: false,
    ttsEnabled: true,

    // ── Actions ────────────────────────────────────────────────────────────────
    setLandmarks: (landmarks, timestamp) =>
      set({ landmarks, landmarkTimestamp: timestamp }),

    setExerciseType: (exerciseType) =>
      set({
        exerciseType,
        repCount: 0,
        repHistory: [],
        setCount: 1,
        exercisePhase: "IDLE",
        primaryAngle: 180,
        formErrors: { ...defaultFormErrors },
        coachMessages: [],
        lastCoachText: "",
        isSessionActive: false,
      }),

    setPrimaryAngle: (primaryAngle) => set({ primaryAngle }),

    setFormErrors: (formErrors) => set({ formErrors }),

    setExercisePhase: (exercisePhase) => set({ exercisePhase }),

    incrementRep: (repData) =>
      set((state) => ({
        repCount: state.repCount + 1,
        repHistory: [...state.repHistory, repData],
      })),

    incrementSet: () =>
      set((state) => ({
        setCount: state.setCount + 1,
        repCount: 0,
        repHistory: [],
      })),

    addCoachMessage: (msg) =>
      set((state) => {
        if (state.lastCoachText === msg.text) return {}; // deduplicate
        const full: CoachMessage = {
          ...msg,
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
        };
        return {
          coachMessages: [...state.coachMessages.slice(-4), full], // keep last 5
          lastCoachText: msg.text,
        };
      }),

    startSession: () =>
      set({
        isSessionActive: true,
        sessionStartTime: Date.now(),
        repCount: 0,
        setCount: 1,
        repHistory: [],
        formErrors: { ...defaultFormErrors },
        exercisePhase: "START",
        primaryAngle: 180,
        coachMessages: [],
        lastCoachText: "",
      }),

    endSession: () => set({ isSessionActive: false, exercisePhase: "IDLE" }),

    setCameraReady: (ready) => set({ isCameraReady: ready }),

    setWorkerReady: (ready) => set({ isWorkerReady: ready }),

    setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),

    resetSession: () =>
      set({
        repCount: 0,
        setCount: 1,
        repHistory: [],
        formErrors: { ...defaultFormErrors },
        exercisePhase: "IDLE",
        primaryAngle: 180,
        isSessionActive: false,
        sessionStartTime: null,
        coachMessages: [],
        lastCoachText: "",
      }),
  }))
);
