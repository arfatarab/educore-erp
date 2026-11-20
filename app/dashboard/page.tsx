"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Student {
  id?: string;
  reg_no: string;
  student_name: string;
  class_name: string;
  institute: string;
  parent_phone: string;
  fee_status: string;
}

interface AttendanceRecord {
  reg_no: string;
  status: "Present" | "Absent";
}

interface ExamResult {
  id: string;
  reg_no: string;
  student_name: string;
  class_name: string;
  institute: string;
  exam_name: string;
  total_marks: number;
  obtained_marks: number;
  grade: string;
}

interface CampusSettings {
  institute_name: string;
  city_address: string;
  admin_pin: string;
  branches: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"students" | "attendance" | "exams" | "fees" | "settings">("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstitute, setFilterInstitute] = useState("All");

  // White-Label Campus Settings State
  const [settings, setSettings] = useState<CampusSettings>({
    institute_name: "EduCore Demo Campus",
    city_address: "Nashik, Maharashtra",
    admin_pin: "2026",
    branches: "Main School, Junior College, Degree College",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const branchList = settings.branches
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const availableInstitutes = [settings.institute_name, ...branchList.filter((b) => b !== settings.institute_name)];

  // Student Form State
  const [showForm, setShowForm] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [institute, setInstitute] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [feeStatus, setFeeStatus] = useState("Pending");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // Attendance State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "Present" | "Absent">>({});

  // Exams State
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examRegNo, setExamRegNo] = useState("");
  const [examName, setExamName] = useState("Annual Examination 2026");
  const [totalMarks, setTotalMarks] = useState("500");
  const [obtainedMarks, setObtainedMarks] = useState("");
  const [selectedMarksheet, setSelectedMarksheet] = useState<ExamResult | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchStudents();
    fetchResults();
  }, []);

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  async function fetchSettings() {
    const { data } = await supabase.from("campus_settings").select("*").eq("id", 1).single();
    if (data) {
      setSettings({
        institute_name: data.institute_name,
        city_address: data.city_address,
        admin_pin: data.admin_pin,
        branches: data.branches,
      });
      setInstitute(data.institute_name);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    const { error } = await supabase.from("campus_settings").upsert({
      id: 1,
      institute_name: settings.institute_name.trim(),
      city_address: settings.city_address.trim(),
      admin_pin: settings.admin_pin.trim(),
      branches: settings.branches.trim(),
    });
    setSavingSettings(false);
    if (error) {
      alert("Settings save error: " + error.message);
    } else {
      setInstitute(settings.institute_name.trim());
      alert("Campus Branding & Settings saved successfully!");
    }
  }

  async function fetchStudents() {
    setLoading(true);
    const { data, error } = await supabase.from("students").select("*").order("reg_no", { ascending: true });
    if (!error && data) setStudents(data);
    setLoading(false);
  }

  async function fetchAttendance(date: string) {
    const { data } = await supabase.from("attendance").select("reg_no, status").eq("date", date);
    const map: Record<string, "Present" | "Absent"> = {};
    if (data) {
      data.forEach((row: AttendanceRecord) => {
        map[row.reg_no] = row.status;
      });
    }
    setAttendanceMap(map);
  }

  async function fetchResults() {
    const { data } = await supabase.from("exam_results").select("*").order("created_at", { ascending: false });
    if (data) setResults(data);
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!regNo || !studentName || !className) return;

    const { error } = await supabase.from("students").insert([
      {
        reg_no: regNo.trim(),
        student_name: studentName.trim(),
        class_name: className.trim(),
        institute: institute || settings.institute_name,
        parent_phone: parentPhone.trim(),
        fee_status: feeStatus,
      },
    ]);

    if (error) {
      alert("Error saving student: " + error.message);
    } else {
      setRegNo("");
      setStudentName("");
      setClassName("");
      setParentPhone("");
      setShowForm(false);
      fetchStudents();
    }
  }

  async function handleDeleteStudent(reg_no: string) {
    if (!confirm(`Delete student ${reg_no}?`)) return;
    await supabase.from("students").delete().eq("reg_no", reg_no);
    fetchStudents();
  }

