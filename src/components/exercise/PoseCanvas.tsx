"use client";

/**
 * PoseCanvas — draws the MediaPipe skeleton overlay on top of the webcam feed.
 *
 * KEY ARCHITECTURE:
 *  - Accepts a videoRef so it can read video.videoWidth / video.videoHeight
 *    every frame from inside the rAF loop (live, never stale).
 *  - ResizeObserver keeps canvas pixel-buffer == CSS display size.
 *  - toX / toY account for CSS object-cover scaling + crop offset so
 *    every landmark lands on the exact corresponding pixel of the video feed,
 *    regardless of webcam aspect ratio or container dimensions.
 *
 * Math summary (object-cover):
 *   scale  = max(canvasW / videoW, canvasH / videoH)
 *   offX   = (canvasW - videoW * scale) / 2   ← negative when H-cropped
 *   offY   = (canvasH - videoH * scale) / 2   ← negative when V-cropped
 *   toX(lm) = (1 - lm.x) * videoW * scale + offX   ← mirror + scale + offset
 *   toY(lm) = lm.y       * videoH * scale + offY
 */

import { useEffect, useRef } from "react";
import { usePoseStore } from "@/store/poseStore";
import { LM } from "@/lib/kinematics";
import type { Landmark } from "@/types/pose";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// ── Skeleton connections ──────────────────────────────────────────────────────
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
  LM.LEFT_WRIST,  LM.RIGHT_WRIST,
  LM.LEFT_PINKY,  LM.RIGHT_PINKY,
  LM.LEFT_INDEX,  LM.RIGHT_INDEX,
]);

// Visibility threshold — intentionally low so partial-body frames still show
const VIS_THRESHOLD = 0.15;

export default function PoseCanvas({ videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Initialise canvas pixel buffer to current CSS size immediately ────
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0)  canvas.width  = Math.round(rect.width);
    if (rect.height > 0) canvas.height = Math.round(rect.height);

    // ── Keep buffer in sync on resize ────────────────────────────────────
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.round(width);
        const h = Math.round(height);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w;
          canvas.height = h;
        }
      }
    });
    ro.observe(canvas);

    // ── rAF draw loop ─────────────────────────────────────────────────────
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const { landmarks, formErrors, isSessionActive } = usePoseStore.getState();

      // Read LIVE canvas dimensions — always accurate after ResizeObserver
      const cW = canvas.width;
      const cH = canvas.height;

      ctx.clearRect(0, 0, cW, cH);

      if (!isSessionActive || landmarks.length < 10 || cW === 0 || cH === 0) return;

      // ── Compute object-cover transform (live video dims) ───────────────
      const video = videoRef.current;
      const vW = (video && video.videoWidth  > 0) ? video.videoWidth  : cW;
      const vH = (video && video.videoHeight > 0) ? video.videoHeight : cH;

      // object-cover: scale so video fills the canvas on both axes
      const scale = Math.max(cW / vW, cH / vH);
      // Offsets: negative when the video overflows (is cropped) on that axis
      const offX = (cW - vW * scale) / 2;
      const offY = (cH - vH * scale) / 2;

      // Landmark → canvas pixel  (X is mirrored to match CSS scaleX(-1) on video)
      const toX = (lm: Landmark) => (1 - lm.x) * vW * scale + offX;
      const toY = (lm: Landmark) =>       lm.y  * vH * scale + offY;

      // ── Draw connections ────────────────────────────────────────────────
      ctx.lineWidth = 2.5;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b) continue;
        if ((a.visibility ?? 0) < VIS_THRESHOLD || (b.visibility ?? 0) < VIS_THRESHOLD) continue;

        let color = "rgba(99,102,241,0.8)";
        if (formErrors.valgusCollapse && (VALGUS_JOINTS.has(i) || VALGUS_JOINTS.has(j))) {
          color = "rgba(239,68,68,0.9)";
        } else if (formErrors.elbowFlare && (ELBOW_JOINTS.has(i) || ELBOW_JOINTS.has(j))) {
          color = "rgba(245,158,11,0.9)";
        }

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(toX(a), toY(a));
        ctx.lineTo(toX(b), toY(b));
        ctx.stroke();
      }

      // ── Draw joint dots ─────────────────────────────────────────────────
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (!lm || (lm.visibility ?? 0) < VIS_THRESHOLD) continue;

        let fill   = "rgba(139,92,246,0.9)";
        let radius = 4;

        if (formErrors.valgusCollapse && VALGUS_JOINTS.has(i)) {
          fill = "rgba(239,68,68,1)";   radius = 7;
        } else if (formErrors.elbowFlare && ELBOW_JOINTS.has(i)) {
          fill = "rgba(245,158,11,1)";  radius = 7;
        } else if (WRIST_JOINTS.has(i)) {
          fill = "rgba(56,189,248,0.9)";
        }

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(toX(lm), toY(lm), radius, 0, Math.PI * 2);
        ctx.fill();

        if (radius > 5) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(toX(lm), toY(lm), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [videoRef]); // stable ref — no stale-closure risk

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
