"use client";
export const dynamic = "force-dynamic";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentData {
  reg_no: string;
  student_name: string;
  class_name: string;
  institute: string;
  fee_status: string;
}

interface ExamData {
  exam_name: string;
  obtained_marks: number;
  total_marks: number;
  grade: string;
}

interface AttendanceData {
  date: string;
  status: string;
}

export default function HomePage() {
  const router = useRouter();
  const [searchReg, setSearchReg] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [exams, setExams] = useState<ExamData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);

  // Principal PIN Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  async function handleStudentLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!searchReg.trim()) return;

    setSearching(true);
    setNotFound(false);
    setStudent(null);

    const cleanReg = searchReg.trim();

    const { data: stuData } = await supabase
      .from("students")
      .select("reg_no, student_name, class_name, institute, fee_status")
      .ilike("reg_no", cleanReg)
      .maybeSingle();

    if (!stuData) {
      setNotFound(true);
      setSearching(false);
      return;
    }

    setStudent(stuData);

    const { data: examData } = await supabase
      .from("exam_results")
      .select("exam_name, obtained_marks, total_marks, grade")
      .ilike("reg_no", cleanReg)
      .order("created_at", { ascending: false });

    setExams(examData || []);

    const { data: attData } = await supabase
      .from("attendance")
      .select("date, status")
      .ilike("reg_no", cleanReg)
      .order("date", { ascending: false })
      .limit(5);

    setAttendance(attData || []);
    setSearching(false);
  }

  function handleAdminAccess(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput === "2026") {
      router.push("/dashboard");
    } else {
      setPinError(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-indigo-600/20">
              E
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                EduCore<span className="text-indigo-600">ERP</span>
              </span>
              <p className="text-[11px] font-medium text-slate-500 -mt-1">JMCT Campus • Nashik</p>
            </div>
          </div>

          <button
            onClick={() => {
              setPinInput("");
              setPinError(false);
              setShowPinModal(true);
            }}
            className="bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
          >
            Principal / Staff Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-5 py-12 md:py-16 w-full">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            JMCT International School • Pharmacy • Polytechnic
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Manage Your School, College &amp; Madrasa in{" "}
            <span className="text-indigo-600">One Unified Portal</span>
          </h1>
          <p className="text-base md:text-lg text-slate-600">
            Admissions, Smart Daily Attendance, Digital Report Cards, aur Instant Fee Verification — sab kuch ek fast aur secure cloud platform par.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setPinInput("");
                setPinError(false);
                setShowPinModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/25 transition"
            >
              Open Principal Dashboard →
            </button>
          </div>
        </div>

        {/* Live Student & Parent Portal Box */}
        <div className="mt-14 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 md:p-10">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Student &amp; Parent Quick Portal</h2>
            <p className="text-sm text-slate-500 mt-1">
              Apna Register Number daal kar live Result, Attendance aur Fee Status check karein
            </p>
          </div>

          <form onSubmit={handleStudentLookup} className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={searchReg}
              onChange={(e) => setSearchReg(e.target.value)}
              placeholder="Enter Register No. (e.g. 1111)"
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
            >
              {searching ? "Searching..." : "Check Record"}
            </button>
          </form>

          {notFound && (
            <div className="max-w-lg mx-auto mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-center text-sm font-semibold text-rose-700">
              Is Register Number ka koi record nahi mila. Kripya sahi Reg No. check karein.
            </div>
          )}

          {student && (
            <div className="mt-8 border-t border-slate-200 pt-8 space-y-6">
              {/* Student Profile Header */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-600">{student.institute}</span>
                  <h3 className="text-xl font-extrabold text-slate-900">{student.student_name}</h3>
                  <p className="text-sm text-slate-600">
                    Reg No: <strong>{student.reg_no}</strong> • Class: <strong>{student.class_name}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500 font-semibold uppercase">Fee Clearance</p>
                  <span
                    className={`inline-block mt-1 px-4 py-1.5 rounded-full text-xs font-extrabold ${
                      student.fee_status === "Paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {student.fee_status}
                  </span>
                </div>
              </div>

              {/* Results & Attendance Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exam Results */}
                <div className="border border-slate-200 rounded-2xl p-5">
                  <h4 className="font-bold text-slate-800 mb-3">Published Exam Results</h4>
                  {exams.length === 0 ? (
                    <p className="text-xs text-slate-400">Abhi koi exam result publish nahi hua hai.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {exams.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl text-sm">
                          <div>
                            <p className="font-bold text-slate-800">{ex.exam_name}</p>
                            <p className="text-xs text-slate-500">
                              Marks: {ex.obtained_marks} / {ex.total_marks}
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs">
                            Grade {ex.grade}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Attendance */}
                <div className="border border-slate-200 rounded-2xl p-5">
                  <h4 className="font-bold text-slate-800 mb-3">Recent Daily Attendance</h4>
                  {attendance.length === 0 ? (
                    <p className="text-xs text-slate-400">Abhi attendance record uplabdh nahi hai.</p>
                  ) : (
                    <div className="space-y-2">
                      {attendance.map((att, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl text-sm">
                          <span className="font-medium text-slate-700">{att.date}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              att.status === "Present"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} EduCore ERP • Designed &amp; Managed for JMCT Campus, Nashik
      </footer>

      {/* Principal PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAdminAccess} className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Principal / Staff Access</h3>
              <p className="text-xs text-slate-500 mt-0.5">Admin Dashboard kholne ke liye Campus PIN daalein</p>
            </div>
            <input
              type="password"
              autoFocus
              required
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Enter PIN (Default: 2026)"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-lg tracking-widest font-bold"
            />
            {pinError && <p className="text-xs font-semibold text-rose-600 text-center">Galat PIN! Kripya dobara koshish karein.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold"
              >
                Unlock Dashboard
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}