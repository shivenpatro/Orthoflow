/**
 * exercises.ts
 *
 * Central registry of all exercise definitions.
 * Each entry drives the AI analysis, coaching cues, and UI.
 */

import type { ExerciseConfig } from "@/types/pose";

export const EXERCISES: Record<string, ExerciseConfig> = {
  squat: {
    id: "squat",
    name: "Bodyweight Squat",
    emoji: "🦵",
    description: "Fundamental lower-body strength. AI checks knee alignment, depth, and torso lean.",
    targetReps: 10,
    targetSets: 3,
    difficulty: "beginner",
    targetAngle: 90,
    instructions: [
      "Stand shoulder-width apart, toes slightly out",
      "Keep chest tall, core braced",
      "Push hips back and bend knees",
      "Reach 90° or below at the knee",
      "Drive through heels to return",
    ],
    coachCues: {
      start: "Begin squatting — push your hips back.",
      good: "Great depth! Keep your knees tracking over your toes.",
      depth: "Go deeper — try to reach 90 degrees at the knee.",
      error: "Knees are caving in — push them outward!",
      complete: "Excellent set! Your form is improving.",
    },
  },

  lunge: {
    id: "lunge",
    name: "Forward Lunge",
    emoji: "🏃",
    description: "Unilateral leg strength and balance. AI monitors knee alignment and depth.",
    targetReps: 8,
    targetSets: 3,
    difficulty: "intermediate",
    targetAngle: 90,
    instructions: [
      "Stand tall, feet hip-width apart",
      "Step one foot forward 2–3 feet",
      "Lower back knee toward the floor",
      "Front knee stays over ankle, not past toes",
      "Push through front heel to return",
    ],
    coachCues: {
      start: "Take a big step forward and lower your back knee.",
      good: "Perfect lunge depth! Keep that front knee stable.",
      depth: "Drop your back knee closer to the floor.",
      error: "Front knee is drifting forward — keep it over your ankle!",
      complete: "Excellent lunges! Strong and controlled.",
    },
  },

  shoulder_press: {
    id: "shoulder_press",
    name: "Overhead Press",
    emoji: "💪",
    description: "Shoulder strength from seated or standing. AI tracks elbow angle and symmetry.",
    targetReps: 10,
    targetSets: 3,
    difficulty: "intermediate",
    targetAngle: 170,
    instructions: [
      "Start with hands at shoulder height, elbows bent ~90°",
      "Press hands straight overhead until arms are nearly straight",
      "Keep elbows slightly in front, not flared wide",
      "Lower back to shoulder height slowly (3 seconds)",
      "Keep core tight throughout",
    ],
    coachCues: {
      start: "Press your arms overhead in one smooth motion.",
      good: "Arms fully extended — great overhead position!",
      depth: "Press all the way up — fully extend your arms.",
      error: "Elbows are flaring outward — keep them slightly in front.",
      complete: "Strong shoulder press set! Great range of motion.",
    },
  },

  lateral_raise: {
    id: "lateral_raise",
    name: "Lateral Raise",
    emoji: "🦅",
    description: "Side deltoid isolation. AI checks elbow height and shoulder symmetry.",
    targetReps: 12,
    targetSets: 3,
    difficulty: "beginner",
    targetAngle: 85,
    instructions: [
      "Stand straight, arms at sides, slight bend in elbows",
      "Raise arms to the side until at shoulder height",
      "Lead with your elbows, not your wrists",
      "Keep both sides rising at the same pace",
      "Lower slowly — 3 counts down",
    ],
    coachCues: {
      start: "Raise your arms out to the sides like wings.",
      good: "Perfect height! Shoulders level and controlled.",
      depth: "Raise to shoulder height — slightly higher.",
      error: "Shoulders are uneven — check left and right sides.",
      complete: "Great set! Balanced and controlled raises.",
    },
  },

  neck_tilt: {
    id: "neck_tilt",
    name: "Neck Side Tilt",
    emoji: "🧘",
    description: "Gentle cervical stretch. No equipment needed — great for desk workers. AI checks symmetry.",
    targetReps: 6,
    targetSets: 2,
    difficulty: "beginner",
    targetAngle: 30,
    holdDurationMs: 3000,
    instructions: [
      "Sit or stand tall, shoulders level and relaxed",
      "Slowly tilt your right ear toward your right shoulder",
      "Hold for 3 seconds — feel the stretch on the left side",
      "Return to center and repeat to the left",
      "Do NOT rotate — only tilt sideways",
    ],
    coachCues: {
      start: "Tilt your ear slowly toward your shoulder.",
      good: "Good tilt — hold that stretch for 3 seconds.",
      depth: "Tilt a little further to feel the stretch.",
      error: "Shoulders are rising — keep them relaxed and down!",
      complete: "Excellent! Neck mobility exercise complete.",
    },
  },

  hand_open_close: {
    id: "hand_open_close",
    name: "Hand Open & Close",
    emoji: "✋",
    description: "Finger flexion and extension. Perfect for testing AI detection — no full-body movement needed!",
    targetReps: 10,
    targetSets: 2,
    difficulty: "beginner",
    targetAngle: 0,
    instructions: [
      "Hold one or both hands in front of the camera",
      "Spread all fingers wide completely (OPEN)",
      "Curl all fingers into a tight fist (CLOSE)",
      "Move smoothly between open and closed positions",
      "Keep wrist relaxed and stable",
    ],
    coachCues: {
      start: "Show your open hand to the camera, then close into a fist.",
      good: "Great rep! Full open and full close detected.",
      depth: "Open your fingers fully — spread them as wide as possible.",
      error: "Fingers not fully closing — make a tighter fist.",
      complete: "Excellent hand mobility! Full range of motion achieved.",
    },
  },
};

export const EXERCISE_LIST = Object.values(EXERCISES);
