import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div className="text-2xl font-bold text-indigo-600 tracking-tight">
          EduCore<span className="text-slate-800">ERP</span>
        </div>
        <div className="space-x-4">
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            Institute Login
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <span className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full">
          Next-Gen Multi-Institute Management System
        </span>
        <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
          Manage Your School, College & Madrasa in{" "}
          <span className="text-indigo-600">One Unified Portal</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Admissions, Smart Attendance, Automated Report Cards, Fee Tracking, aur
          Campus Events — sab kuch ek hi fast aur secure cloud platform par.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3.5 text-base font-semibold text-white bg-indigo-600 rounded-xl shadow-md hover:bg-indigo-700 transition"
          >
            Open Admin Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}