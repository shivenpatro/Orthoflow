/**
 * kinematics.ts  —  Comprehensive biomechanical analysis for all OrthoFlow exercises.
 *
 * LANDMARK INDEX REFERENCE (MediaPipe Pose - 33 points):
 *   0=nose  1=left_eye_inner  2=left_eye  3=left_eye_outer  4=right_eye_inner
 *   5=right_eye  6=right_eye_outer  7=left_ear  8=right_ear
 *   9=mouth_left 10=mouth_right
 *   11=left_shoulder  12=right_shoulder  13=left_elbow  14=right_elbow
 *   15=left_wrist    16=right_wrist      17=left_pinky   18=right_pinky
 *   19=left_index    20=right_index      21=left_thumb   22=right_thumb
 *   23=left_hip      24=right_hip        25=left_knee    26=right_knee
 *   27=left_ankle    28=right_ankle      29=left_heel    30=right_heel
 *   31=left_foot_index 32=right_foot_index
 */

import type { Landmark, FormErrors, ExerciseType } from "@/types/pose";

// ── Vector helpers ─────────────────────────────────────────────────────────────
interface Vec3 { x: number; y: number; z: number; }

function subtract(a: Landmark, b: Landmark): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function dot(u: Vec3, v: Vec3): number {
  return u.x * v.x + u.y * v.y + u.z * v.z;
}
function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Core angle calculation ─────────────────────────────────────────────────────
/**
 * Calculates the angle (in degrees) at joint B formed by A–B–C.
 */
export function calculateAngle(
  a: Landmark,
  b: Landmark,
  c: Landmark,
  visThreshold = 0.15
): number {
  if (
    (a.visibility ?? 1) < visThreshold ||
    (b.visibility ?? 1) < visThreshold ||
    (c.visibility ?? 1) < visThreshold
  ) {
    return -1; // sentinel: invisible
  }
  const u = subtract(a, b);
  const v = subtract(c, b);
  const magU = magnitude(u);
  const magV = magnitude(v);
  if (magU === 0 || magV === 0) return 180;
  const cosTheta = clamp(dot(u, v) / (magU * magV), -1, 1);
  return Math.acos(cosTheta) * (180 / Math.PI);
}

// ── Landmark index constants ──────────────────────────────────────────────────
export const LM = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
} as const;

