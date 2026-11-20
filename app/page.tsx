"use client";

import React, { useEffect, useState } from "react";
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

interface CampusSettings {
  institute_name: string;
  city_address: string;
  admin_pin: string;
  staff_pin: string;
  branches: string;
}

export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<CampusSettings>({
    institute_name: "JMCT Campus",
    city_address: "Nashik, Maharashtra",
    admin_pin: "2026",
    staff_pin: "1234",
    branches: "JMCT International School, JMCT Pharmacy College, JMCT Polytechnic College",
  });

  const [searchReg, setSearchReg] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [exams, setExams] = useState<ExamData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    async function loadCampusSettings() {
      const { data } = await supabase.from("campus_settings").select("*").eq("id", 1).single();
      if (data) {
        setSettings({
          institute_name: data.institute_name || "JMCT Campus",
          city_address: data.city_address || "Nashik, Maharashtra",
          admin_pin: data.admin_pin || "2026",
          staff_pin: data.staff_pin || "1234",
          branches:
            data.branches ||
            "JMCT International School, JMCT Pharmacy College, JMCT Polytechnic College",
        });
      }
    }
    loadCampusSettings();
  }, []);

  const branchItems = settings.branches
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

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
    if (pinInput === settings.admin_pin) {
      localStorage.setItem("educore_role", "principal");
      router.push("/dashboard");
    } else if (pinInput === settings.staff_pin) {
      localStorage.setItem("educore_role", "teacher");
      router.push("/dashboard");
    } else {
      setPinError(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Official Institutional Strip */}
      <div className="bg-slate-950 text-slate-300 text-[11px] py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <span className="font-semibold tracking-wide uppercase text-amber-400">
            ● Official Digital Campus ERP • {settings.city_address}
          </span>
          <span>Academic Session 2026–27 • Centralized Administration &amp; Parent Portal</span>
        </div>
      </div>

      {/* Main Institutional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-amber-400 flex flex-col items-center justify-center font-black shadow-md border border-slate-700">
              <span className="text-sm leading-none tracking-tighter">JMCT</span>
              <span className="text-[8px] text-white tracking-widest uppercase mt-0.5">ERP</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
                {settings.institute_name}
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Unified Academic, Attendance, Examination &amp; Accounts Portal
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPinInput("");
              setPinError(false);
              setShowPinModal(true);
            }}
            className="bg-slate-900 hover:bg-indigo-800 text-white px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-sm transition cursor-pointer"
          >
            Principal / Staff Login →
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-5 py-10 md:py-14 w-full space-y-10">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="max-w-3xl space-y-4 relative z-10">
            <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              {settings.institute_name} • {settings.city_address}
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Excellence in Education, Powered by{" "}
              <span className="text-amber-400">Smart Digital Governance</span>
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Centralized campus portal connecting Administration, Faculty, Students, and Parents with real-time attendance tracking, verified digital report cards, and transparent fee management.
            </p>
          </div>

          {/* Institutional Wings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-800">
            {branchItems.map((branch, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Campus Wing 0{idx + 1}
                </p>
                <h3 className="text-base font-bold text-white mt-1">{branch}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Active Digital Attendance, Exams &amp; Accounts
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Student & Parent Quick Portal */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                24×7 Parent &amp; Student Desk
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                Student Academic &amp; Fee Verification Portal
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Enter your official Campus Register Number to view live attendance, exam marksheet, and fee status.
              </p>
            </div>
          </div>

          <form onSubmit={handleStudentLookup} className="mt-6 max-w-xl flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={searchReg}
              onChange={(e) => setSearchReg(e.target.value)}
              placeholder="Enter Official Register No. (e.g. 1111)"
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-700"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-slate-900 hover:bg-indigo-800 text-white px-7 py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {searching ? "Verifying..." : "View Student Record"}
            </button>
          </form>

          {notFound && (
            <div className="max-w-xl mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">
              No student record found for Register No. &ldquo;{searchReg}&rdquo;. Please verify your Register Number with the Campus Office.
            </div>
          )}

          {student && (
            <div className="mt-8 border-t border-slate-200 pt-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase">
                    {student.institute}
                  </span>
                  <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{student.student_name}</h4>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Register No: <strong className="text-slate-900">{student.reg_no}</strong> • Class / Course:{" "}
                    <strong className="text-slate-900">{student.class_name}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right bg-white px-5 py-3 rounded-xl border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-bold uppercase">Fee Account Status</p>
                  <span
                    className={`inline-block mt-1 px-4 py-1 rounded-full text-xs font-extrabold ${
                      student.fee_status === "Paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {student.fee_status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-2xl p-5 bg-white">
                  <h5 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
                    <span>Published Examination Results</span>
                    <span className="text-xs font-normal text-slate-400">Verified Copy</span>
                  </h5>
                  {exams.length === 0 ? (
                    <p className="text-xs text-slate-400">No examination marks published yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {exams.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-sm">
                          <div>
                            <p className="font-bold text-slate-800">{ex.exam_name}</p>
                            <p className="text-xs text-slate-500">
                              Score: <strong>{ex.obtained_marks}</strong> / {ex.total_marks} (
                              {((ex.obtained_marks / ex.total_marks) * 100).toFixed(1)}%)
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold text-xs">
                            Grade {ex.grade}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 bg-white">
                  <h5 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
                    <span>Recent Daily Attendance Log</span>
                    <span className="text-xs font-normal text-slate-400">Last 5 Days</span>
                  </h5>
                  {attendance.length === 0 ? (
                    <p className="text-xs text-slate-400">No attendance entries recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {attendance.map((att, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 text-sm">
                          <span className="font-semibold text-slate-700">{att.date}</span>
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                              att.status === "Present"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
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

        {/* Official Campus Circular & Notice Board */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-slate-900">Official Campus Circulars &amp; Guidelines</h3>
            <span className="text-xs font-bold text-slate-500">Ref: JMCT/ADMIN/2026-27/ERP-01</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="font-bold text-slate-900">1. Daily Attendance Compliance</p>
              <p>All Class Teachers must finalize daily attendance entries on the portal before 11:30 AM (Morning) and 3:30 PM (Afternoon).</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="font-bold text-slate-900">2. Official Fee Receipts</p>
              <p>Only system-generated Official Fee Receipts issued via the JMCT Campus Portal are valid proof of fee payment.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <p className="font-bold text-slate-900">3. Digital Report Cards</p>
              <p>Students with cleared fee accounts can view and print verified examination marksheets directly using their Register Number.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Official Institutional Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-5 mt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-bold text-white text-sm">{settings.institute_name} • {settings.city_address}</p>
            <p className="mt-0.5">{settings.branches}</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-300 font-semibold">Office of the Principal &amp; Chairman</p>
            <p className="mt-0.5">© 2026 All Rights Reserved • Powered by EduCore ERP</p>
          </div>
        </div>
      </footer>

      {/* Principal / Teacher PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAdminAccess} className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                Authorized Access Only
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                {settings.institute_name} Staff Login
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your assigned Principal PIN or Faculty Teacher PIN to unlock the dashboard.
              </p>
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
              placeholder="••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-xl tracking-widest font-extrabold"
            />
            {pinError && (
              <p className="text-xs font-semibold text-rose-600 text-center">
                Invalid Security PIN. Contact Chairman&apos;s Office.
              </p>
            )}
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
                className="bg-slate-900 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl text-sm font-bold"
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