  function downloadSampleCsv() {
    const defaultBranch = availableInstitutes[0] || settings.institute_name;
    const secondBranch = availableInstitutes[1] || defaultBranch;
    const csv =
      "reg_no,student_name,class_name,institute,parent_phone,fee_status\n" +
      `1001,Ayaan Shaikh,Class 10th,${defaultBranch},9876543210,Paid\n` +
      `1002,Sara Khan,Class 12th,${secondBranch},9876543211,Pending\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${settings.institute_name.replace(/\s+/g, "_")}_Students_Template.csv`;
    a.click();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCsv(true);

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const rows = lines
      .slice(1)
      .map((line) => {
        const [reg_no, student_name, class_name, inst, parent_phone, fee_status] = line
          .split(",")
          .map((c) => c.trim());
        return {
          reg_no,
          student_name,
          class_name,
          institute: inst || settings.institute_name,
          parent_phone: parent_phone || "",
          fee_status: fee_status === "Paid" ? "Paid" : "Pending",
        };
      })
      .filter((r) => r.reg_no && r.student_name);

    if (rows.length === 0) {
      alert("CSV file mein koi valid student record nahi mila.");
      setUploadingCsv(false);
      return;
    }

    const { error } = await supabase.from("students").upsert(rows, { onConflict: "reg_no" });
    setUploadingCsv(false);
    if (error) {
      alert("Bulk upload error: " + error.message);
    } else {
      alert(`${rows.length} students successfully upload ho gaye!`);
      setShowBulkModal(false);
      fetchStudents();
    }
  }

  async function markAttendance(student: Student, status: "Present" | "Absent") {
    setAttendanceMap((prev) => ({ ...prev, [student.reg_no]: status }));
    await supabase.from("attendance").upsert(
      {
        reg_no: student.reg_no,
        student_name: student.student_name,
        institute: student.institute,
        date: selectedDate,
        status,
      },
      { onConflict: "reg_no,date" }
    );
  }

  async function toggleFeeStatus(student: Student) {
    const nextStatus = student.fee_status === "Paid" ? "Pending" : "Paid";
    await supabase.from("students").update({ fee_status: nextStatus }).eq("reg_no", student.reg_no);
    fetchStudents();
  }