// ── Default form errors ────────────────────────────────────────────────────────
export function defaultFormErrors(): FormErrors {
  return {
    valgusCollapse: false,
    insufficientDepth: false,
    forwardLean: false,
    elbowFlare: false,
    unevenShoulders: false,
    excessiveTilt: false,
    asymmetry: false,
    positionLost: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SQUAT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
export const SQUAT_THRESHOLDS = {
  STANDING_ANGLE: 160,
  BOTTOM_ANGLE: 110,
  GOOD_DEPTH: 100,
} as const;

export const VALGUS_THRESHOLD = 0.035;

export function getKneeFlexionAngle(landmarks: Landmark[]): number {
  if (landmarks.length < 29) return 180;
  const left = calculateAngle(landmarks[LM.LEFT_HIP], landmarks[LM.LEFT_KNEE], landmarks[LM.LEFT_ANKLE]);
  const right = calculateAngle(landmarks[LM.RIGHT_HIP], landmarks[LM.RIGHT_KNEE], landmarks[LM.RIGHT_ANKLE]);
  const lv = landmarks[LM.LEFT_KNEE].visibility ?? 0;
  const rv = landmarks[LM.RIGHT_KNEE].visibility ?? 0;
  if (left > 0 && right > 0 && lv > 0.15 && rv > 0.15) return (left + right) / 2;
  if (left > 0 && lv > rv) return left;
  if (right > 0) return right;
  return 180;
}

function detectValgus(landmarks: Landmark[], angle: number): boolean {
  if (landmarks.length < 29 || angle > 155) return false;
  const check = (hip: Landmark, knee: Landmark, ankle: Landmark, isLeft: boolean): boolean => {
    if ((hip.visibility ?? 0) < 0.15 || (knee.visibility ?? 0) < 0.15 || (ankle.visibility ?? 0) < 0.15) return false;
    const midX = (hip.x + ankle.x) / 2;
    const deviation = isLeft ? knee.x - midX : midX - knee.x;
    return deviation > VALGUS_THRESHOLD;
  };
  return (
    check(landmarks[LM.LEFT_HIP], landmarks[LM.LEFT_KNEE], landmarks[LM.LEFT_ANKLE], true) ||
    check(landmarks[LM.RIGHT_HIP], landmarks[LM.RIGHT_KNEE], landmarks[LM.RIGHT_ANKLE], false)
  );
}

function detectForwardLean(landmarks: Landmark[]): boolean {
  if (landmarks.length < 29) return false;
  const lHip = landmarks[LM.LEFT_HIP];
  const rHip = landmarks[LM.RIGHT_HIP];
  const lSho = landmarks[LM.LEFT_SHOULDER];
  const rSho = landmarks[LM.RIGHT_SHOULDER];
  if ((lHip.visibility ?? 0) < 0.15 || (rSho.visibility ?? 0) < 0.15) return false;
  const hipMidX = (lHip.x + rHip.x) / 2;
  const shoMidX = (lSho.x + rSho.x) / 2;
  // In mirrored camera view: if shoulder x > hip x significantly, torso leans forward
  return Math.abs(shoMidX - hipMidX) > 0.12;
}

export function analyzeSquat(landmarks: Landmark[], kneeAngle: number): FormErrors {
  const errors = defaultFormErrors();
  errors.valgusCollapse = detectValgus(landmarks, kneeAngle);
  errors.insufficientDepth = kneeAngle > 0 && kneeAngle < 145 && kneeAngle > SQUAT_THRESHOLDS.GOOD_DEPTH;
  errors.forwardLean = detectForwardLean(landmarks);
  if (landmarks.length < 10) errors.positionLost = true;
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUNGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
export function analyzeLunge(landmarks: Landmark[]): { angle: number; errors: FormErrors } {
  const errors = defaultFormErrors();
  if (landmarks.length < 29) {
    errors.positionLost = true;
    return { angle: 180, errors };
  }
  // Use the front leg (whichever knee is more bent)
  const leftKnee = calculateAngle(landmarks[LM.LEFT_HIP], landmarks[LM.LEFT_KNEE], landmarks[LM.LEFT_ANKLE]);
  const rightKnee = calculateAngle(landmarks[LM.RIGHT_HIP], landmarks[LM.RIGHT_KNEE], landmarks[LM.RIGHT_ANKLE]);
  const angle = Math.min(
    leftKnee > 0 ? leftKnee : 180,
    rightKnee > 0 ? rightKnee : 180
  );
  errors.valgusCollapse = detectValgus(landmarks, angle);
  errors.insufficientDepth = angle > 115;
  return { angle, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHOULDER PRESS ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
export function getShoulderPressAngle(landmarks: Landmark[]): number {
  if (landmarks.length < 17) return 90;
  const left = calculateAngle(landmarks[LM.LEFT_SHOULDER], landmarks[LM.LEFT_ELBOW], landmarks[LM.LEFT_WRIST]);
  const right = calculateAngle(landmarks[LM.RIGHT_SHOULDER], landmarks[LM.RIGHT_ELBOW], landmarks[LM.RIGHT_WRIST]);
  const lv = landmarks[LM.LEFT_ELBOW].visibility ?? 0;
  const rv = landmarks[LM.RIGHT_ELBOW].visibility ?? 0;
  if (left > 0 && right > 0 && lv > 0.15 && rv > 0.15) return (left + right) / 2;
  if (left > 0 && lv > rv) return left;
  if (right > 0) return right;
  return 90;
}

export function analyzeShoulderPress(landmarks: Landmark[]): FormErrors {
  const errors = defaultFormErrors();
  if (landmarks.length < 17) { errors.positionLost = true; return errors; }
  // Elbow flare: elbow should be slightly below or at shoulder level at bottom
  const lElbow = landmarks[LM.LEFT_ELBOW];
  const rElbow = landmarks[LM.RIGHT_ELBOW];
  const lSho = landmarks[LM.LEFT_SHOULDER];
  const rSho = landmarks[LM.RIGHT_SHOULDER];
  if ((lElbow.visibility ?? 0) > 0.15 && (rElbow.visibility ?? 0) > 0.15) {
    // In normalized coords, y increases downward. Elbow should be near shoulder y or above
    const lFlare = Math.abs(lElbow.x - lSho.x) > 0.20; // too far sideways
    const rFlare = Math.abs(rElbow.x - rSho.x) > 0.20;
    errors.elbowFlare = lFlare || rFlare;
    // Uneven: shoulders at different heights during press
    const shoLevelDiff = Math.abs(lSho.y - rSho.y);
    errors.unevenShoulders = shoLevelDiff > 0.05;
  }
  const leftElbowAngle = calculateAngle(landmarks[LM.LEFT_SHOULDER], landmarks[LM.LEFT_ELBOW], landmarks[LM.LEFT_WRIST]);
  const rightElbowAngle = calculateAngle(landmarks[LM.RIGHT_SHOULDER], landmarks[LM.RIGHT_ELBOW], landmarks[LM.RIGHT_WRIST]);
  if (leftElbowAngle > 0 && rightElbowAngle > 0) {
    errors.asymmetry = Math.abs(leftElbowAngle - rightElbowAngle) > 25;
  }
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LATERAL RAISE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
export function getLateralRaiseAngle(landmarks: Landmark[]): number {
  if (landmarks.length < 17) return 0;
  // Angle at shoulder between torso (hip→shoulder) and arm (shoulder→elbow)
  const lAngle = calculateAngle(landmarks[LM.LEFT_HIP], landmarks[LM.LEFT_SHOULDER], landmarks[LM.LEFT_ELBOW]);
  const rAngle = calculateAngle(landmarks[LM.RIGHT_HIP], landmarks[LM.RIGHT_SHOULDER], landmarks[LM.RIGHT_ELBOW]);
  const lv = landmarks[LM.LEFT_ELBOW].visibility ?? 0;
  const rv = landmarks[LM.RIGHT_ELBOW].visibility ?? 0;
  if (lAngle > 0 && rAngle > 0 && lv > 0.15 && rv > 0.15) return (lAngle + rAngle) / 2;
  if (lAngle > 0 && lv > rv) return lAngle;
  if (rAngle > 0) return rAngle;
  return 0;
}

export function analyzeLateralRaise(landmarks: Landmark[]): FormErrors {
  const errors = defaultFormErrors();
  if (landmarks.length < 17) { errors.positionLost = true; return errors; }
  const lSho = landmarks[LM.LEFT_SHOULDER];
  const rSho = landmarks[LM.RIGHT_SHOULDER];
  const lElbow = landmarks[LM.LEFT_ELBOW];
  const rElbow = landmarks[LM.RIGHT_ELBOW];
  if ((lSho.visibility ?? 0) > 0.15 && (rSho.visibility ?? 0) > 0.15) {
    // Shoulders should stay level (same y)
    errors.unevenShoulders = Math.abs(lSho.y - rSho.y) > 0.06;
    // Elbows should be roughly at shoulder height when raised
    if ((lElbow.visibility ?? 0) > 0.15 && (rElbow.visibility ?? 0) > 0.15) {
      errors.asymmetry = Math.abs(lElbow.y - rElbow.y) > 0.08;
    }
  }
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NECK TILT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
export function getNeckTiltAngle(landmarks: Landmark[]): number {
  if (landmarks.length < 12) return 0;
  const nose = landmarks[LM.NOSE];
  const lSho = landmarks[LM.LEFT_SHOULDER];
  const rSho = landmarks[LM.RIGHT_SHOULDER];
  if ((nose.visibility ?? 0) < 0.15) return 0;
  const midShoX = (lSho.x + rSho.x) / 2;
  const midShoY = (lSho.y + rSho.y) / 2;
  // Angle of nose relative to shoulder midpoint
  const dx = nose.x - midShoX;
  const dy = midShoY - nose.y; // invert y (y increases downward)
  return Math.atan2(Math.abs(dx), dy) * (180 / Math.PI);
}

export function analyzeNeckTilt(landmarks: Landmark[]): FormErrors {
  const errors = defaultFormErrors();
  if (landmarks.length < 12) { errors.positionLost = true; return errors; }
  const lSho = landmarks[LM.LEFT_SHOULDER];
  const rSho = landmarks[LM.RIGHT_SHOULDER];
  if ((lSho.visibility ?? 0) > 0.15 && (rSho.visibility ?? 0) > 0.15) {
    // Shoulders should NOT rise (shrug) during neck tilt
    const shoLevelDiff = Math.abs(lSho.y - rSho.y);
    errors.unevenShoulders = shoLevelDiff > 0.07;
    const tiltAngle = getNeckTiltAngle(landmarks);
    errors.excessiveTilt = tiltAngle > 50;
  }
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HAND OPEN / CLOSE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
export function getHandOpenness(landmarks: Landmark[]): number {
  if (landmarks.length < 22) return 0;
  // Use wrist–index and wrist–pinky spread as proxy for openness
  const lWrist = landmarks[LM.LEFT_WRIST];
  const lIndex = landmarks[LM.LEFT_INDEX];
  const lPinky = landmarks[LM.LEFT_PINKY];
  const rWrist = landmarks[LM.RIGHT_WRIST];
  const rIndex = landmarks[LM.RIGHT_INDEX];
  const rPinky = landmarks[LM.RIGHT_PINKY];

  const calcSpread = (wrist: Landmark, index: Landmark, pinky: Landmark): number => {
    if ((wrist.visibility ?? 0) < 0.1) return -1;
    const dxIndex = index.x - wrist.x;
    const dyIndex = index.y - wrist.y;
    const dxPinky = pinky.x - wrist.x;
    const dyPinky = pinky.y - wrist.y;
    const distIndex = Math.sqrt(dxIndex ** 2 + dyIndex ** 2);
    const distPinky = Math.sqrt(dxPinky ** 2 + dyPinky ** 2);
    return (distIndex + distPinky) / 2;
  };

  const l = calcSpread(lWrist, lIndex, lPinky);
  const r = calcSpread(rWrist, rIndex, rPinky);

  if (l > 0 && r > 0) return (l + r) / 2;
  if (l > 0) return l;
  if (r > 0) return r;
  return 0;
}

export function analyzeHandOpenClose(landmarks: Landmark[]): FormErrors {
  const errors = defaultFormErrors();
  if (landmarks.length < 22) { errors.positionLost = true; return errors; }
  const openness = getHandOpenness(landmarks);
  if (openness < 0.01) errors.positionLost = true;
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED ANALYSIS ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
export interface AnalysisResult {
  primaryAngle: number;
  errors: FormErrors;
}

export function analyzeExercise(
  exerciseType: ExerciseType,
  landmarks: Landmark[]
): AnalysisResult {
  switch (exerciseType) {
    case "squat": {
      const angle = getKneeFlexionAngle(landmarks);
      return { primaryAngle: angle, errors: analyzeSquat(landmarks, angle) };
    }
    case "lunge": {
      const { angle, errors } = analyzeLunge(landmarks);
      return { primaryAngle: angle, errors };
    }
    case "shoulder_press": {
      const angle = getShoulderPressAngle(landmarks);
      return { primaryAngle: angle, errors: analyzeShoulderPress(landmarks) };
    }
    case "lateral_raise": {
      const angle = getLateralRaiseAngle(landmarks);
      return { primaryAngle: angle, errors: analyzeLateralRaise(landmarks) };
    }
    case "neck_tilt": {
      const angle = getNeckTiltAngle(landmarks);
      return { primaryAngle: angle, errors: analyzeNeckTilt(landmarks) };
    }
    case "hand_open_close": {
      const openness = getHandOpenness(landmarks);
      // Scale 0.04=closed, 0.12=open → 0–100
      const angle = clamp((openness - 0.02) / 0.10 * 100, 0, 100);
      return { primaryAngle: angle, errors: analyzeHandOpenClose(landmarks) };
    }
    default:
      return { primaryAngle: 0, errors: defaultFormErrors() };
  }
}
