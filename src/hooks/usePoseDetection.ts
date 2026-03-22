"use client";

/**
 * usePoseDetection.ts
 *
 * Universal exercise detection hook.
 *
 * CRITICAL DESIGN: All volatile Zustand state (isSessionActive, exerciseType,
 * repCount) is read via usePoseStore.getState() INSIDE the landmark callback,
 * NOT captured in the closure. This avoids the stale-closure trap where
 * worker.onmessage captures `isSessionActive = false` at mount time and
 * never updates even after the session starts.
 */

import { useEffect, useRef, useCallback } from "react";
import { usePoseStore } from "@/store/poseStore";
import { useTTS } from "@/hooks/useTTS";
import { analyzeExercise, SQUAT_THRESHOLDS } from "@/lib/kinematics";
import { EXERCISES } from "@/lib/exercises";
import type {
  WorkerOutboundMessage,
  WorkerFrameMessage,
  WorkerInitMessage,
  Landmark,
  ExercisePhase,
  RepData,
  ExerciseType,
} from "@/types/pose";

const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

// ── Per-exercise thresholds ───────────────────────────────────────────────────
interface ExerciseThresholds {
  startAngle: number;    // angle that means "at start position"
  peakAngle: number;     // angle at full depth/extension
  returnAngle: number;   // angle when returning towards start
  higherIsBetter: boolean; // true = extension exercise (press, raise), false = flexion (squat)
}