  async function handleAddResult(e: React.FormEvent) {
    e.preventDefault();
    const stu = students.find((s) => s.reg_no.toLowerCase() === examRegNo.trim().toLowerCase());
    if (!stu) {
      alert("Student Register No. not found! Please check Reg No.");
      return;
    }
    const tot = Number(totalMarks);
    const obt = Number(obtainedMarks);
    const pct = (obt / tot) * 100;
    const grade = pct >= 85 ? "A+" : pct >= 70 ? "A" : pct >= 55 ? "B" : pct >= 35 ? "C" : "Fail";

    const { error } = await supabase.from("exam_results").insert([
      {
        reg_no: stu.reg_no,
        student_name: stu.student_name,
        class_name: stu.class_name,
        institute: stu.institute,
        exam_name: examName,
        total_marks: tot,
        obtained_marks: obt,
        grade,
      },
    ]);

    if (error) {
      alert("Error saving marks: " + error.message);
    } else {
      setExamRegNo("");
      setObtainedMarks("");
      fetchResults();
    }
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reg_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInst = filterInstitute === "All" || s.institute === filterInstitute;
    return matchesSearch && matchesInst;
  });

  const paidCount = students.filter((s) => s.fee_status === "Paid").length;
  const pendingCount = students.length - paidCount;
  const presentTodayCount = Object.values(attendanceMap).filter((v) => v === "Present").length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between p-5 shrink-0">
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              EduCore<span className="text-indigo-400">ERP</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">{settings.institute_name} • Principal Panel</p>
          </div>

          <nav className="space-y-2">
            {[
              { id: "students", label: "Students & Admissions" },
              { id: "attendance", label: "Daily Attendance" },
              { id: "exams", label: "Exams & Report Cards" },
              { id: "fees", label: "Fees & Accounts" },
              { id: "settings", label: "⚙ Campus Settings" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  activeTab === item.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 mt-8">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
            ← Back to Home / Portal
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Total Students</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{students.length}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">● Live Cloud Sync</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Present ({selectedDate})</p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-1">{presentTodayCount}</p>
            <p className="text-xs text-slate-500 mt-1">Marked Today</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Fees Paid</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">{paidCount}</p>
            <p className="text-xs text-slate-500 mt-1">Cleared Accounts</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Fees Pending</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{pendingCount}</p>
            <p className="text-xs text-slate-500 mt-1">Action Required</p>
          </div>
        </div>

        {/* TAB 1: STUDENTS & ADMISSIONS */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Students & Admissions</h2>
                <p className="text-sm text-slate-500">Manage enrollments across {settings.institute_name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowBulkModal(!showBulkModal)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  {showBulkModal ? "Close CSV Upload" : "↑ Bulk CSV Upload"}
                </button>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  {showForm ? "Close Form" : "+ New Admission"}
                </button>
              </div>
            </div>

            {showBulkModal && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800">Bulk Upload Students (Excel / CSV)</h3>
                    <p className="text-xs text-slate-500">Excel file ko CSV (Comma delimited) mein save karke upload karein</p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    ↓ Download Sample CSV Template
                  </button>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  disabled={uploadingCsv}
                  onChange={handleCsvUpload}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadingCsv && <p className="text-xs font-semibold text-indigo-600">Uploading records to Supabase...</p>}
              </div>
            )}

            {showForm && (
              <form onSubmit={handleAddStudent} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800">New Student Admission Form</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Register No. *</label>
                    <input
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="e.g. 2026-01"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Student Full Name *</label>
                    <input
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Zaid Ahmed"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Year *</label>
                    <input
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="e.g. Class 10th / FY B.Pharm"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Institute / Branch *</label>
                    <select
                      value={institute || availableInstitutes[0]}
                      onChange={(e) => setInstitute(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      {availableInstitutes.map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Parent WhatsApp Phone</label>
                    <input
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Fee Status</label>
                    <select
                      value={feeStatus}
                      onChange={(e) => setFeeStatus(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    Save Student Record
                  </button>
                </div>
              </form>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Student Name or Register No..."
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <select
                value={filterInstitute}
                onChange={(e) => setFilterInstitute(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="All">All Campuses / Institutes</option>
                {availableInstitutes.map((inst) => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">Reg No.</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4">Institute</th>
                    <th className="py-3.5 px-4">Parent Phone</th>
                    <th className="py-3.5 px-4">Fee Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-400">Loading records...</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-400">No students found.</td></tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.reg_no} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-indigo-600">{s.reg_no}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{s.student_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{s.class_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{s.institute}</td>
                        <td className="py-3.5 px-4 text-slate-600">{s.parent_phone || "-"}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            s.fee_status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {s.fee_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteStudent(s.reg_no)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DAILY ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Daily Attendance Register</h2>
                <p className="text-sm text-slate-500">One-click cloud attendance synced to Supabase</p>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">Reg No.</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Institute</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s) => {
                    const current = attendanceMap[s.reg_no];
                    return (
                      <tr key={s.reg_no} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-indigo-600">{s.reg_no}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{s.student_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{s.institute}</td>
                        <td className="py-3.5 px-4">
                          {current ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              current === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {current}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Not Marked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => markAttendance(s, "Present")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              current === "Present"
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => markAttendance(s, "Absent")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              current === "Absent"
                                ? "bg-rose-600 text-white"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            Absent
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EXAMS & REPORT CARDS */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Exams & Report Cards</h2>
              <p className="text-sm text-slate-500">Publish exam marks and generate instant digital marksheets</p>
            </div>

            <form onSubmit={handleAddResult} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Reg No. *</label>
                <input
                  required
                  value={examRegNo}
                  onChange={(e) => setExamRegNo(e.target.value)}
                  placeholder="e.g. 1111"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Name *</label>
                <input
                  required
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Marks *</label>
                <input
                  required
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Obtained Marks *</label>
                <input
                  required
                  type="number"
                  value={obtainedMarks}
                  onChange={(e) => setObtainedMarks(e.target.value)}
                  placeholder="e.g. 445"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold">
                Publish Result
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">Reg No.</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Exam</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4 text-right">Marksheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {results.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-400">No exam results published yet.</td></tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-indigo-600">{r.reg_no}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{r.student_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{r.exam_name}</td>
                        <td className="py-3.5 px-4 font-semibold">{r.obtained_marks} / {r.total_marks}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{r.grade}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedMarksheet(r)}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700"
                          >
                            View / Print Card
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Printable Marksheet Modal */}
            {selectedMarksheet && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                <div className="bg-white max-w-lg w-full rounded-2xl p-8 border-4 border-indigo-600 shadow-2xl space-y-5">
                  <div className="text-center border-b pb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Official Statement of Marks</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{selectedMarksheet.institute}</h3>
                    <p className="text-xs text-slate-500">{settings.city_address} • {selectedMarksheet.exam_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">Student Name:</span> <strong className="block text-slate-900">{selectedMarksheet.student_name}</strong></div>
                    <div><span className="text-slate-500">Register No.:</span> <strong className="block text-indigo-600">{selectedMarksheet.reg_no}</strong></div>
                    <div><span className="text-slate-500">Class / Course:</span> <strong className="block text-slate-900">{selectedMarksheet.class_name}</strong></div>
                    <div><span className="text-slate-500">Final Grade:</span> <strong className="block text-emerald-600">{selectedMarksheet.grade}</strong></div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Total Marks Obtained</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {selectedMarksheet.obtained_marks} / {selectedMarksheet.total_marks} (
                      {((selectedMarksheet.obtained_marks / selectedMarksheet.total_marks) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <button onClick={() => setSelectedMarksheet(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                      Close
                    </button>
                    <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold">
                      Print Marksheet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FEES & ACCOUNTS */}
        {activeTab === "fees" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Fees & Accounts Management</h2>
              <p className="text-sm text-slate-500">Toggle fee clearance status and send direct WhatsApp reminders</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">Reg No.</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Institute</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s) => {
                    const cleanPhone = s.parent_phone?.replace(/\D/g, "") || "";
                    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                    const waText = encodeURIComponent(
                      `Assalamu Alaikum, Reminder from ${s.institute}: Fee status for ${s.student_name} (Reg No: ${s.reg_no}) is currently ${s.fee_status}. Kindly clear dues at the campus office.`
                    );

                    return (
                      <tr key={s.reg_no} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-indigo-600">{s.reg_no}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{s.student_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{s.institute}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            s.fee_status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {s.fee_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => toggleFeeStatus(s)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          >
                            Mark {s.fee_status === "Paid" ? "Pending" : "Paid"}
                          </button>
                          {waPhone && (
                            <a
                              href={`https://wa.me/${waPhone}?text=${waText}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              WhatsApp Parent
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: WHITE-LABEL CAMPUS SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">White-Label Campus Settings</h2>
              <p className="text-sm text-slate-500">Customize institute branding, branches, and Principal PIN without touching code</p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Institute / School / Madrasa Name *</label>
                <input
                  required
                  value={settings.institute_name}
                  onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
                  placeholder="e.g. Al-Falah International School"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">City & State Address *</label>
                <input
                  required
                  value={settings.city_address}
                  onChange={(e) => setSettings({ ...settings, city_address: e.target.value })}
                  placeholder="e.g. Nashik, Maharashtra"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Branches / Wings (Comma Separated)</label>
                <input
                  value={settings.branches}
                  onChange={(e) => setSettings({ ...settings, branches: e.target.value })}
                  placeholder="e.g. Primary School, High School, Junior College"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Har branch ko comma (,) se alag likhein — yeh Admission aur Filter dropdown mein dikhengi.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Principal / Admin Login PIN *</label>
                <input
                  required
                  value={settings.admin_pin}
                  onChange={(e) => setSettings({ ...settings, admin_pin: e.target.value })}
                  placeholder="e.g. 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  {savingSettings ? "Saving..." : "Save Campus Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}