/**
 * pose.worker.ts
 *
 * MediaPipe PoseLandmarker running in a dedicated Web Worker.
 * The main thread sends ImageBitmap frames; this worker processes them
 * and posts back the 33 3D landmarks as JSON – keeping the main thread free
 * for UI at 60 FPS.
 *
 * Architecture:
 *   Main thread  →  FRAME message (ImageBitmap)
 *   Worker       →  POSE_RESULT message (Landmark[])
 */

import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  Landmark,
} from "@/types/pose";

let poseLandmarker: PoseLandmarker | null = null;
let isProcessing = false;

// ── Initialize MediaPipe ───────────────────────────────────────────────────────
async function initPoseLandmarker(): Promise<void> {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  const readyMsg: WorkerOutboundMessage = { type: "READY" };
  self.postMessage(readyMsg);
}

// ── Process a single frame ────────────────────────────────────────────────────
function processFrame(bitmap: ImageBitmap, timestamp: number): void {
  if (!poseLandmarker || isProcessing) {
    bitmap.close();
    return;
  }

  isProcessing = true;

  try {
    const result: PoseLandmarkerResult = poseLandmarker.detectForVideo(
      bitmap,
      timestamp
    );

    bitmap.close(); // free GPU memory immediately

    if (result.landmarks.length > 0) {
      // Map MediaPipe NormalizedLandmark to our Landmark type
      const landmarks: Landmark[] = result.landmarks[0].map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 0,
      }));

      const msg: WorkerOutboundMessage = {
        type: "POSE_RESULT",
        landmarks,
        timestamp,
      };
      self.postMessage(msg);
    }
  } catch (err) {
    const errorMsg: WorkerOutboundMessage = {
      type: "ERROR",
      error: err instanceof Error ? err.message : "Unknown worker error",
    };
    self.postMessage(errorMsg);
  } finally {
    isProcessing = false;
  }
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const { data } = event;

  switch (data.type) {
    case "INIT":
      initPoseLandmarker().catch((err) => {
        const errorMsg: WorkerOutboundMessage = {
          type: "ERROR",
          error: err instanceof Error ? err.message : "Init error",
        };
        self.postMessage(errorMsg);
      });
      break;

    case "FRAME":
      processFrame(data.bitmap, data.timestamp);
      break;

    default:
      break;
  }
};
