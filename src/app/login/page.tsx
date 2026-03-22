"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"doctor" | "patient" | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (role: "doctor" | "patient") => {
    setSelected(role);
    setLoading(true);

    // Set a simple role cookie (replace with real auth in production)
    document.cookie = `orthoflow_role=${role}; path=/; max-age=86400; SameSite=Lax`;

    // Small delay for animation
    await new Promise((r) => setTimeout(r, 600));

    router.push(role === "doctor" ? "/doctor/dashboard" : "/patient/exercise");
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white text-lg">⚡</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">OrthoFlow</h1>
          <p className="text-slate-400 text-sm mt-1">AI-Powered Physical Therapy</p>
        </div>

        {/* Role selection */}
        <div className="space-y-3">
          <p className="text-slate-500 text-xs text-center uppercase tracking-widest">
            Sign in as
          </p>
          {(["doctor", "patient"] as const).map((role) => {
            const isLoading = loading && selected === role;

            return (
              <motion.button
                key={role}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                onClick={() => login(role)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${
                  role === "doctor"
                    ? "bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/20 hover:border-indigo-400/50"
                    : "bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20 hover:border-violet-400/50"
                } disabled:opacity-60`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                  role === "doctor" ? "bg-indigo-500/20" : "bg-violet-500/20"
                }`}>
                  {role === "doctor" ? "🩺" : "🏋️"}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold capitalize">{role}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {role === "doctor"
                      ? "View patient dashboards & compliance data"
                      : "Start your exercise session"}
                  </p>
                </div>
                {isLoading && (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-slate-600">
          Demo mode — no credentials required
        </p>
      </motion.div>
    </div>
  );
}
