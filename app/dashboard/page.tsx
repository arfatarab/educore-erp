"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://lowzgkzynsqfwdwjxtsc.supabase.co",
  "sb_publishable_38GUxlSX5nVf8189sLjUGg_ARXPLI5M"
);

interface Student {
  id: string;
  register_no: string;
  full_name: string;
  class_name: string;
  institute_name: string;
  parent_phone: string;
  fee_status: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [registerNo, setRegisterNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [instituteName, setInstituteName] = useState("JMCT Campus");
  const [parentPhone, setParentPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("students").insert([
      {
        register_no: registerNo,
        full_name: fullName,
        class_name: className,
        institute_name: instituteName,
        parent_phone: parentPhone,
        fee_status: "Paid",
      },
    ]);

    setSaving(false);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setRegisterNo("");
      setFullName("");
      setClassName("");
      setParentPhone("");
      setShowForm(false);
      fetchStudents();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col justify-between">
        <div>
          <div className="text-xl font-bold text-indigo-400">EduCoreERP</div>
          <p className="text-xs text-slate-400 mt-1">Principal Control Panel</p>

          <nav className="mt-8 space-y-2 text-sm">
            <div className="px-4 py-2.5 bg-indigo-600 rounded-lg font-medium">
              Students & Admissions
            </div>
            <div className="px-4 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer">
              Daily Attendance
            </div>
            <div className="px-4 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer">
              Exams & Report Cards
            </div>
            <div className="px-4 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer">
              Fees & Accounts
            </div>
          </nav>
        </div>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white border-t border-slate-800 pt-4"
        >
          ← Back to Home / Logout
        </Link>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Campus Overview</h1>
            <p className="text-sm text-slate-500">Live Multi-Institute Student Records</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            {showForm ? "Close Form" : "+ New Student Admission"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Registered Students</p>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">{students.length}</h2>
            <p className="text-xs text-emerald-600 font-medium mt-2">Live from Cloud Database</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Active Campus</p>
            <h2 className="text-xl font-bold text-slate-900 mt-2">JMCT Campus</h2>
            <p className="text-xs text-indigo-600 font-medium mt-2">Multi-Institute Ready</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Database Status</p>
            <h2 className="text-xl font-bold text-emerald-600 mt-2">Connected</h2>
            <p className="text-xs text-slate-500 mt-2">Supabase Cloud Sync</p>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleAddStudent}
            className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-md mb-8"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              New Student Admission Form
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Register No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JMCT-2026-01"
                  value={registerNo}
                  onChange={(e) => setRegisterNo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zaid Ahmed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class / Grade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10th - A"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institute / Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent WhatsApp / Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition"
              >
                {saving ? "Saving to Cloud..." : "Save Student Record"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Enrolled Students List</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading students from database...
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Abhi koi student add nahi hua hai. Upar <strong>"+ New Student Admission"</strong> par click karke pehla student add karein!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3">Reg No.</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Class</th>
                    <th className="px-6 py-3">Institute</th>
                    <th className="px-6 py-3">Parent Phone</th>
                    <th className="px-6 py-3">Fee Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-indigo-600">
                        {st.register_no}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {st.full_name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{st.class_name}</td>
                      <td className="px-6 py-4 text-slate-600">{st.institute_name}</td>
                      <td className="px-6 py-4 text-slate-600">{st.parent_phone || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                          {st.fee_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}