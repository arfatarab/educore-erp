"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("principal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Abhi testing ke liye direct dashboard par bhej rahe hain
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md border border-slate-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-600">EduCoreERP</h1>
          <p className="text-sm text-slate-500 mt-1">Apne Portal Mein Sign In Karein</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          {["principal", "teacher", "student"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 text-xs font-semibold rounded-lg capitalize transition ${
                role === r
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email ya Register ID
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jmctcampus.edu"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            Login as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
      </div>
    </div>
  );
}