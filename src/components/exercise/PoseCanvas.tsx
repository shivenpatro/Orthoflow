"use client";

/**
 * PoseCanvas — draws the MediaPipe skeleton overlay on top of the webcam feed.
 *
 * Reads directly from the Zustand store via getState() inside a rAF loop
 * to avoid any React re-renders at 60 FPS.
 *
 * Supports highlighting error joints (valgus, elbow flare, etc.) in red.
 */

import { useEffect, useRef } from "react";
import { usePoseStore } from "@/store/poseStore";
import { LM } from "@/lib/kinematics";
import type { Landmark } from "@/types/pose";

interface Props {
  width: number;
  height: number;
}

// ── Skeleton connections ──────────────────────────────────────────────────────
const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  // Left arm
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  // Right arm
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  // Left leg
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  // Right leg
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  // Face
  [LM.LEFT_EAR, LM.RIGHT_EAR],
];

// Joints highlighted red on valgus
const VALGUS_JOINTS = new Set<number>([LM.LEFT_KNEE, LM.RIGHT_KNEE]);
const ELBOW_JOINTS  = new Set<number>([LM.LEFT_ELBOW, LM.RIGHT_ELBOW]);
const WRIST_JOINTS  = new Set<number>([LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_PINKY, LM.RIGHT_PINKY, LM.LEFT_INDEX, LM.RIGHT_INDEX]);

export default function PoseCanvas({ width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const { landmarks, formErrors, isSessionActive } = usePoseStore.getState();

      ctx.clearRect(0, 0, width, height);

      if (!isSessionActive || landmarks.length < 10) return;

      const toX = (lm: Landmark) => (1 - lm.x) * width;  // mirrored
      const toY = (lm: Landmark) => lm.y * height;

      // ── Draw connections ────────────────────────────────────────────────────
      ctx.lineWidth = 2.5;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b) continue;
        if ((a.visibility ?? 0) < 0.3 || (b.visibility ?? 0) < 0.3) continue;

        let strokeColor = "rgba(99,102,241,0.8)"; // indigo default

        if (formErrors.valgusCollapse && (VALGUS_JOINTS.has(i) || VALGUS_JOINTS.has(j))) {
          strokeColor = "rgba(239,68,68,0.9)";
        } else if (formErrors.elbowFlare && (ELBOW_JOINTS.has(i) || ELBOW_JOINTS.has(j))) {
          strokeColor = "rgba(245,158,11,0.9)";
        }

        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(toX(a), toY(a));
        ctx.lineTo(toX(b), toY(b));
        ctx.stroke();
      }

      // ── Draw joint circles ──────────────────────────────────────────────────
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (!lm || (lm.visibility ?? 0) < 0.3) continue;

        let fillColor = "rgba(139,92,246,0.9)"; // violet default
        let radius = 4;

        if (formErrors.valgusCollapse && VALGUS_JOINTS.has(i)) {
          fillColor = "rgba(239,68,68,1)";
          radius = 6;
        } else if (formErrors.elbowFlare && ELBOW_JOINTS.has(i)) {
          fillColor = "rgba(245,158,11,1)";
          radius = 6;
        } else if (WRIST_JOINTS.has(i)) {
          fillColor = "rgba(56,189,248,0.9)"; // cyan for hands
        }

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(toX(lm), toY(lm), radius, 0, Math.PI * 2);
        ctx.fill();

        // White center dot for key joints
        if (radius > 4) {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.beginPath();
          ctx.arc(toX(lm), toY(lm), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: "none" }}
    />
  );
}
