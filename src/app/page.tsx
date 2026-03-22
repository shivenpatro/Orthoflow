"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const features = [
  {
    icon: "🎯",
    title: "Real-Time Rep Counting",
    desc: "AI counts every rep and flags incomplete movements instantly.",
  },
  {
    icon: "🦵",
    title: "Valgus Collapse Detection",
    desc: "Detects knee-caving in milliseconds with a visual alert.",
  },
  {
    icon: "📐",
    title: "3D Joint Angle Tracking",
    desc: "Precise biomechanical analysis using dot-product math on 33 landmarks.",
  },
  {
    icon: "📊",
    title: "Doctor Dashboard",
    desc: "Compliance charts and ROM progress visualized over time.",
  },
  {
    icon: "🔒",
    title: "100% Private",
    desc: "Video never leaves your device. All AI runs locally in your browser.",
  },
  {
    icon: "⚡",
    title: "Web Worker Architecture",
    desc: "GPU-accelerated pose estimation runs off the main thread at 30 FPS.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white text-sm">⚡</span>
          </div>
          <span className="text-white font-black text-lg tracking-tight">OrthoFlow</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors font-medium"
        >
          Sign In →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-4 pt-24 pb-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 rounded-full px-4 py-1.5 text-xs text-indigo-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by MediaPipe & Neon Postgres
          </div>

          <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
            Physical Therapy
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Reimagined with AI
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            OrthoFlow uses your webcam and on-device machine learning to track your
            biomechanics in real-time — counting reps, correcting form, and reporting
            progress to your doctor. No app download. No data leaves your device.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Get Started →
            </Link>
            <Link
              href="/doctor/dashboard"
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-medium px-8 py-3.5 rounded-xl transition-all"
            >
              Doctor Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 px-4 pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="bg-white/4 border border-white/7 hover:border-indigo-400/30 rounded-2xl p-6 transition-all hover:bg-white/6 group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
              <h3 className="font-bold text-white mb-1.5">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-600">
        OrthoFlow — All AI inference runs locally in your browser. Your video is never transmitted.
      </footer>
    </div>
  );
}