const THRESHOLDS: Record<ExerciseType, ExerciseThresholds> = {
  squat:           { startAngle: 158, peakAngle: 115, returnAngle: 148, higherIsBetter: false },
  lunge:           { startAngle: 158, peakAngle: 120, returnAngle: 148, higherIsBetter: false },
  shoulder_press:  { startAngle: 105, peakAngle: 155, returnAngle: 115, higherIsBetter: true  },
  lateral_raise:   { startAngle: 22,  peakAngle: 65,  returnAngle: 28,  higherIsBetter: true  },
  neck_tilt:       { startAngle: 6,   peakAngle: 22,  returnAngle: 8,   higherIsBetter: true  },
  hand_open_close: { startAngle: 20,  peakAngle: 58,  returnAngle: 22,  higherIsBetter: true  },
};

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const workerRef      = useRef<Worker | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const animFrameRef   = useRef<number>(0);
  const lastFrameRef   = useRef<number>(0);

  // Rep-tracking refs (survive re-renders without triggering them)
  const phaseRef          = useRef<ExercisePhase>("IDLE");
  const peakAngleRef      = useRef<number>(0);
  const repStartRef       = useRef<number>(0);
  const errorsThisRepRef  = useRef<Partial<import("@/types/pose").FormErrors>>({});
  const lastCoachFireRef  = useRef<number>(0);
  const lastExerciseRef   = useRef<ExerciseType | null>(null);

  // Stable actions from Zustand (these never change identity)
  const {
    setLandmarks, setPrimaryAngle, setFormErrors,
    setExercisePhase, incrementRep, setCameraReady,
    setWorkerReady, addCoachMessage, incrementSet,
  } = usePoseStore();

  // TTS – read ttsEnabled live from store in speak() to avoid stale capture
  const ttsEnabledRef = useRef(true);
  useEffect(() => {
    return usePoseStore.subscribe(
      (s) => s.ttsEnabled,
      (v) => { ttsEnabledRef.current = v; }
    );
  }, []);

  const { speak } = useTTS(true); // always create hook; gate internally

  // ── Coaching helper (reads ttsEnabledRef live) ────────────────────────────
  const fireCoach = useCallback(
    (text: string, severity: "info" | "warning" | "error" | "success", urgent = false) => {
      const now = Date.now();
      const minGap = urgent ? 0 : 3500;
      if (now - lastCoachFireRef.current < minGap) return;
      lastCoachFireRef.current = now;
      addCoachMessage({ text, severity, speakAloud: true });
      if (ttsEnabledRef.current) speak(text, urgent);
    },
    [addCoachMessage, speak]
  );

  // ── Core landmark processing (reads from getState() – NO stale closure) ──
  // We keep this in a ref so the worker.onmessage always calls the latest version
  const processLandmarks = useCallback(
    (landmarks: Landmark[], _timestamp: number) => {
      // ── Read volatile values LIVE from store ─────────────────────────────
      const state = usePoseStore.getState();
      if (!state.isSessionActive) return;

      const exerciseType = state.exerciseType;
      const repCount     = state.repCount;
      const cfg          = EXERCISES[exerciseType];
      const t            = THRESHOLDS[exerciseType];

      // Reset state machine when exercise type changes
      if (lastExerciseRef.current !== exerciseType) {
        lastExerciseRef.current = exerciseType;
        phaseRef.current        = "IDLE";
        peakAngleRef.current    = t.higherIsBetter ? 0 : 180;
        repStartRef.current     = 0;
        errorsThisRepRef.current = {};
      }

      // 1. Push raw landmarks to store (canvas reads this via getState())
      setLandmarks(landmarks, _timestamp);

      // 2. Run exercise analysis
      const { primaryAngle, errors } = analyzeExercise(exerciseType, landmarks);
      setPrimaryAngle(primaryAngle);
      setFormErrors(errors);

      // 3. Error coaching
      if (errors.valgusCollapse) {
        errorsThisRepRef.current.valgusCollapse = true;
        fireCoach("Knees caving in — push them out!", "error");
      }
      if (errors.elbowFlare) {
        errorsThisRepRef.current.elbowFlare = true;
        fireCoach("Elbows flaring — keep them in front.", "warning");
      }
      if (errors.unevenShoulders) {
        errorsThisRepRef.current.unevenShoulders = true;
        fireCoach("Keep both sides even.", "warning");
      }
      if (errors.forwardLean) {
        errorsThisRepRef.current.forwardLean = true;
        fireCoach("Keep your chest tall — don't lean forward.", "warning");
      }
      if (errors.excessiveTilt) {
        errorsThisRepRef.current.excessiveTilt = true;
        fireCoach("That's a big tilt. Stay comfortable.", "warning");
      }
      if (errors.positionLost) {
        fireCoach("Please step back into the camera frame.", "info");
        return;
      }

      // 4. Rep state machine
      const prev = phaseRef.current;
      const hi   = t.higherIsBetter;

      const atStart  = hi ? primaryAngle <= t.startAngle   : primaryAngle >= t.startAngle;
      const atPeak   = hi ? primaryAngle >= t.peakAngle    : primaryAngle <= t.peakAngle;
      const returning= hi ? primaryAngle <= t.returnAngle  : primaryAngle >= t.returnAngle;

      if (atStart && (prev === "IDLE" || prev === "RETURN" || prev === "COMPLETE")) {
        // Back at start position
        if (prev === "RETURN") {
          // ── Count rep ──────────────────────────────────────────────────
          const rep: RepData = {
            primaryAngle: peakAngleRef.current,
            errors: { ...errorsThisRepRef.current },
            durationMs: Date.now() - repStartRef.current,
          };
          incrementRep(rep);
          peakAngleRef.current     = hi ? 0 : 180;
          errorsThisRepRef.current = {};
          repStartRef.current      = 0;

          const newCount = repCount + 1;
          if (newCount >= (cfg?.targetReps ?? 10)) {
            fireCoach(cfg?.coachCues.complete ?? "Excellent set!", "success", true);
            phaseRef.current = "COMPLETE";
            setExercisePhase("COMPLETE");
            incrementSet();
            return;
          }
          fireCoach(cfg?.coachCues.good ?? "Good rep! Keep going.", "success");
        }
        phaseRef.current = "START";
        setExercisePhase("START");
      } else if (atPeak) {
        if (prev === "MOVING") {
          phaseRef.current = "HOLD";
          setExercisePhase("HOLD");
        }
        if (hi) {
          peakAngleRef.current = Math.max(peakAngleRef.current, primaryAngle);
        } else {
          if (primaryAngle > 0) {
            peakAngleRef.current = Math.min(peakAngleRef.current, primaryAngle);
          }
        }
      } else if ((prev === "START" || prev === "IDLE") && !atStart) {
        // Just started moving away from start
        phaseRef.current     = "MOVING";
        setExercisePhase("MOVING");
        repStartRef.current  = Date.now();
        peakAngleRef.current = primaryAngle;
        fireCoach(cfg?.coachCues.start ?? "Keep going!", "info");
      } else if (returning && prev === "HOLD") {
        phaseRef.current = "RETURN";
        setExercisePhase("RETURN");
      } else {
        // Mid-movement: track best angle
        if (hi) {
          peakAngleRef.current = Math.max(peakAngleRef.current, primaryAngle);
        } else if (primaryAngle > 0) {
          peakAngleRef.current = Math.min(peakAngleRef.current, primaryAngle);
        }
      }
    },
    // INTENTIONALLY minimal deps – volatile state is read via getState()
    [setLandmarks, setPrimaryAngle, setFormErrors, setExercisePhase, incrementRep, incrementSet, fireCoach]
  );

  // Keep a ref so worker.onmessage always uses latest
  const processLandmarksRef = useRef(processLandmarks);
  useEffect(() => {
    processLandmarksRef.current = processLandmarks;
  }, [processLandmarks]);

  // ── Frame capture loop ────────────────────────────────────────────────────
  const captureFrame = useCallback(
    (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(captureFrame);
      if (!videoRef.current || !workerRef.current) return;
      if (timestamp - lastFrameRef.current < FRAME_INTERVAL_MS) return;
      lastFrameRef.current = timestamp;
      const video = videoRef.current;
      if (video.readyState < video.HAVE_ENOUGH_DATA) return;
      createImageBitmap(video)
        .then((bitmap) => {
          const msg: WorkerFrameMessage = { type: "FRAME", bitmap, timestamp };
          workerRef.current?.postMessage(msg, [bitmap]);
        })
        .catch(() => { /* frame skip */ });
    },
    [videoRef]
  );

  // ── Camera + Worker initialization (runs once) ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // Start webcam
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 30 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        console.error("[OrthoFlow] Camera error:", err);
        return;
      }

      // Spawn Web Worker
      const worker = new Worker(
        new URL("../workers/pose.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      // ── Worker message handler uses ref → always latest processLandmarks ──
      worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
        const msg = event.data;
        switch (msg.type) {
          case "READY":
            setWorkerReady(true);
            animFrameRef.current = requestAnimationFrame(captureFrame);
            break;
          case "POSE_RESULT":
            // Call through ref to get the LATEST closure, not the one from mount
            processLandmarksRef.current(msg.landmarks, msg.timestamp);
            break;
          case "ERROR":
            console.error("[PoseWorker]", msg.error);
            break;
        }
      };

      const initMsg: WorkerInitMessage = {
        type: "INIT",
        wasmPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        modelPath: "",
      };
      worker.postMessage(initMsg);
    };

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate();
      setCameraReady(false);
      setWorkerReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs ONCE – all volatile state accessed via getState() or refs
}
