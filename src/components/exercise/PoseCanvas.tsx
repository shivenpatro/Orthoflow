"use client";

/**
 * PoseCanvas — skeleton overlay on webcam feed.
 *
 * STRATEGY: Every rAF frame, set canvas.width/height = video.videoWidth/Height.
 * Both <video> and <canvas> are "absolute inset-0 w-full h-full" so CSS
 * stretches them by the exact same factor. Landmarks drawn at
 * (1 - lm.x) * videoWidth  and  lm.y * videoHeight will land on the correct
 * pixel of the video content — no object-cover math needed.
 */

import { useEffect, useRef } from "react";
import { usePoseStore } from "@/store/poseStore";
import { LM } from "@/lib/kinematics";
import type { Landmark } from "@/types/pose";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const POSE_CONNECTIONS: [number, number][] = [
  [LM.LEFT_SHOULDER,  LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER,  LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP,       LM.RIGHT_HIP],
  [LM.LEFT_SHOULDER,  LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW,     LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW,    LM.RIGHT_WRIST],
  [LM.LEFT_HIP,       LM.LEFT_KNEE],
  [LM.LEFT_KNEE,      LM.LEFT_ANKLE],
  [LM.RIGHT_HIP,      LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE,     LM.RIGHT_ANKLE],
  [LM.LEFT_EAR,       LM.RIGHT_EAR],
];

const VALGUS_JOINTS = new Set<number>([LM.LEFT_KNEE,  LM.RIGHT_KNEE]);
const ELBOW_JOINTS  = new Set<number>([LM.LEFT_ELBOW, LM.RIGHT_ELBOW]);
const WRIST_JOINTS  = new Set<number>([
  LM.LEFT_WRIST, LM.RIGHT_WRIST,
  LM.LEFT_PINKY, LM.RIGHT_PINKY,
  LM.LEFT_INDEX, LM.RIGHT_INDEX,
]);

export default function PoseCanvas({ videoRef }: Props) {
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

      const video = videoRef.current;
      // Sync canvas buffer dimensions to native video resolution every frame
      const vW = (video?.videoWidth  ?? 0) > 0 ? video!.videoWidth  : 640;
      const vH = (video?.videoHeight ?? 0) > 0 ? video!.videoHeight : 480;

      if (canvas.width !== vW)  canvas.width  = vW;
      if (canvas.height !== vH) canvas.height = vH;

      ctx.clearRect(0, 0, vW, vH);

      if (!isSessionActive || landmarks.length < 10) return;

      // Simple direct mapping — works because canvas and video share the same
      // CSS stretch factor (both are absolute inset-0 w-full h-full).
      // X is mirrored to match the CSS scaleX(-1) applied to the <video>.
      const toX = (lm: Landmark) => (1 - lm.x) * vW;
      const toY = (lm: Landmark) =>       lm.y  * vH;

      // ── connections ───────────────────────────────────────────────────────
      ctx.lineWidth = 3;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b) continue;
        if ((a.visibility ?? 0) < 0.1 || (b.visibility ?? 0) < 0.1) continue;

        let color = "rgba(99,102,241,0.85)";
        if (formErrors.valgusCollapse && (VALGUS_JOINTS.has(i) || VALGUS_JOINTS.has(j)))
          color = "rgba(239,68,68,0.9)";
        else if (formErrors.elbowFlare && (ELBOW_JOINTS.has(i) || ELBOW_JOINTS.has(j)))
          color = "rgba(245,158,11,0.9)";

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX(a), toY(a));
        ctx.lineTo(toX(b), toY(b));
        ctx.stroke();
      }

      // ── joints ────────────────────────────────────────────────────────────
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (!lm || (lm.visibility ?? 0) < 0.1) continue;

        let fill = "rgba(139,92,246,0.95)";
        let r    = 5;

        if (formErrors.valgusCollapse && VALGUS_JOINTS.has(i)) {
          fill = "rgba(239,68,68,1)";  r = 8;
        } else if (formErrors.elbowFlare && ELBOW_JOINTS.has(i)) {
          fill = "rgba(245,158,11,1)"; r = 8;
        } else if (WRIST_JOINTS.has(i)) {
          fill = "rgba(56,189,248,0.95)";
        }

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(toX(lm), toY(lm), r, 0, Math.PI * 2);
        ctx.fill();

        if (r > 6) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(toX(lm), toY(lm), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
