# OrthoFlow 🦾 — AI Physical Therapy Assistant

![OrthoFlow Header](https://raw.githubusercontent.com/shivenpatro/Orthoflow/main/public/header.png) *(Note: You can add screenshots here)*

**OrthoFlow** is a browser-based, AI-powered physical therapy telehealth platform. It uses on-device computer vision to track patient biomechanics in real-time through their webcam, count repetitions, correct exercise form with Text-to-Speech (TTS) coaching, and send compliance telemetry to a Neon Postgres database for doctors to review.

No app downloads, no special cameras, no wearables. Just a browser.

---

## 🌟 Key Features

### 🏋️‍♂️ 6 AI-Tracked Exercises
Each exercise is tracked entirely client-side using **Google MediaPipe**, computing 33 3D landmarks at 30+ FPS.

1. 🦵 **Bodyweight Squat:** Detects valgus collapse, monitors depth, and checks for forward torso lean.
2. 🏃 **Forward Lunge:** Monitors knee joint angles, valgus, and depth.
3. 💪 **Overhead Press:** Checks for elbow flare and shoulder symmetry.
4. 🦅 **Lateral Raise:** Ensures arms stay level and shoulders don't shrug.
5. 🧘 **Neck Side Tilt:** Monitors neck flexion and shoulder shrugging. (Great for quick tests!)
6. ✋ **Hand Open & Close:** Analyzes the spread between wrist, index, and pinky fingers.

### 🗣️ Real-time Text-to-Speech (TTS) Coaching
When you break form, OrthoFlow tells you. Using the Web Speech API, it provides intelligent cues like *"Knees caving in — push them out!"* and *"Good rep! Keep going"*, without overlapping audio output.

### ⚡ Blazing Fast Architecture (Zero UI Blocking)
- **Web Worker GPU Inference:** All MediaPipe processing is offloaded to a dedicated Web Worker via `ImageBitmap` offscreen processing.
- **Zustand `subscribeWithSelector`:** The 30FPS stream of skeletal data skips the React render cycle entirely. Only the specific components that need the data re-render.
- **`requestAnimationFrame` Canvas:** The skeletal overlay draws at fully 60 FPS natively onto the page without touching React.

### 👨‍⚕️ Doctor Dashboard (Telemetry)
Compliance telemetry (e.g. rep count, knee flexion angle variants, valgus collapse count) pushes up securely to a **Neon serverless Postgres** database using **Drizzle ORM** for doctors to monitor patient progress remotely.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Webpack proxy mode)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS, Shadcn/ui
- **Animation:** Framer Motion
- **State Management:** Zustand
- **Database:** Neon Postgres
- **ORM:** Drizzle ORM
- **Computer Vision:** `@mediapipe/tasks-vision`
- **Charts:** Recharts

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or pnpm or yarn
- A [Neon](https://neon.tech/) Postgres Database

### 1. Clone & Install

```bash
git clone https://github.com/shivenpatro/Orthoflow.git
cd orthoflow
npm install
```

### 2. Environment Variables

Create a `.env.local` file by copying the example:
```bash
cp .env.local.example .env.local
```
Fill in your `DATABASE_URL` from Neon. Demo user IDs are pre-provided.

### 3. Database Setup & Seeding

Use Drizzle to push the schema and run the seed script to populate a Doctor and 2 Patients with mock telemetry history:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 💻 Usage

1. **Login:** Role-based dashboard. Choose **Patient** or **Doctor** (no password setup requires in demo mode).
2. **Exercise (Patient):** Pick an exercise on the left menu. Allow webcam access. Press **Start Session** and listen to the real-time feedback.
3. **Data Review (Doctor):** Head to the Doctor portal to view compliance charts and session histories.

---

## 🔗 Architecture Overview

- `/patient/exercise` → Main React UI. 
- `usePoseDetection.ts` → The orchestrator hook. It connects the video feed to the Web Worker and feeds the results into the Zustand Store.
- `poseStore.ts` → Zustand store holding all kinematic state.
- `pose.worker.ts` → The Web Worker hosting MediaPipe.
- `kinematics.ts` → The core biomechanics logic (angle measurement, valgus math, phase changes).

---

## ⚖️ License

MIT License. See `LICENSE` for details.
