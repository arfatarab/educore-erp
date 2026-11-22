"use client";
import React, { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Wing = "School" | "Pharmacy" | "Polytechnic";
type RoleTab =
  | "admin"
  | "teacher"
  | "peon"
  | "guard"
  | "parent"
  | "qbank"
  | "timetable"
  | "homework"
  | "inventory"
  | "hr"
  | "notifications";
type AccountRole = "admin" | "teacher" | "coordinator" | "peon" | "guard" | "parent" | "student";
type PortalMode = "portal" | "erp" | "student" | "fees" | "sis";
type TourTab =
  | "Dashboard"
  | "Attendance"
  | "Peon Duty"
  | "Gate Pass"
  | "Fees"
  | "Question Bank"
  | "Timetable"
  | "Homework"
  | "Inventory"
  | "HR & Staff"
  | "Notifications";
type ModuleCategory = "All" | "Academic & Exams" | "Fees & Parent" | "Operations";
type FeeFilter = "All" | "Due" | "Paid";

const COORDINATOR_PASSCODE = "COORD2026";

interface Student {
  id: string;
  name: string;
  wing: Wing;
  course: string;
  phone: string;
  presentDays: number;
  totalDays: number;
  totalFee: number;
  paidFee: number;
  todayStatus: "Present" | "Absent" | "Unmarked";
}

interface PeonTask {
  id: string;
  staffName: string;
  wing: Wing;
  zone: string;
  locationTask: string;
  shift: string;
  done: boolean;
}

interface GatePass {
  id: string;
  visitorName: string;
  roleType: "Student" | "Parent" | "Vendor" | "Visitor";
  wing: Wing;
  purpose: string;
  time: string;
  status: "Inside" | "Exited";
}

interface QuestionItem {
  id: string;
  wing: Wing;
  className: string;
  academicYear: string;
  uploadedBy: string;
  subject: string;
  unit: string;
  marks: number;
  questionText: string;
  includedInPaper?: boolean;
}

interface TimetableSlot {
  id: string;
  wing: Wing;
  className: string;
  day: string;
  timing: string;
  subject: string;
  faculty: string;
  roomOrLab: string;
}

interface HomeworkItem {
  id: string;
  wing: Wing;
  className: string;
  subject: string;
  title: string;
  dueDate: string;
  assignedBy: string;
  completed: boolean;
}

interface InventoryItem {
  id: string;
  wing: Wing;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  status: "Available" | "Low Stock" | "Out of Stock";
}

interface StaffRecord {
  id: string;
  name: string;
  roleTitle: string;
  wing: Wing;
  shift: string;
  phone: string;
  status: "On Duty" | "On Leave" | "Shift Completed";
}

interface CampusNotification {
  id: string;
  wing: Wing | "All";
  audience: "Students" | "Parents" | "Faculty & Staff" | "All";
  category: "Fee Alert" | "Attendance" | "Exam & Q-Bank" | "Operations";
  title: string;
  message: string;
  dateLabel: string;
}

interface FeePaymentRecord {
  txnId: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: "UPI" | "Card" | "NetBanking";
  upiId?: string;
  paidAt: string;
}

interface AuthSession {
  role: AccountRole;
  identifier: string;
  label: string;
}

const STORAGE_KEYS = {
  peon: "jmct_erp_peon_tasks_v1",
  gate: "jmct_erp_gate_passes_v1",
  qbank: "jmct_erp_questions_v3",
  timetable: "jmct_erp_timetable_v1",
  homework: "jmct_erp_homework_v1",
  inventory: "jmct_erp_inventory_v1",
  hr: "jmct_erp_hr_staff_v1",
  notifications: "jmct_erp_notifications_v1",
  payments: "jmct_erp_fee_payments_v1",
  auth: "jmct_erp_auth_session_v1",
};

const ACADEMIC_YEARS = ["2026-27", "2025-26", "2024-25"];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ANNOUNCEMENTS = [
  "Admissions Open 2026–27: CBSE School, PCI Pharmacy (B.Pharm / D.Pharm) & MSBTE Polytechnic Diploma",
  "Exam Circular: Question Bank access permitted only to Coordinators; teachers upload by Wing, Class & Year",
  "Fee Desk Notice: Online UPI / Card / NetBanking fee receipts & CSV registers active on Campus ERP",
];

const QUICK_CIRCLES: {
  label: string;
  sub: string;
  mode?: PortalMode;
  tab?: RoleTab;
  wing?: Wing;
}[] = [
  { label: "Student Login", sub: "Student", mode: "student" },
  { label: "Fee System", sub: "Fees", mode: "fees" },
  { label: "SIS Directory", sub: "SIS", mode: "sis" },
  { label: "Attendance", sub: "Roll Call", mode: "erp", tab: "teacher" },
  { label: "Peon Duty", sub: "Roster", mode: "erp", tab: "peon" },
  { label: "Gate Pass", sub: "Security", mode: "erp", tab: "guard" },
  { label: "Question Bank", sub: "Q-Bank", mode: "erp", tab: "qbank" },
];

const NEWS_AND_EVENTS = [
  {
    date: "NOV 2026",
    title: "Multi-Wing Academic & Lab Review Across Nashik Campus",
    summary:
      "Coordination meeting covering CBSE classroom discipline, PCI pharmaceutics labs, and MSBTE diploma practicals.",
    tag: "Campus Event",
  },
  {
    date: "TERM I",
    title: "Question Bank & Sessional Assessment Schedule Released",
    summary:
      "Faculty upload wing, class, and year-wise questions; permitted Coordinators edit, finalize, and print papers.",
    tag: "Academics",
  },
];

const NOTIFICATIONS_LIST = [
  { code: "N-01", text: "75% minimum attendance monitoring active for Pharmacy & Polytechnic", date: "Nov 2026" },
  { code: "N-02", text: "Instant fee receipt generation enabled for partial & full payments", date: "Nov 2026" },
  { code: "N-03", text: "Morning & day shift peon duty sign-off mandatory for all blocks", date: "Daily" },
];

const ANNOUNCEMENTS_LIST = [
  { code: "A-01", text: "Dedicated Student Portal, Fee System & SIS Directory live", date: "Active" },
  { code: "A-02", text: "Question Bank restricted to permitted Coordinators; teachers upload by Wing, Class & Year", date: "Active" },
  { code: "A-03", text: "Wing-wise CSV export available in SIS & Fee Desks", date: "Updated" },
];

const MISSION_PILLARS = [
  {
    num: "1",
    title: "Our Mission",
    body: "To deliver disciplined, accessible, and practical education across School (CBSE), Pharmacy (PCI), and Polytechnic (MSBTE) wings with transparent campus administration.",
  },
  {
    num: "2",
    title: "Our Vision",
    body: "To build a modern, reliable institutional ecosystem in Nashik where students, parents, faculty, and support staff work seamlessly on one connected platform.",
  },
  {
    num: "3",
    title: "Our Philosophy",
    body: "Grounded in academic clarity, ethical conduct, laboratory rigor, and everyday operational accountability from classrooms and labs to the main gate.",
  },
];

const WING_INSTITUTIONS: {
  wing: Wing;
  board: string;
  name: string;
  head: string;
  desc: string;
  accent: string;
}[] = [
  {
    wing: "School",
    board: "CBSE WING",
    name: "JMCT International School",
    head: "Principal: Dr. Meenakshi Deshpande",
    desc: "Foundational schooling, smart classrooms, daily roll-call tracking, and structured academic mentorship.",
    accent: "from-sky-900/80 to-slate-900",
  },
  {
    wing: "Pharmacy",
    board: "PCI WING",
    name: "JMCT College of Pharmacy",
    head: "Principal: Dr. Sandeep Kulkarni",
    desc: "Pharmaceutics & pharmacology laboratories, practical sessions, sessional exams, and pharmacy training.",
    accent: "from-indigo-900/80 to-slate-900",
  },
  {
    wing: "Polytechnic",
    board: "MSBTE WING",
    name: "JMCT Polytechnic College",
    head: "Principal: Prof. Vilasrao Patil",
    desc: "Technical diploma courses, computer & mechanical labs, attendance discipline, and exam preparation.",
    accent: "from-amber-900/70 to-slate-900",
  },
];

const BEST_TEACHERS = [
  {
    wing: "School" as Wing,
    badge: "Best Teacher • School Wing",
    name: "Mrs. Archana Joshi",
    role: "Senior TGT Mathematics & Concept Mentor",
    highlight: "Structured board preparation, weekly practice tests, and student clarity.",
  },
  {
    wing: "Pharmacy" as Wing,
    badge: "Best Faculty • Pharmacy Wing",
    name: "Dr. Priya Gokhale",
    role: "Associate Professor • Pharmaceutics & Lab In-Charge",
    highlight: "Lab precision, practical viva guidance, and academic consistency.",
  },
  {
    wing: "Polytechnic" as Wing,
    badge: "Best Faculty • Polytechnic Wing",
    name: "Prof. Rajesh Deshmukh",
    role: "Lecturer • Computer & Software Systems (MSBTE)",
    highlight: "Practical lab execution, student project mentoring, and roll-call accuracy.",
  },
];

const PLATFORM_MODULES: {
  title: string;
  desc: string;
  category: Exclude<ModuleCategory, "All">;
  mode: PortalMode;
  tab?: RoleTab;
  wing?: Wing;
  metricKey:
    | "students"
    | "attendance"
    | "peon"
    | "qbank"
    | "gate"
    | "fees"
    | "parent"
    | "wingSchool"
    | "wingPharmacy"
    | "wingPolytechnic"
    | "timetable"
    | "homework"
    | "inventory"
    | "hr"
    | "notifications";
}[] = [
  { title: "Student Login & Portal", desc: "Dedicated student login, attendance & schedule", category: "Fees & Parent", mode: "student", metricKey: "students" },
  { title: "Fee System & Receipts", desc: "Online payment, dues & PDF receipts", category: "Fees & Parent", mode: "fees", metricKey: "fees" },
  { title: "SIS Directory", desc: "Dedicated student profiles, wings & CSV", category: "Academic & Exams", mode: "sis", metricKey: "students" },
  { title: "Admissions Counter", desc: "New student enrollment & roll IDs", category: "Fees & Parent", mode: "erp", tab: "admin", metricKey: "students" },
  { title: "Attendance", desc: "Class-wise & wing roll call", category: "Academic & Exams", mode: "erp", tab: "teacher", metricKey: "attendance" },
  { title: "Peon Duty", desc: "Shift roster, labs & cleaning", category: "Operations", mode: "erp", tab: "peon", metricKey: "peon" },
  { title: "Question Bank", desc: "Coordinators only • Edit & Print", category: "Academic & Exams", mode: "erp", tab: "qbank", metricKey: "qbank" },
  { title: "Gate Pass", desc: "Visitor, parent & vendor log", category: "Operations", mode: "erp", tab: "guard", metricKey: "gate" },
  { title: "Parent Desk", desc: "Attendance & fee balance lookup", category: "Fees & Parent", mode: "erp", tab: "parent", metricKey: "parent" },
  { title: "School Wing", desc: "CBSE classes & faculty desk", category: "Academic & Exams", mode: "erp", tab: "teacher", wing: "School", metricKey: "wingSchool" },
  { title: "Pharmacy Wing", desc: "PCI B.Pharm & D.Pharm desk", category: "Academic & Exams", mode: "erp", tab: "teacher", wing: "Pharmacy", metricKey: "wingPharmacy" },
  { title: "Polytechnic Wing", desc: "MSBTE diploma labs & desk", category: "Academic & Exams", mode: "erp", tab: "teacher", wing: "Polytechnic", metricKey: "wingPolytechnic" },
  { title: "Timetable", desc: "Period & lab schedule roster", category: "Academic & Exams", mode: "erp", tab: "timetable", metricKey: "timetable" },
  { title: "Homework", desc: "Daily assignments & tracking", category: "Academic & Exams", mode: "erp", tab: "homework", metricKey: "homework" },
  { title: "Inventory", desc: "Lab glassware, stock & assets", category: "Operations", mode: "erp", tab: "inventory", metricKey: "inventory" },
  { title: "HR & Staff Log", desc: "Support & gate shift records", category: "Operations", mode: "erp", tab: "hr", metricKey: "hr" },
  { title: "Notifications", desc: "Fee due & attendance alerts", category: "Fees & Parent", mode: "erp", tab: "notifications", metricKey: "notifications" },
];

const INITIAL_STUDENTS: Student[] = [
  { id: "JMCT-SC-101", name: "Aarav Deshmukh", wing: "School", course: "Grade 10 - A (CBSE)", phone: "9823011223", presentDays: 94, totalDays: 100, totalFee: 45000, paidFee: 45000, todayStatus: "Present" },
  { id: "JMCT-SC-105", name: "Ananya Joshi", wing: "School", course: "Grade 10 - A (CBSE)", phone: "9823019988", presentDays: 88, totalDays: 100, totalFee: 45000, paidFee: 30000, todayStatus: "Unmarked" },
  { id: "JMCT-PH-204", name: "Sneha Kulkarni", wing: "Pharmacy", course: "B.Pharm Sem-IV (PCI)", phone: "9850144556", presentDays: 68, totalDays: 100, totalFee: 85000, paidFee: 60000, todayStatus: "Absent" },
  { id: "JMCT-PH-211", name: "Zoya Shaikh", wing: "Pharmacy", course: "D.Pharm FY (PCI)", phone: "9922334455", presentDays: 91, totalDays: 100, totalFee: 70000, paidFee: 70000, todayStatus: "Present" },
  { id: "JMCT-PO-309", name: "Rohan Patil", wing: "Polytechnic", course: "Diploma Computer SY (MSBTE)", phone: "9765432109", presentDays: 82, totalDays: 100, totalFee: 55000, paidFee: 40000, todayStatus: "Present" },
  { id: "JMCT-PO-315", name: "Omkar Jadhav", wing: "Polytechnic", course: "Diploma Mechanical TY (MSBTE)", phone: "9011223344", presentDays: 71, totalDays: 100, totalFee: 55000, paidFee: 30000, todayStatus: "Unmarked" },
];

const INITIAL_PEON_TASKS: PeonTask[] = [
  { id: "PT-101", staffName: "Ramesh Shinde", wing: "School", zone: "Academic Block A • Floors 1–2", locationTask: "Classroom Sanitization, Drinking Water Tank Check & Period Bell", shift: "Shift A • 07:30 AM – 03:30 PM", done: true },
  { id: "PT-102", staffName: "Sunita Pawar", wing: "Pharmacy", zone: "Pharmacy Wing • Lab 02", locationTask: "Pharmaceutics Lab Glassware Setup, Sink & Waste Bin Clearance", shift: "Shift A • 08:00 AM – 04:00 PM", done: false },
  { id: "PT-103", staffName: "Vikas More", wing: "Polytechnic", zone: "Polytechnic Wing • Admin & Labs", locationTask: "MSBTE Roll Registers, Notice Board Circulars & Lab Key Dispatch", shift: "Shift A • 08:15 AM – 04:15 PM", done: false },
];

const INITIAL_GATE_PASSES: GatePass[] = [
  { id: "GP-901", visitorName: "Mrs. Kavita Deshmukh", roleType: "Parent", wing: "School", purpose: "Fee Receipt & Grade 10 Progress Check", time: "09:15 AM", status: "Inside" },
  { id: "GP-902", visitorName: "Rohan Patil", roleType: "Student", wing: "Polytechnic", purpose: "Project Lab Equipment Return Pass", time: "11:40 AM", status: "Exited" },
  { id: "GP-903", visitorName: "MedSupply Nashik Traders", roleType: "Vendor", wing: "Pharmacy", purpose: "Lab Reagents & Distilled Water Delivery", time: "12:10 PM", status: "Inside" },
];

const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: "Q-101",
    wing: "School",
    className: "Grade 10 - A (CBSE)",
    academicYear: "2026-27",
    uploadedBy: "Mrs. Archana Joshi",
    subject: "Mathematics",
    unit: "Quadratic Equations",
    marks: 4,
    questionText: "Determine the nature of roots of 2x² - 4x + 3 = 0 and find the roots if they exist.",
    includedInPaper: true,
  },
  {
    id: "Q-201",
    wing: "Pharmacy",
    className: "B.Pharm Sem-IV (PCI)",
    academicYear: "2026-27",
    uploadedBy: "Dr. Priya Gokhale",
    subject: "Pharmacology",
    unit: "Autonomic Nervous System",
    marks: 5,
    questionText: "Classify cholinergic drugs and explain the mechanism of action and clinical uses of neostigmine.",
    includedInPaper: true,
  },
  {
    id: "Q-301",
    wing: "Polytechnic",
    className: "Diploma Computer SY (MSBTE)",
    academicYear: "2025-26",
    uploadedBy: "Prof. Rajesh Deshmukh",
    subject: "Database Management",
    unit: "Normalization & SQL",
    marks: 6,
    questionText: "Explain 1NF, 2NF, and 3NF with a clear relational schema and write a SQL query using JOIN and GROUP BY.",
    includedInPaper: true,
  },
];

const INITIAL_TIMETABLE: TimetableSlot[] = [
  {
    id: "TT-01",
    wing: "School",
    className: "Grade 10 - A (CBSE)",
    day: "Monday",
    timing: "08:30 AM – 09:20 AM",
    subject: "Mathematics",
    faculty: "Mrs. Archana Joshi",
    roomOrLab: "Room 102",
  },
  {
    id: "TT-02",
    wing: "Pharmacy",
    className: "B.Pharm Sem-IV (PCI)",
    day: "Monday",
    timing: "10:00 AM – 12:00 PM",
    subject: "Pharmaceutics Practical",
    faculty: "Dr. Priya Gokhale",
    roomOrLab: "Pharmacy Lab 02",
  },
  {
    id: "TT-03",
    wing: "Polytechnic",
    className: "Diploma Computer SY (MSBTE)",
    day: "Tuesday",
    timing: "11:00 AM – 01:00 PM",
    subject: "Database Management Lab",
    faculty: "Prof. Rajesh Deshmukh",
    roomOrLab: "Computer Lab 01",
  },
];

const INITIAL_HOMEWORK: HomeworkItem[] = [
  {
    id: "HW-101",
    wing: "School",
    className: "Grade 10 - A (CBSE)",
    subject: "Mathematics",
    title: "Solve NCERT Exercise 4.3 (Quadratic Equations Q1–Q8)",
    dueDate: "2026-11-24",
    assignedBy: "Mrs. Archana Joshi",
    completed: false,
  },
  {
    id: "HW-201",
    wing: "Pharmacy",
    className: "B.Pharm Sem-IV (PCI)",
    subject: "Pharmacology",
    title: "Prepare chart on Cholinergic & Anticholinergic Drug Classification",
    dueDate: "2026-11-25",
    assignedBy: "Dr. Priya Gokhale",
    completed: true,
  },
  {
    id: "HW-301",
    wing: "Polytechnic",
    className: "Diploma Computer SY (MSBTE)",
    subject: "Database Management",
    title: "Write SQL queries for ER-to-3NF normalization case study",
    dueDate: "2026-11-26",
    assignedBy: "Prof. Rajesh Deshmukh",
    completed: false,
  },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: "INV-01",
    wing: "Pharmacy",
    itemName: "Borosilicate Beakers (250 ml)",
    category: "Lab Glassware",
    quantity: 48,
    unit: "Units",
    status: "Available",
  },
  {
    id: "INV-02",
    wing: "Pharmacy",
    itemName: "Distilled Water Carboys (20L)",
    category: "Lab Consumables",
    quantity: 4,
    unit: "Cans",
    status: "Low Stock",
  },
  {
    id: "INV-03",
    wing: "Polytechnic",
    itemName: "Desktop Workstations (Lab 01)",
    category: "IT & Lab Assets",
    quantity: 30,
    unit: "Systems",
    status: "Available",
  },
  {
    id: "INV-04",
    wing: "School",
    itemName: "Whiteboard Markers & Dusters Pack",
    category: "Classroom Supplies",
    quantity: 0,
    unit: "Boxes",
    status: "Out of Stock",
  },
];

const INITIAL_HR_STAFF: StaffRecord[] = [
  {
    id: "HR-101",
    name: "Mrs. Archana Joshi",
    roleTitle: "Senior TGT Mathematics",
    wing: "School",
    shift: "08:00 AM – 03:30 PM",
    phone: "9823051101",
    status: "On Duty",
  },
  {
    id: "HR-102",
    name: "Dr. Priya Gokhale",
    roleTitle: "Associate Professor • Pharmaceutics",
    wing: "Pharmacy",
    shift: "08:30 AM – 04:00 PM",
    phone: "9850151102",
    status: "On Duty",
  },
  {
    id: "HR-103",
    name: "Ramesh Shinde",
    roleTitle: "Peon & Block Support",
    wing: "School",
    shift: "07:30 AM – 03:30 PM",
    phone: "9765451103",
    status: "On Duty",
  },
  {
    id: "HR-104",
    name: "Subhash Mane",
    roleTitle: "Main Gate Security Guard",
    wing: "Polytechnic",
    shift: "08:00 AM – 08:00 PM",
    phone: "9011251104",
    status: "On Duty",
  },
];

const INITIAL_NOTIFICATIONS: CampusNotification[] = [
  {
    id: "NOT-01",
    wing: "Pharmacy",
    audience: "Students",
    category: "Attendance",
    title: "75% Attendance Alert — B.Pharm Sem-IV",
    message: "Students below 75% attendance must submit medical/parent explanation at the academic desk.",
    dateLabel: "Nov 2026",
  },
  {
    id: "NOT-02",
    wing: "All",
    audience: "Parents",
    category: "Fee Alert",
    title: "Term Fee Payment & Instant Receipt Reminder",
    message: "Pending fee installments can be paid online via UPI/Card/NetBanking with instant printable receipts.",
    dateLabel: "Nov 2026",
  },
  {
    id: "NOT-03",
    wing: "All",
    audience: "Faculty & Staff",
    category: "Exam & Q-Bank",
    title: "Question Upload & Coordinator Review Notice",
    message: "Teachers upload questions by Wing, Class & Year; permitted Coordinators edit and finalize papers.",
    dateLabel: "Active",
  },
];

const INITIAL_PAYMENTS: FeePaymentRecord[] = [
  {
    txnId: "TXN-JMCT-741025",
    studentId: "JMCT-PH-204",
    studentName: "Sneha Kulkarni",
    amount: 60000,
    method: "NetBanking",
    paidAt: "15 Oct 2026, 11:20 AM",
  },
  {
    txnId: "TXN-JMCT-752910",
    studentId: "JMCT-SC-105",
    studentName: "Ananya Joshi",
    amount: 30000,
    method: "UPI",
    upiId: "joshi.parent@okaxis",
    paidAt: "20 Oct 2026, 04:05 PM",
  },
];

const WING_COURSES: Record<Wing, string[]> = {
  School: ["Grade 10 - A (CBSE)", "Grade 9 - B (CBSE)", "Grade 8 - A (CBSE)"],
  Pharmacy: ["B.Pharm Sem-IV (PCI)", "B.Pharm FY (PCI)", "D.Pharm FY (PCI)"],
  Polytechnic: ["Diploma Computer SY (MSBTE)", "Diploma Mechanical TY (MSBTE)", "Diploma Civil FY (MSBTE)"],
};

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

let cachedSupabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!cachedSupabase) {
    cachedSupabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return cachedSupabase;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function readAuthStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.auth);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

function mapRowToStudent(row: Record<string, unknown>): Student {
  const rawWing = String(row.wing || "School");
  const wing: Wing =
    rawWing === "Pharmacy" || rawWing === "Polytechnic" ? rawWing : "School";
  const rawStatus = String(row.today_status || "Unmarked");
  const todayStatus: "Present" | "Absent" | "Unmarked" =
    rawStatus === "Present" || rawStatus === "Absent" ? rawStatus : "Unmarked";

  return {
    id: String(row.id),
    name: String(row.name),
    wing,
    course: String(row.course),
    phone: String(row.phone),
    presentDays: Number(row.present_days ?? 1),
    totalDays: Number(row.total_days ?? 1),
    totalFee: Number(row.total_fee ?? 50000),
    paidFee: Number(row.paid_fee ?? 0),
    todayStatus,
  };
}

function mapStudentToRow(s: Student) {
  return {
    id: s.id,
    name: s.name,
    wing: s.wing,
    course: s.course,
    phone: s.phone,
    present_days: s.presentDays,
    total_days: s.totalDays,
    total_fee: s.totalFee,
    paid_fee: s.paidFee,
    today_status: s.todayStatus,
  };
}

export default function JMCTCampusERP() {
  const supabase = getSupabase();
  // Default view is "portal" (Home Website first) so opening the site starts at the main portal
  const [view, setView] = useState<PortalMode>("portal");
  const [roleTab, setRoleTab] = useState<RoleTab>("admin");
  const [tourTab, setTourTab] = useState<TourTab>("Dashboard");
  const [moduleCategory, setModuleCategory] = useState<ModuleCategory>("All");
  const [feeFilter, setFeeFilter] = useState<FeeFilter>("All");
  const [wingFilter, setWingFilter] = useState<"All" | Wing>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [dbStatus, setDbStatus] = useState<"connecting" | "live" | "local">("connecting");
  const [dbError, setDbError] = useState<string>("");
  const [tickerIdx, setTickerIdx] = useState(0);

  // Role-based session state
  const [authUser, setAuthUser] = useState<AuthSession | null>(() => readAuthStorage());
  const [isSyncingStudentDb, setIsSyncingStudentDb] = useState(false);

  // Coordinator permission for Question Bank
  const [hasCoordinatorPermission, setHasCoordinatorPermission] = useState(false);
  const [coordPasscodeInput, setCoordPasscodeInput] = useState(COORDINATOR_PASSCODE);
  const [coordAuthError, setCoordAuthError] = useState("");

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<AccountRole>("student");
  const [loginIdentifier, setLoginIdentifier] = useState("JMCT-SC-101");
  const [loginPassword, setLoginPassword] = useState("Jmct@2026");
  const [loginCoordCode, setLoginCoordCode] = useState(COORDINATOR_PASSCODE);
  const [loginError, setLoginError] = useState("");

  // Student portal state (separate login gate when not logged in as student)
  const [studentPortalId, setStudentPortalId] = useState("JMCT-SC-101");
  const [studentLoginRollInput, setStudentLoginRollInput] = useState("JMCT-SC-101");
  const [studentLoginPassInput, setStudentLoginPassInput] = useState("Jmct@2026");
  const [studentLoginError, setStudentLoginError] = useState("");
  const [studentUnlocked, setStudentUnlocked] = useState(false);

  // Teacher class-wise + question upload state
  const [teacherName, setTeacherName] = useState("Prof. Rajesh Deshmukh");
  const [teacherWing, setTeacherWing] = useState<Wing>("School");
  const [teacherClass, setTeacherClass] = useState("Grade 10 - A (CBSE)");
  const [teacherAcademicYear, setTeacherAcademicYear] = useState("2026-27");
  const [onlySelectedClass, setOnlySelectedClass] = useState(true);

  // Teacher question upload form state
  const [uploadWing, setUploadWing] = useState<Wing>("School");
  const [uploadClass, setUploadClass] = useState("Grade 10 - A (CBSE)");
  const [uploadYear, setUploadYear] = useState("2026-27");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadUnit, setUploadUnit] = useState("");
  const [uploadMarks, setUploadMarks] = useState("5");
  const [uploadQuestionText, setUploadQuestionText] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");

  // Peon / support staff system state
  const [peonTasks, setPeonTasks] = useState<PeonTask[]>(() =>
    readStorage<PeonTask[]>(STORAGE_KEYS.peon, INITIAL_PEON_TASKS)
  );
  const [peonStaff, setPeonStaff] = useState("Ramesh Shinde");
  const [peonWing, setPeonWing] = useState<Wing>("School");
  const [peonZone, setPeonZone] = useState("Academic Block • Ground & Floor 1");
  const [peonTaskText, setPeonTaskText] = useState("");
  const [peonShift, setPeonShift] = useState("Shift A • 07:30 AM – 03:30 PM");

  // Security guard gate pass state
  const [gatePasses, setGatePasses] = useState<GatePass[]>(() =>
    readStorage<GatePass[]>(STORAGE_KEYS.gate, INITIAL_GATE_PASSES)
  );
  const [guardName, setGuardName] = useState("Subhash Mane (Main Gate)");
  const [visitorName, setVisitorName] = useState("");
  const [visitorRole, setVisitorRole] = useState<GatePass["roleType"]>("Parent");
  const [visitorWing, setVisitorWing] = useState<Wing>("School");
  const [visitorPurpose, setVisitorPurpose] = useState("");

  // Question Bank state
  const [questions, setQuestions] = useState<QuestionItem[]>(() =>
    readStorage<QuestionItem[]>(STORAGE_KEYS.qbank, INITIAL_QUESTIONS)
  );
  const [qClassFilter, setQClassFilter] = useState<string>("All");
  const [qYearFilter, setQYearFilter] = useState<string>("All");
  const [showPaperPreview, setShowPaperPreview] = useState(false);

  // Coordinator question editing state
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [paperTitle, setPaperTitle] = useState("Term-I / Unit Assessment Examination");
  const [paperDuration, setPaperDuration] = useState("2 Hours");
  const [paperInstructions, setPaperInstructions] = useState(
    "All questions are compulsory. Figures to the right indicate full marks."
  );

  // Timetable state
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(() =>
    readStorage<TimetableSlot[]>(STORAGE_KEYS.timetable, INITIAL_TIMETABLE)
  );
  const [ttWing, setTtWing] = useState<Wing>("School");
  const [ttClass, setTtClass] = useState("Grade 10 - A (CBSE)");
  const [ttDay, setTtDay] = useState("Monday");
  const [ttTiming, setTtTiming] = useState("09:20 AM – 10:10 AM");
  const [ttSubject, setTtSubject] = useState("");
  const [ttFaculty, setTtFaculty] = useState("");
  const [ttRoom, setTtRoom] = useState("Room 104");

  // Homework state
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(() =>
    readStorage<HomeworkItem[]>(STORAGE_KEYS.homework, INITIAL_HOMEWORK)
  );
  const [hwWing, setHwWing] = useState<Wing>("School");
  const [hwClass, setHwClass] = useState("Grade 10 - A (CBSE)");
  const [hwSubject, setHwSubject] = useState("");
  const [hwTitle, setHwTitle] = useState("");
  const [hwDueDate, setHwDueDate] = useState("2026-11-27");
  const [hwAssignedBy, setHwAssignedBy] = useState("Mrs. Archana Joshi");

  // Inventory state
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(() =>
    readStorage<InventoryItem[]>(STORAGE_KEYS.inventory, INITIAL_INVENTORY)
  );
  const [invWing, setInvWing] = useState<Wing>("Pharmacy");
  const [invName, setInvName] = useState("");
  const [invCategory, setInvCategory] = useState("Lab Glassware");
  const [invQty, setInvQty] = useState("10");
  const [invUnit, setInvUnit] = useState("Units");
  const [invStatus, setInvStatus] = useState<InventoryItem["status"]>("Available");

  // HR & Staff Log state
  const [hrStaffList, setHrStaffList] = useState<StaffRecord[]>(() =>
    readStorage<StaffRecord[]>(STORAGE_KEYS.hr, INITIAL_HR_STAFF)
  );
  const [hrName, setHrName] = useState("");
  const [hrRoleTitle, setHrRoleTitle] = useState("");
  const [hrWing, setHrWing] = useState<Wing>("School");
  const [hrShift, setHrShift] = useState("08:00 AM – 04:00 PM");
  const [hrPhone, setHrPhone] = useState("");

  // Notifications state
  const [notificationsData, setNotificationsData] = useState<CampusNotification[]>(() =>
    readStorage<CampusNotification[]>(STORAGE_KEYS.notifications, INITIAL_NOTIFICATIONS)
  );
  const [notWing, setNotWing] = useState<Wing | "All">("All");
  const [notAudience, setNotAudience] = useState<CampusNotification["audience"]>("All");
  const [notCategory, setNotCategory] = useState<CampusNotification["category"]>("Fee Alert");
  const [notTitle, setNotTitle] = useState("");
  const [notMessage, setNotMessage] = useState("");

  // Online fee payment modal & history state
  const [payingStudent, setPayingStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState<string>("15000");
  const [payMethod, setPayMethod] = useState<"UPI" | "Card" | "NetBanking">("UPI");
  const [upiId, setUpiId] = useState("parent.jmct@okicici");
  const [lastPaymentMeta, setLastPaymentMeta] = useState<FeePaymentRecord | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FeePaymentRecord[]>(() =>
    readStorage<FeePaymentRecord[]>(STORAGE_KEYS.payments, INITIAL_PAYMENTS)
  );
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // New student form state
  const [newName, setNewName] = useState("");
  const [newWing, setNewWing] = useState<Wing>("School");
  const [newCourse, setNewCourse] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("55000");

  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [parentLookupId, setParentLookupId] = useState("JMCT-PH-204");

  useEffect(() => {
    try {
      if (authUser) {
        window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(authUser));
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.auth);
      }
    } catch {}
  }, [authUser]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.peon, JSON.stringify(peonTasks));
    } catch {}
  }, [peonTasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.gate, JSON.stringify(gatePasses));
    } catch {}
  }, [gatePasses]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.qbank, JSON.stringify(questions));
    } catch {}
  }, [questions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.timetable, JSON.stringify(timetableSlots));
    } catch {}
  }, [timetableSlots]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.homework, JSON.stringify(homeworkList));
    } catch {}
  }, [homeworkList]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventoryList));
    } catch {}
  }, [inventoryList]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.hr, JSON.stringify(hrStaffList));
    } catch {}
  }, [hrStaffList]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notificationsData));
    } catch {}
  }, [notificationsData]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(paymentHistory));
    } catch {}
  }, [paymentHistory]);

  useEffect(() => {
    let active = true;
    async function loadStudents() {
      if (!supabase) {
        if (active) {
          setDbStatus("local");
        }
        return;
      }
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setDbStatus("local");
        setDbError(`Supabase Read Error: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        const { error: seedErr } = await supabase
          .from("students")
          .upsert(INITIAL_STUDENTS.map(mapStudentToRow));
        if (seedErr) {
          setDbError(`Supabase Seed Error: ${seedErr.message}`);
        }
        setStudents(INITIAL_STUDENTS);
        setDbStatus("live");
      } else {
        setStudents(data.map(mapRowToStudent));
        setDbStatus("live");
      }
    }
    loadStudents();
    return () => {
      active = false;
    };
  }, [supabase]);

  const syncLiveStudentPortal = async () => {
    if (!supabase) return;
    setIsSyncingStudentDb(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      setStudents(data.map(mapRowToStudent));
      setDbStatus("live");
      setDbError("");
    }
    setIsSyncingStudentDb(false);
  };

  const handleLogout = () => {
    setAuthUser(null);
    setHasCoordinatorPermission(false);
    setStudentUnlocked(false);
    setView("portal");
    setRoleTab("admin");
  };

  const openMode = (mode: PortalMode, tab?: RoleTab, wing?: Wing) => {
    if (wing) {
      setWingFilter(wing);
      if (tab === "teacher") {
        setTeacherWing(wing);
        setTeacherClass(WING_COURSES[wing][0]);
        setUploadWing(wing);
        setUploadClass(WING_COURSES[wing][0]);
      }
      if (tab === "peon") setPeonWing(wing);
      if (tab === "timetable") {
        setTtWing(wing);
        setTtClass(WING_COURSES[wing][0]);
      }
      if (tab === "homework") {
        setHwWing(wing);
        setHwClass(WING_COURSES[wing][0]);
      }
      if (tab === "inventory") setInvWing(wing);
      if (tab === "hr") setHrWing(wing);
    }
    if (tab) {
      setRoleTab(tab);
    }
    setView(mode);
  };

  const handleStudentLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoginError("");
    const cleanId = studentLoginRollInput.trim();
    const matched = students.find(
      (s) => s.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (!matched) {
      setStudentLoginError("Roll ID nahi mila. Try JMCT-SC-101, JMCT-PH-204, ya JMCT-PO-309.");
      return;
    }
    if (studentLoginPassInput.trim().length < 4) {
      setStudentLoginError("Valid password daalein (default: Jmct@2026).");
      return;
    }
    setStudentPortalId(matched.id);
    setStudentUnlocked(true);
    setAuthUser({
      role: "student",
      identifier: matched.id,
      label: `Student • ${matched.id}`,
    });
  };

  const handleLoginRoleChange = (nextRole: AccountRole) => {
    setLoginRole(nextRole);
    setLoginError("");
    const presets: Record<AccountRole, string> = {
      admin: "admin@jmctnashik.edu.in",
      teacher: "faculty@jmctnashik.edu.in",
      coordinator: "coordinator@jmctnashik.edu.in",
      peon: "support@jmctnashik.edu.in",
      guard: "gate@jmctnashik.edu.in",
      parent: "JMCT-PH-204",
      student: "JMCT-SC-101",
    };
    setLoginIdentifier(presets[nextRole]);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginRole === "coordinator") {
      if (loginCoordCode.trim() !== COORDINATOR_PASSCODE) {
        setLoginError(`Invalid Coordinator Code. Use ${COORDINATOR_PASSCODE} for Question Bank permission.`);
        return;
      }
      setHasCoordinatorPermission(true);
      setCoordAuthError("");
      setAuthUser({
        role: "coordinator",
        identifier: loginIdentifier.trim() || "coordinator@jmctnashik.edu.in",
        label: "Coordinator • Q-Bank",
      });
      setShowLoginModal(false);
      openMode("erp", "qbank");
      return;
    }

    if (loginRole === "student") {
      const matched = students.find(
        (s) => s.id.toLowerCase() === loginIdentifier.trim().toLowerCase()
      );
      if (!matched) {
        setLoginError("Student Roll ID not found. Try JMCT-SC-101 or JMCT-PH-204.");
        return;
      }
      setStudentPortalId(matched.id);
      setStudentLoginRollInput(matched.id);
      setStudentUnlocked(true);
      setAuthUser({
        role: "student",
        identifier: matched.id,
        label: `Student • ${matched.id}`,
      });
      setShowLoginModal(false);
      openMode("student");
      return;
    }

    if (loginRole === "parent") {
      const matched = students.find(
        (s) => s.id.toLowerCase() === loginIdentifier.trim().toLowerCase()
      );
      if (!matched) {
        setLoginError("Ward Roll ID not found. Try JMCT-PH-204 or JMCT-SC-105.");
        return;
      }
      setParentLookupId(matched.id);
      setAuthUser({
        role: "parent",
        identifier: matched.id,
        label: `Parent • ${matched.name}`,
      });
      setShowLoginModal(false);
      openMode("erp", "parent");
      return;
    }

    if (loginPassword.trim().length < 4) {
      setLoginError("Please enter a valid password (default: Jmct@2026).");
      return;
    }

    const roleLabels: Record<AccountRole, string> = {
      admin: "Admin Desk",
      teacher: "Teacher Desk",
      coordinator: "Coordinator • Q-Bank",
      peon: "Peon Duty",
      guard: "Security Desk",
      parent: "Parent Desk",
      student: "Student Portal",
    };

    setAuthUser({
      role: loginRole,
      identifier: loginIdentifier.trim(),
      label: roleLabels[loginRole],
    });
    setShowLoginModal(false);
    openMode("erp", loginRole);
  };

  const handleVerifyCoordinatorPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (coordPasscodeInput.trim() === COORDINATOR_PASSCODE) {
      setHasCoordinatorPermission(true);
      setCoordAuthError("");
    } else {
      setCoordAuthError(
        `Permission denied. Only permitted Coordinators with code (${COORDINATOR_PASSCODE}) can access Question Bank.`
      );
    }
  };

  const handleWingSwitchForTeacher = (w: Wing) => {
    setTeacherWing(w);
    setWingFilter(w);
    setTeacherClass(WING_COURSES[w][0]);
  };

  const handleUploadWingChange = (w: Wing) => {
    setUploadWing(w);
    setUploadClass(WING_COURSES[w][0]);
  };

  const filteredStudents = students.filter((s) => {
    const wingOk = wingFilter === "All" ? true : s.wing === wingFilter;
    const due = Math.max(0, s.totalFee - s.paidFee);
    const feeOk =
      feeFilter === "All" ? true : feeFilter === "Due" ? due > 0 : due === 0;
    const q = searchQuery.trim().toLowerCase();
    const searchOk =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.course.toLowerCase().includes(q) ||
      s.phone.includes(q);
    return wingOk && feeOk && searchOk;
  });

  const attendanceStudents = students.filter((s) => {
    if (s.wing !== teacherWing) return false;
    if (onlySelectedClass && teacherClass.trim()) {
      return s.course.toLowerCase().includes(teacherClass.trim().toLowerCase());
    }
    return true;
  });

  const parentStudent = students.find(
    (s) => s.id.toLowerCase() === parentLookupId.trim().toLowerCase()
  );

  const activeStudent =
    students.find((s) => s.id.toLowerCase() === studentPortalId.trim().toLowerCase()) ||
    students[0];

  const isStudentAuthenticated = studentUnlocked || authUser?.role === "student";

  const parentPayments = parentStudent
    ? paymentHistory.filter((p) => p.studentId === parentStudent.id)
    : [];

  const visiblePeonTasks = peonTasks.filter((t) =>
    wingFilter === "All" ? true : t.wing === wingFilter
  );

  const availableQuestionClasses = Array.from(
    new Set([
      ...Object.values(WING_COURSES).flat(),
      ...questions.map((q) => q.className),
    ])
  );

  const visibleQuestions = questions.filter((q) => {
    const wingOk = wingFilter === "All" ? true : q.wing === wingFilter;
    const classOk = qClassFilter === "All" ? true : q.className === qClassFilter;
    const yearOk = qYearFilter === "All" ? true : q.academicYear === qYearFilter;
    const s = searchQuery.trim().toLowerCase();
    const searchOk =
      !s ||
      q.subject.toLowerCase().includes(s) ||
      q.unit.toLowerCase().includes(s) ||
      q.className.toLowerCase().includes(s) ||
      q.academicYear.toLowerCase().includes(s) ||
      q.uploadedBy.toLowerCase().includes(s) ||
      q.questionText.toLowerCase().includes(s);
    return wingOk && classOk && yearOk && searchOk;
  });

  const selectedPaperQuestions = visibleQuestions.filter(
    (q) => q.includedInPaper !== false
  );
  const totalPaperMarks = selectedPaperQuestions.reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  );

  const teacherUploadedQuestions = questions.filter(
    (q) => q.uploadedBy.toLowerCase() === teacherName.trim().toLowerCase()
  );

  const visibleTimetable = timetableSlots.filter((slot) => {
    const wingOk = wingFilter === "All" ? true : slot.wing === wingFilter;
    const s = searchQuery.trim().toLowerCase();
    const searchOk =
      !s ||
      slot.className.toLowerCase().includes(s) ||
      slot.subject.toLowerCase().includes(s) ||
      slot.faculty.toLowerCase().includes(s) ||
      slot.roomOrLab.toLowerCase().includes(s) ||
      slot.day.toLowerCase().includes(s);
    return wingOk && searchOk;
  });

  const visibleHomework = homeworkList.filter((hw) => {
    const wingOk = wingFilter === "All" ? true : hw.wing === wingFilter;
    const s = searchQuery.trim().toLowerCase();
    const searchOk =
      !s ||
      hw.className.toLowerCase().includes(s) ||
      hw.subject.toLowerCase().includes(s) ||
      hw.title.toLowerCase().includes(s) ||
      hw.assignedBy.toLowerCase().includes(s);
    return wingOk && searchOk;
  });

  const visibleInventory = inventoryList.filter((inv) => {
    const wingOk = wingFilter === "All" ? true : inv.wing === wingFilter;
    const s = searchQuery.trim().toLowerCase();
    const searchOk =
      !s ||
      inv.itemName.toLowerCase().includes(s) ||
      inv.category.toLowerCase().includes(s) ||
      inv.status.toLowerCase().includes(s);
    return wingOk && searchOk;
  });

  const visibleHrStaff = hrStaffList.filter((st) => {
    const wingOk = wingFilter === "All" ? true : st.wing === wingFilter;
    const s = searchQuery.trim().toLowerCase();
    const searchOk =
      !s ||
      st.name.toLowerCase().includes(s) ||
      st.roleTitle.toLowerCase().includes(s) ||
      st.shift.toLowerCase().includes(s) ||
      st.status.toLowerCase().includes(s);
    return wingOk && searchOk;
  });

  const visibleNotifications = notificationsData.filter((nt) => {
    const wingOk = wingFilter === "All" || nt.wing === "All" ? true : nt.wing === wingFilter;
    const s = searchQuery.trim().toLowerCase();
    const searchOk =
      !s ||
      nt.title.toLowerCase().includes(s) ||
      nt.message.toLowerCase().includes(s) ||
      nt.category.toLowerCase().includes(s) ||
      nt.audience.toLowerCase().includes(s);
    return wingOk && searchOk;
  });

  const visibleModules = PLATFORM_MODULES.filter((m) =>
    moduleCategory === "All" ? true : m.category === moduleCategory
  );

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError("");
    const prefix = newWing === "School" ? "SC" : newWing === "Pharmacy" ? "PH" : "PO";
    const id = `JMCT-${prefix}-${Math.floor(400 + Math.random() * 500)}`;
    const created: Student = {
      id,
      name: newName,
      wing: newWing,
      course:
        newCourse ||
        (newWing === "School"
          ? "Grade 9 - B (CBSE)"
          : newWing === "Pharmacy"
          ? "B.Pharm FY (PCI)"
          : "Diploma Civil FY (MSBTE)"),
      phone: newPhone,
      presentDays: 1,
      totalDays: 1,
      totalFee: Number(newFee) || 50000,
      paidFee: 15000,
      todayStatus: "Present",
    };

    if (supabase) {
      const { error } = await supabase.from("students").insert(mapStudentToRow(created));
      if (error) {
        setDbError(`Could not save to Supabase (saved locally): ${error.message}`);
      }
    }

    setStudents((prev) => [created, ...prev]);
    setStudentPortalId(created.id);
    setNewName("");
    setNewCourse("");
    setNewPhone("");
  };

  const handleDeleteStudent = async (id: string) => {
    setDbError("");
    if (supabase) {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) {
        setDbError(`Delete error: ${error.message}`);
        return;
      }
    }
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const computeAttendanceUpdate = (s: Student, status: "Present" | "Absent"): Student => {
    const wasPresent = s.todayStatus === "Present";
    const wasUnmarked = s.todayStatus === "Unmarked";
    let presentDays = s.presentDays;
    let totalDays = s.totalDays;

    if (wasUnmarked) {
      totalDays += 1;
      if (status === "Present") presentDays += 1;
    } else if (status === "Present" && !wasPresent) {
      presentDays += 1;
    } else if (status === "Absent" && wasPresent) {
      presentDays = Math.max(0, presentDays - 1);
    }

    return {
      ...s,
      todayStatus: status,
      presentDays,
      totalDays,
    };
  };

  const markAttendance = async (id: string, status: "Present" | "Absent") => {
    setDbError("");
    const current = students.find((s) => s.id === id);
    if (!current) return;

    const updatedStudent = computeAttendanceUpdate(current, status);

    if (supabase) {
      const { error } = await supabase
        .from("students")
        .update({
          today_status: updatedStudent.todayStatus,
          present_days: updatedStudent.presentDays,
          total_days: updatedStudent.totalDays,
        })
        .eq("id", id);
      if (error) {
        setDbError(`Attendance save error: ${error.message}`);
      }
    }

    setStudents((prev) => prev.map((s) => (s.id === id ? updatedStudent : s)));
  };

  const [attendanceNotice, setAttendanceNotice] = useState<string>("");
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState<boolean>(false);
  const [submittedAttendanceKeys, setSubmittedAttendanceKeys] = useState<string[]>([]);

  const currentAttendanceKey = `${teacherWing}__${onlySelectedClass ? teacherClass : "ALL"}`;
  const isAttendanceLocked = submittedAttendanceKeys.includes(currentAttendanceKey);

  const handleUnlockAttendance = () => {
    setSubmittedAttendanceKeys((prev) => prev.filter((k) => k !== currentAttendanceKey));
    setAttendanceNotice("Attendance unlocked for editing.");
  };

  const resetAttendanceToUnmarked = async (id: string) => {
    setDbError("");
    setAttendanceNotice("");
    const current = students.find((s) => s.id === id);
    if (!current || current.todayStatus === "Unmarked") return;

    const updatedStudent: Student = {
      ...current,
      todayStatus: "Unmarked",
      presentDays:
        current.todayStatus === "Present"
          ? Math.max(0, current.presentDays - 1)
          : current.presentDays,
      totalDays: Math.max(0, current.totalDays - 1),
    };

    if (supabase) {
      const { error } = await supabase
        .from("students")
        .update({
          today_status: updatedStudent.todayStatus,
          present_days: updatedStudent.presentDays,
          total_days: updatedStudent.totalDays,
        })
        .eq("id", id);
      if (error) {
        setDbError(`Attendance clear error: ${error.message}`);
      }
    }

    setStudents((prev) => prev.map((s) => (s.id === id ? updatedStudent : s)));
  };

  const handleSubmitAttendance = async () => {
    setDbError("");
    setAttendanceNotice("");
    setIsSubmittingAttendance(true);

    if (supabase && attendanceStudents.length > 0) {
      const { error } = await supabase
        .from("students")
        .upsert(attendanceStudents.map(mapStudentToRow));
      if (error) {
        setDbError(`Attendance submit sync error: ${error.message}`);
      }
    }

    const markedCount = attendanceStudents.filter(
      (s) => s.todayStatus !== "Unmarked"
    ).length;
    setIsSubmittingAttendance(false);
    setSubmittedAttendanceKeys((prev) =>
      prev.includes(currentAttendanceKey) ? prev : [...prev, currentAttendanceKey]
    );
    setAttendanceNotice(
      `Attendance submitted for ${teacherWing} • ${teacherClass} (${markedCount}/${attendanceStudents.length} marked).`
    );
  };

  const markAllClassPresent = async () => {
    setDbError("");
    const targetIds = new Set(attendanceStudents.map((s) => s.id));
    const nextList = students.map((s) =>
      targetIds.has(s.id) ? computeAttendanceUpdate(s, "Present") : s
    );

    if (supabase) {
      const changedRows = nextList.filter((s) => targetIds.has(s.id)).map(mapStudentToRow);
      if (changedRows.length > 0) {
        const { error } = await supabase.from("students").upsert(changedRows);
        if (error) {
          setDbError(`Bulk attendance error: ${error.message}`);
        }
      }
    }

    setStudents(nextList);
  };

  const openOnlinePaymentModal = (s: Student) => {
    const due = Math.max(0, s.totalFee - s.paidFee);
    setPayingStudent(s);
    setPayAmount(String(due));
    setPayMethod("UPI");
  };

  const [payError, setPayError] = useState<string>("");
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);

  const handlePayFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError("");

    if (!payingStudent) return;

    const due = Math.max(0, payingStudent.totalFee - payingStudent.paidFee);
    const amount = Number(payAmount);

    if (!amount || amount <= 0 || amount > due) {
      setPayError("Sahi payment amount daalein jo pending due se zyada na ho.");
      return;
    }

    if (payMethod === "UPI") {
      const cleanUpi = upiId.trim();
      if (!cleanUpi || !cleanUpi.includes("@")) {
        setPayError("Valid UPI ID daalein (jaise name@upi).");
        return;
      }
    }

    if (!paymentConfirmed) {
      setPaymentConfirmed(true);
      return;
    }

    confirmOnlineFeePayment(e);
    setPaymentConfirmed(false);
  };

  const confirmOnlineFeePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingStudent) return;
    setDbError("");
    const due = Math.max(0, payingStudent.totalFee - payingStudent.paidFee);
    const amount = Math.min(due, Math.max(1, Number(payAmount) || 0));
    if (amount <= 0) return;

    setIsProcessingPay(true);
    const generatedTxn = `TXN-JMCT-${Math.floor(100000 + Math.random() * 900000)}`;
    const paidTimestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const paymentRecord: FeePaymentRecord = {
      txnId: generatedTxn,
      studentId: payingStudent.id,
      studentName: payingStudent.name,
      amount,
      method: payMethod,
      upiId: payMethod === "UPI" ? upiId.trim() : undefined,
      paidAt: paidTimestamp,
    };

    const updatedStudent: Student = {
      ...payingStudent,
      paidFee: payingStudent.paidFee + amount,
    };

    if (supabase) {
      const { error } = await supabase
        .from("students")
        .update({ paid_fee: updatedStudent.paidFee })
        .eq("id", payingStudent.id);
      if (error) {
        setDbError(`Online payment save error: ${error.message}`);
      }
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === payingStudent.id ? updatedStudent : s))
    );
    setPaymentHistory((prev) => [paymentRecord, ...prev]);
    setLastPaymentMeta(paymentRecord);
    setIsProcessingPay(false);
    setPayingStudent(null);
    setReceiptStudent(updatedStudent);
  };

  const handleAddPeonTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peonTaskText.trim()) return;
    const item: PeonTask = {
      id: `PT-${Math.floor(100 + Math.random() * 900)}`,
      staffName: peonStaff || "Support Staff",
      wing: peonWing,
      zone: peonZone.trim() || `${peonWing} Block`,
      locationTask: peonTaskText.trim(),
      shift: peonShift,
      done: false,
    };
    setPeonTasks((prev) => [item, ...prev]);
    setPeonTaskText("");
  };

  const handleAddGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const pass: GatePass = {
      id: `GP-${Math.floor(100 + Math.random() * 900)}`,
      visitorName: visitorName.trim(),
      roleType: visitorRole,
      wing: visitorWing,
      purpose: visitorPurpose.trim() || "Campus Visit",
      time: nowTime,
      status: "Inside",
    };
    setGatePasses((prev) => [pass, ...prev]);
    setVisitorName("");
    setVisitorPurpose("");
  };

  const handleTeacherUploadQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadQuestionText.trim()) return;
    const newQ: QuestionItem = {
      id: `Q-${Math.floor(100 + Math.random() * 900)}`,
      wing: uploadWing,
      className: uploadClass.trim() || WING_COURSES[uploadWing][0],
      academicYear: uploadYear,
      uploadedBy: teacherName.trim() || "Faculty Member",
      subject: uploadSubject.trim() || "General Subject",
      unit: uploadUnit.trim() || "Unit 1",
      marks: Math.max(1, Number(uploadMarks) || 2),
      questionText: uploadQuestionText.trim(),
      includedInPaper: true,
    };
    setQuestions((prev) => [newQ, ...prev]);
    setUploadSubject("");
    setUploadUnit("");
    setUploadQuestionText("");
    setUploadNotice(
      `Uploaded (${newQ.wing} • ${newQ.className} • ${newQ.academicYear}) into Question Bank.`
    );
  };

  const handleSaveEditedQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
    );
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingQuestion?.id === id) {
      setEditingQuestion(null);
    }
  };

  const handleToggleIncludeInPaper = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, includedInPaper: q.includedInPaper === false ? true : false }
          : q
      )
    );
  };

  const handleAddTimetableSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttSubject.trim()) return;
    const slot: TimetableSlot = {
      id: `TT-${Math.floor(10 + Math.random() * 89)}`,
      wing: ttWing,
      className: ttClass,
      day: ttDay,
      timing: ttTiming.trim() || "09:00 AM – 09:50 AM",
      subject: ttSubject.trim(),
      faculty: ttFaculty.trim() || "Assigned Faculty",
      roomOrLab: ttRoom.trim() || "Classroom",
    };
    setTimetableSlots((prev) => [slot, ...prev]);
    setTtSubject("");
    setTtFaculty("");
  };

  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;
    const item: HomeworkItem = {
      id: `HW-${Math.floor(100 + Math.random() * 900)}`,
      wing: hwWing,
      className: hwClass,
      subject: hwSubject.trim() || "General Subject",
      title: hwTitle.trim(),
      dueDate: hwDueDate || "2026-11-28",
      assignedBy: hwAssignedBy.trim() || "Faculty",
      completed: false,
    };
    setHomeworkList((prev) => [item, ...prev]);
    setHwSubject("");
    setHwTitle("");
  };

  const handleAddInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) return;
    const item: InventoryItem = {
      id: `INV-${Math.floor(10 + Math.random() * 89)}`,
      wing: invWing,
      itemName: invName.trim(),
      category: invCategory.trim() || "General Stock",
      quantity: Math.max(0, Number(invQty) || 0),
      unit: invUnit.trim() || "Units",
      status: invStatus,
    };
    setInventoryList((prev) => [item, ...prev]);
    setInvName("");
    setInvQty("10");
  };

  const handleAddHrStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrName.trim()) return;
    const rec: StaffRecord = {
      id: `HR-${Math.floor(100 + Math.random() * 900)}`,
      name: hrName.trim(),
      roleTitle: hrRoleTitle.trim() || "Campus Staff",
      wing: hrWing,
      shift: hrShift.trim() || "08:00 AM – 04:00 PM",
      phone: hrPhone.trim() || "9823000000",
      status: "On Duty",
    };
    setHrStaffList((prev) => [rec, ...prev]);
    setHrName("");
    setHrRoleTitle("");
    setHrPhone("");
  };

  const handleAddNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notTitle.trim() || !notMessage.trim()) return;
    const item: CampusNotification = {
      id: `NOT-${Math.floor(10 + Math.random() * 89)}`,
      wing: notWing,
      audience: notAudience,
      category: notCategory,
      title: notTitle.trim(),
      message: notMessage.trim(),
      dateLabel: "Nov 2026",
    };
    setNotificationsData((prev) => [item, ...prev]);
    setNotTitle("");
    setNotMessage("");
  };

  const handleResetDemoData = () => {
    setStudents(INITIAL_STUDENTS);
    setPeonTasks(INITIAL_PEON_TASKS);
    setGatePasses(INITIAL_GATE_PASSES);
    setQuestions(INITIAL_QUESTIONS);
    setTimetableSlots(INITIAL_TIMETABLE);
    setHomeworkList(INITIAL_HOMEWORK);
    setInventoryList(INITIAL_INVENTORY);
    setHrStaffList(INITIAL_HR_STAFF);
    setNotificationsData(INITIAL_NOTIFICATIONS);
    setPaymentHistory(INITIAL_PAYMENTS);
    setLastPaymentMeta(null);
    try {
      Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
    } catch {}
  };

  const exportCsvReport = () => {
    const headers = [
      "Roll ID",
      "Name",
      "Wing",
      "Course",
      "Phone",
      "Present Days",
      "Total Days",
      "Today Status",
      "Total Fee",
      "Paid Fee",
      "Balance Due",
    ];
    const rows = filteredStudents.map((s) => [
      s.id,
      s.name,
      s.wing,
      s.course,
      s.phone,
      s.presentDays,
      s.totalDays,
      s.todayStatus,
      s.totalFee,
      s.paidFee,
      s.totalFee - s.paidFee,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JMCT_${wingFilter}_ERP_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCollected = students.reduce((acc, s) => acc + s.paidFee, 0);
  const totalPending = students.reduce((acc, s) => acc + Math.max(0, s.totalFee - s.paidFee), 0);
  const completedPeonCount = visiblePeonTasks.filter((t) => t.done).length;
  const presentTodayCount = students.filter((s) => s.todayStatus === "Present").length;
  const insideGateCount = gatePasses.filter((g) => g.status === "Inside").length;

  const getModuleBadge = (
    key: (typeof PLATFORM_MODULES)[number]["metricKey"]
  ): string => {
    switch (key) {
      case "students":
        return `${students.length} Students`;
      case "attendance":
        return `${presentTodayCount}/${students.length} Present`;
      case "peon":
        return `${completedPeonCount}/${visiblePeonTasks.length} Done`;
      case "qbank":
        return `Coord Only (${questions.length})`;
      case "gate":
        return `${insideGateCount} Inside`;
      case "fees":
        return `₹${Math.round(totalCollected / 1000)}k Paid`;
      case "parent":
        return `Due ₹${Math.round(totalPending / 1000)}k`;
      case "wingSchool":
        return `${students.filter((s) => s.wing === "School").length} CBSE`;
      case "wingPharmacy":
        return `${students.filter((s) => s.wing === "Pharmacy").length} PCI`;
      case "wingPolytechnic":
        return `${students.filter((s) => s.wing === "Polytechnic").length} MSBTE`;
      case "timetable":
        return `${timetableSlots.length} Slots`;
      case "homework":
        return `${homeworkList.length} Tasks`;
      case "inventory":
        return `${inventoryList.length} Items`;
      case "hr":
        return `${hrStaffList.length} Staff`;
      case "notifications":
        return `${notificationsData.length} Alerts`;
    }
  };

  const modalDue = payingStudent
    ? Math.max(0, payingStudent.totalFee - payingStudent.paidFee)
    : 0;

  return (
    <div
      className={`min-h-screen font-sans antialiased ${
        view === "portal" ? "bg-[#F8FAFC] text-slate-900" : "bg-[#F1F5F9] text-slate-900"
      }`}
    >
      {/* Top Navbar with Dedicated Portal Switchers */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
          <div
            onClick={() => openMode("portal")}
            className="flex items-center gap-3 cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0F294A] flex items-center justify-center text-amber-400 font-black text-base shadow-xs">
              J
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-base tracking-tight text-slate-900">
                JMCT Campus
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide ${
                  dbStatus === "live"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-amber-500/15 text-amber-800"
                }`}
              >
                {dbStatus === "live" ? "● LIVE DB" : "● READY"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => openMode("portal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                view === "portal"
                  ? "bg-[#0F294A] text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => openMode("student")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                view === "student"
                  ? "bg-amber-400 text-slate-950 shadow-2xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
              }`}
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => openMode("fees")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                view === "fees"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200"
              }`}
            >
              Fee System
            </button>
            <button
              type="button"
              onClick={() => openMode("sis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                view === "sis"
                  ? "bg-sky-700 text-white shadow-2xs"
                  : "bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200"
              }`}
            >
              SIS
            </button>
            <button
              type="button"
              onClick={() => openMode("erp", "admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                view === "erp"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200"
              }`}
            >
              Staff & ERP
            </button>

            {authUser ? (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="hidden sm:inline px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold">
                  {authUser.label}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer transition"
              >
                Role Login
              </button>
            )}
          </div>
        </div>
      </header>

      {dbError && (
        <div className="max-w-7xl mx-auto px-6 pt-4 print:hidden">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between gap-2">
            <span>Notice: {dbError}</span>
            <button
              type="button"
              onClick={() => setDbError("")}
              className="text-xs font-black underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. DEDICATED STUDENT LOGIN & PORTAL VIEW
      ===================================================================== */}
      {view === "student" && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {!isStudentAuthenticated ? (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">
                  DEDICATED STUDENT ACCESS
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-0.5">Student Login</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apna Roll ID aur password daalkar student portal kholein.
                </p>
              </div>

              {studentLoginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  ⚠ {studentLoginError}
                </div>
              )}

              <form onSubmit={handleStudentLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700">Student Roll ID</label>
                  <input
                    required
                    type="text"
                    value={studentLoginRollInput}
                    onChange={(e) => setStudentLoginRollInput(e.target.value)}
                    placeholder="e.g. JMCT-SC-101"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <input
                    required
                    type="password"
                    value={studentLoginPassInput}
                    onChange={(e) => setStudentLoginPassInput(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm cursor-pointer transition"
                >
                  Login to Student Portal →
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-slate-400 font-bold">Quick Roll IDs:</span>
                {students.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStudentLoginRollInput(s.id)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono font-bold text-slate-700 cursor-pointer"
                  >
                    {s.id}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeStudent && (
              <>
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                        JMCT NASHIK • STUDENT SELF-SERVICE PORTAL
                      </span>
                      <h1 className="text-2xl font-black text-slate-900 mt-0.5">
                        Welcome, {activeStudent.name}
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeStudent.wing} Wing • {activeStudent.course} • Roll ID: {activeStudent.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={syncLiveStudentPortal}
                        disabled={isSyncingStudentDb}
                        className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold cursor-pointer transition"
                      >
                        {isSyncingStudentDb ? "Syncing..." : "↻ Sync Live DB"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentUnlocked(false)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition"
                      >
                        Switch Student
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">
                        ATTENDANCE RECORD
                      </p>
                      <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                        {activeStudent.totalDays > 0
                          ? Math.round((activeStudent.presentDays / activeStudent.totalDays) * 100)
                          : 100}
                        %
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {activeStudent.presentDays}/{activeStudent.totalDays} Days • Today:{" "}
                        <strong className="text-slate-800">{activeStudent.todayStatus}</strong>
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">
                        FEE PAID
                      </p>
                      <p className="text-2xl font-black text-indigo-700 mt-1 tabular-nums">
                        ₹{activeStudent.paidFee.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        Out of ₹{activeStudent.totalFee.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">
                        PENDING FEE DUE
                      </p>
                      <p className="text-2xl font-black text-rose-600 mt-1 tabular-nums">
                        ₹{Math.max(0, activeStudent.totalFee - activeStudent.paidFee).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeStudent.totalFee - activeStudent.paidFee === 0
                          ? "All dues cleared"
                          : "Available in Fee System"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-slate-400">
                          FEE & RECEIPT ACTIONS
                        </p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          Mobile: {activeStudent.phone}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeStudent.totalFee - activeStudent.paidFee > 0 && (
                          <button
                            type="button"
                            onClick={() => openOnlinePaymentModal(activeStudent)}
                            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                          >
                            Pay Fee Online
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setReceiptStudent(activeStudent)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                        >
                          Print / PDF Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Class Timetable ({activeStudent.wing})
                    </h3>
                    <div className="space-y-2">
                      {timetableSlots
                        .filter((t) => t.wing === activeStudent.wing)
                        .slice(0, 3)
                        .map((slot) => (
                          <div
                            key={slot.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                          >
                            <div className="flex justify-between font-extrabold text-slate-900">
                              <span>{slot.subject}</span>
                              <span className="text-indigo-600">{slot.day}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {slot.timing} • {slot.roomOrLab} • {slot.faculty}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Homework & Assignments
                    </h3>
                    <div className="space-y-2">
                      {homeworkList
                        .filter((h) => h.wing === activeStudent.wing)
                        .slice(0, 3)
                        .map((hw) => (
                          <div
                            key={hw.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-slate-900">{hw.subject}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  hw.completed
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                Due: {hw.dueDate}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">{hw.title}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Campus & Fee Notices
                    </h3>
                    <div className="space-y-2">
                      {notificationsData
                        .filter((n) => n.wing === "All" || n.wing === activeStudent.wing)
                        .slice(0, 3)
                        .map((note) => (
                          <div
                            key={note.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold uppercase text-indigo-600">
                                {note.category}
                              </span>
                              <span className="text-[10px] text-slate-400">{note.dateLabel}</span>
                            </div>
                            <p className="font-bold text-slate-900 mt-0.5">{note.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{note.message}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* =====================================================================
          2. DEDICATED FEE SYSTEM VIEW
      ===================================================================== */}
      {view === "fees" && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                DEDICATED ACCOUNTS & RECEIPT DESK
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">
                Fee System, Dues & Receipts
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roll ID, student, wing..."
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold w-48"
              />
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-extrabold">
                {(
                  [
                    ["All", "All"],
                    ["Due", "Due Only"],
                    ["Paid", "Paid Full"],
                  ] as const
                ).map(([fKey, fLabel]) => (
                  <button
                    key={fKey}
                    type="button"
                    onClick={() => setFeeFilter(fKey)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                      feeFilter === fKey
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {fLabel}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={exportCsvReport}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
              >
                ↓ Export Fee CSV
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-emerald-600 shadow-2xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Total Fee Collected
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                ₹{totalCollected.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-rose-500 shadow-2xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Pending Dues
              </p>
              <p className="text-2xl font-black text-rose-600 mt-1 tabular-nums">
                ₹{totalPending.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-indigo-600 shadow-2xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Recorded Transactions
              </p>
              <p className="text-2xl font-black text-indigo-600 mt-1 tabular-nums">
                {paymentHistory.length} Txns
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-black text-base text-slate-900">
                Student Fee Ledger ({filteredStudents.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/90 border-b border-slate-200/70 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">
                  <tr>
                    <th className="px-5 py-3">Roll ID</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Wing & Course</th>
                    <th className="px-5 py-3">Fee Progress</th>
                    <th className="px-5 py-3 text-right">Fee Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const due = Math.max(0, s.totalFee - s.paidFee);
                    const paidPct =
                      s.totalFee > 0
                        ? Math.min(100, Math.round((s.paidFee / s.totalFee) * 100))
                        : 100;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600">
                          {s.id}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.phone}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase">
                            {s.wing}
                          </span>
                          <p className="text-xs text-slate-600 mt-0.5">{s.course}</p>
                        </td>
                        <td className="px-5 py-3.5 min-w-[160px]">
                          <div className="flex justify-between text-[11px] font-bold tabular-nums mb-1">
                            <span className="text-slate-800">
                              ₹{s.paidFee.toLocaleString("en-IN")}
                            </span>
                            <span className="text-slate-400">
                              / ₹{s.totalFee.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                due === 0 ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                          {due > 0 ? (
                            <button
                              type="button"
                              onClick={() => openOnlinePaymentModal(s)}
                              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer tabular-nums"
                            >
                              Pay ₹{due.toLocaleString("en-IN")}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                              Paid Full
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setReceiptStudent(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                Recent Fee Transactions ({paymentHistory.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {paymentHistory.map((p) => (
                <div
                  key={p.txnId}
                  className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-mono font-bold text-indigo-700">
                      {p.txnId} • {p.studentName} ({p.studentId})
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {p.method}
                      {p.upiId ? ` (${p.upiId})` : ""} • {p.paidAt}
                    </p>
                  </div>
                  <span className="font-black text-emerald-700 text-sm tabular-nums">
                    + ₹{p.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. DEDICATED SIS (STUDENT INFORMATION SYSTEM) VIEW
      ===================================================================== */}
      {view === "sis" && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700">
                STUDENT INFORMATION SYSTEM (SIS)
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">
                Student Directory & Academic Records
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, roll ID, course..."
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold w-52"
              />
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                {(["All", "School", "Pharmacy", "Polytechnic"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWingFilter(w)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      wingFilter === w
                        ? "bg-sky-700 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {w === "All" ? "All Wings" : w}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openMode("erp", "admin")}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                + New Admission
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((s) => {
              const attPct =
                s.totalDays > 0 ? Math.round((s.presentDays / s.totalDays) * 100) : 100;
              const due = Math.max(0, s.totalFee - s.paidFee);
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-extrabold text-sky-700">{s.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        s.wing === "School"
                          ? "bg-blue-50 text-blue-700"
                          : s.wing === "Pharmacy"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {s.wing}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-900">{s.name}</h2>
                    <p className="text-xs text-slate-600 mt-0.5">{s.course}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Contact: {s.phone}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs tabular-nums">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold text-slate-400">ATTENDANCE</p>
                      <p
                        className={`text-sm font-black mt-0.5 ${
                          attPct < 75 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {attPct}% ({s.presentDays}/{s.totalDays})
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold text-slate-400">FEE DUE</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        ₹{due.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentPortalId(s.id);
                        setStudentLoginRollInput(s.id);
                        setStudentUnlocked(true);
                        openMode("student");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
                    >
                      Open Student View
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptStudent(s)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          4. HOME PAGE VIEW (FIRST PAGE ON VISIT)
      ===================================================================== */}
      {view === "portal" && (
        <>
          <section className="bg-gradient-to-r from-[#0F294A] via-[#1B3B66] to-[#9A3412] text-white">
            <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-block px-3 py-1 rounded bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider">
                  JMCT NASHIK • MULTI-WING CAMPUS & ERP
                </span>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  School (CBSE), Pharmacy (PCI) & Polytechnic (MSBTE)
                </h1>
                <p className="text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
                  Har system ka alag desk: Student Login & Portal, Fee System, SIS Directory,
                  Admissions, Attendance, Timetable, Homework, Inventory, HR, Question Bank, Peon
                  Duty aur Gate Pass.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => openMode("student")}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black cursor-pointer transition"
                  >
                    Student Login →
                  </button>
                  <button
                    type="button"
                    onClick={() => openMode("fees")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black cursor-pointer transition"
                  >
                    Fee System
                  </button>
                  <button
                    type="button"
                    onClick={() => openMode("sis")}
                    className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-extrabold cursor-pointer transition"
                  >
                    SIS Directory
                  </button>
                  <button
                    type="button"
                    onClick={() => openMode("erp", "admin")}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold cursor-pointer transition"
                  >
                    Staff & ERP Desk
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-slate-950/55 border border-white/15 p-5 space-y-3 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span>LIVE CAMPUS SNAPSHOT</span>
                    <span className="tabular-nums">
                      {presentTodayCount}/{students.length} Present
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/10 p-3.5">
                      <p className="text-[10px] font-extrabold uppercase text-slate-300">
                        Fee Collected
                      </p>
                      <p className="text-xl font-black text-white mt-0.5 tabular-nums">
                        ₹{totalCollected.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3.5">
                      <p className="text-[10px] font-extrabold uppercase text-slate-300">
                        Pending Dues
                      </p>
                      <p className="text-xl font-black text-amber-300 mt-0.5 tabular-nums">
                        ₹{totalPending.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <button
                      type="button"
                      onClick={() => openMode("erp", "peon")}
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer"
                    >
                      <p className="font-extrabold">Peon Duty</p>
                      <p className="text-[11px] text-slate-300 tabular-nums">
                        {completedPeonCount}/{visiblePeonTasks.length} Done
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "guard")}
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer"
                    >
                      <p className="font-extrabold">Gate Log</p>
                      <p className="text-[11px] text-slate-300 tabular-nums">
                        {insideGateCount} Inside
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "qbank")}
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 cursor-pointer"
                    >
                      <p className="font-extrabold">Question Bank</p>
                      <p className="text-[11px] text-slate-300 tabular-nums">
                        {questions.length} Qs
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-400 text-slate-950 border-t border-amber-500">
              <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-xs font-extrabold">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 text-[10px] uppercase shrink-0">
                    Announcement
                  </span>
                  <span className="truncate">{ANNOUNCEMENTS[tickerIdx]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTickerIdx((i) => (i + 1) % ANNOUNCEMENTS.length)}
                  className="text-[11px] underline cursor-pointer shrink-0"
                >
                  Next Notice →
                </button>
              </div>
            </div>
          </section>

          <section className="bg-[#181B20] text-white py-12">
            <div className="max-w-7xl mx-auto px-6 space-y-10">
              <div className="text-center space-y-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                  Separate Portals & Quick Links
                </p>
                <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
                  {QUICK_CIRCLES.map((qc) => (
                    <button
                      key={qc.label}
                      type="button"
                      onClick={() => openMode(qc.mode || "erp", qc.tab, qc.wing)}
                      className="group flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-amber-400 group-hover:text-slate-950 border border-white/25 flex items-center justify-center font-black text-xs transition">
                        {qc.sub}
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                        {qc.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 rounded-2xl bg-[#1E40AF] text-white p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-blue-200">
                    <span>News and Events</span>
                    <span>{NEWS_AND_EVENTS[0].date}</span>
                  </div>
                  <h3 className="text-xl font-black leading-snug">
                    {NEWS_AND_EVENTS[0].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                    {NEWS_AND_EVENTS[0].summary}
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openMode("erp", "qbank")}
                      className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
                    >
                      Question Bank
                    </button>
                    <span className="text-xs text-blue-200 font-semibold">
                      {NEWS_AND_EVENTS[1].title}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-3 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
                    Notifications
                  </h3>
                  <div className="space-y-3">
                    {NOTIFICATIONS_LIST.map((n) => (
                      <div key={n.code} className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-200 leading-snug">{n.text}</p>
                        <p className="text-[10px] text-slate-400">{n.date}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
                    Announcements
                  </h3>
                  <div className="space-y-3">
                    {ANNOUNCEMENTS_LIST.map((a) => (
                      <div
                        key={a.code}
                        className="flex items-start justify-between gap-2 text-xs border-b border-white/5 pb-2 last:border-none"
                      >
                        <p className="font-semibold text-slate-200 leading-snug">{a.text}</p>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 shrink-0">
                          {a.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="mission-vc" className="space-y-0">
            <div className="bg-[#1C1F24] text-white py-14">
              <div className="max-w-7xl mx-auto px-6 space-y-8">
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider">
                    Our Mission & Vision
                  </h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  {MISSION_PILLARS.map((m) => (
                    <div key={m.num} className="space-y-3">
                      <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-black text-sm">
                        {m.num}
                      </div>
                      <h3 className="text-base font-black text-white">{m.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{m.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#0F294A] text-white py-10">
              <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white/10 border border-amber-400/50 flex items-center justify-center font-black text-xl text-amber-300 shrink-0">
                    JMCT
                  </div>
                  <div>
                    <p className="text-base font-black text-white">Campus Leadership Desk</p>
                    <p className="text-xs text-blue-200">
                      Dr. M. Deshpande • Dr. S. Kulkarni • Prof. V. Patil
                    </p>
                  </div>
                </div>
                <div className="md:col-span-8 space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                    Leadership Message • Welcome to JMCT Nashik
                  </p>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Our three wings — School (CBSE), Pharmacy (PCI), and Polytechnic (MSBTE) —
                    combine academic rigor with everyday operational clarity. Through dedicated
                    portals for Students, Fees, SIS, and Staff, every workflow stays organized.
                  </p>
                  <button
                    type="button"
                    onClick={() => openMode("erp", "teacher")}
                    className="mt-1 px-4 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
                  >
                    Open Faculty Desk
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section id="institutions" className="max-w-7xl mx-auto px-6 py-12 space-y-10">
            <div className="grid md:grid-cols-12 gap-6 items-center bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <div className="md:col-span-7 space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0F294A]">
                  Life at JMCT Nashik
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Students across School, Pharmacy, and Polytechnic learn in structured classrooms,
                  science & formulation laboratories, and technical workshops while Student Portal,
                  Fee System, and SIS operate as separate dedicated desks.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openMode("student")}
                    className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
                  >
                    Student Login
                  </button>
                  <button
                    type="button"
                    onClick={() => openMode("fees")}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Fee System
                  </button>
                  <button
                    type="button"
                    onClick={() => openMode("sis")}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold cursor-pointer"
                  >
                    SIS Directory
                  </button>
                </div>
              </div>
              <div className="md:col-span-5 rounded-xl bg-gradient-to-r from-[#0F294A] to-indigo-700 text-white p-5">
                <p className="text-xs font-extrabold uppercase text-amber-300">
                  Wadala Road Campus • Nashik
                </p>
                <p className="text-lg font-black mt-1">
                  3 Academic Wings • Dedicated Portals
                </p>
                <p className="text-xs text-slate-200 mt-1">
                  CBSE School • PCI Pharmacy • MSBTE Polytechnic
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <h2 className="text-center text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                Our Institutions
              </h2>
              <div className="grid md:grid-cols-3 gap-5">
                {WING_INSTITUTIONS.map((inst) => (
                  <div
                    key={inst.wing}
                    className={`rounded-2xl bg-gradient-to-br ${inst.accent} text-white p-6 flex flex-col justify-between space-y-4 shadow-sm`}
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/15 text-amber-300">
                        {inst.board}
                      </span>
                      <h3 className="text-lg font-black pt-1">{inst.name}</h3>
                      <p className="text-xs font-semibold text-amber-200">{inst.head}</p>
                      <p className="text-xs text-slate-200 leading-relaxed">{inst.desc}</p>
                    </div>
                    <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => openMode("erp", "teacher", inst.wing)}
                        className="font-extrabold text-amber-300 hover:underline cursor-pointer"
                      >
                        {inst.wing} Desk →
                      </button>
                      <button
                        type="button"
                        onClick={() => openMode("erp", "qbank", inst.wing)}
                        className="font-bold text-slate-200 hover:text-white cursor-pointer"
                      >
                        Question Bank
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-black text-slate-900">Best Teachers & Mentors</h3>
                <button
                  type="button"
                  onClick={() => openMode("erp", "teacher")}
                  className="text-xs font-extrabold text-[#0F294A] hover:underline cursor-pointer"
                >
                  Open Teacher Desk →
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {BEST_TEACHERS.map((t) => (
                  <div
                    key={t.name}
                    className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-2xs"
                  >
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {t.badge}
                    </span>
                    <h4 className="text-base font-black text-slate-900 pt-1">{t.name}</h4>
                    <p className="text-xs font-semibold text-slate-600">{t.role}</p>
                    <p className="text-xs text-slate-500">{t.highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="modules" className="max-w-7xl mx-auto px-6 py-10 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-700">
                SEPARATE PORTALS & ERP MODULES
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Har system ka alag-alag desk.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Kisi bhi card par click karke uska dedicated page ya desk kholein.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {(
                ["All", "Academic & Exams", "Fees & Parent", "Operations"] as ModuleCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setModuleCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    moduleCategory === cat
                      ? "bg-[#0F294A] text-white shadow"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {cat === "All" ? `All Desks (${PLATFORM_MODULES.length})` : cat}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleModules.map((m) => (
                <button
                  key={m.title}
                  type="button"
                  onClick={() => openMode(m.mode, m.tab, m.wing)}
                  className="rounded-2xl bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 text-left transition cursor-pointer group flex flex-col justify-between space-y-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition">
                        {m.title}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 tabular-nums whitespace-nowrap">
                        {getModuleBadge(m.metricKey)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 group-hover:text-indigo-700 font-bold">
                    <span>{m.category}</span>
                    <span>Open →</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section id="interface-tour" className="max-w-7xl mx-auto px-6 py-10 space-y-5">
            <div className="text-center space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
                INTERACTIVE INTERFACE TOUR
              </span>
              <h2 className="text-2xl font-black text-slate-900">Experience the Workspace</h2>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {(
                [
                  "Dashboard",
                  "Attendance",
                  "Peon Duty",
                  "Gate Pass",
                  "Fees",
                  "Question Bank",
                  "Timetable",
                  "Homework",
                  "Inventory",
                  "HR & Staff",
                  "Notifications",
                ] as TourTab[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTourTab(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    tourTab === t
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{tourTab} Desk Preview</h3>
                  <p className="text-xs text-slate-500">
                    {tourTab === "Dashboard" &&
                      "Live summary of student count, fee collection, and campus modules."}
                    {tourTab === "Attendance" &&
                      "Wing and class-wise roll call for School (CBSE), Pharmacy (PCI), and Polytechnic (MSBTE)."}
                    {tourTab === "Peon Duty" &&
                      "Shift-wise cleaning, water, lab setup, and duty completion tracking."}
                    {tourTab === "Gate Pass" &&
                      "Visitor, parent, and vendor entry/exit log at campus security gate."}
                    {tourTab === "Fees" &&
                      "Online UPI/Card/NetBanking fee collection and printable receipt generation."}
                    {tourTab === "Question Bank" &&
                      "Permitted Coordinators only; edit questions, select items, and print structured papers."}
                    {tourTab === "Timetable" &&
                      "Wing, class, day, and lab/room period schedule management."}
                    {tourTab === "Homework" &&
                      "Daily assignments by wing, class, subject, due date, and completion tracking."}
                    {tourTab === "Inventory" &&
                      "Lab glassware, consumables, IT assets, and stock availability tracking."}
                    {tourTab === "HR & Staff" &&
                      "Faculty, peon, security, and support staff shift and duty status log."}
                    {tourTab === "Notifications" &&
                      "Attendance, fee due, and exam alerts across wings and audiences."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (tourTab === "Fees") {
                      openMode("fees");
                      return;
                    }
                    const mapTourToRole: Record<Exclude<TourTab, "Fees">, RoleTab> = {
                      Dashboard: "admin",
                      Attendance: "teacher",
                      "Peon Duty": "peon",
                      "Gate Pass": "guard",
                      "Question Bank": "qbank",
                      Timetable: "timetable",
                      Homework: "homework",
                      Inventory: "inventory",
                      "HR & Staff": "hr",
                      Notifications: "notifications",
                    };
                    openMode("erp", mapTourToRole[tourTab]);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  Open Live {tourTab} →
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500">ENROLLED STUDENTS</p>
                  <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                    {students.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Across 3 wings</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500">PEON DUTIES</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
                    {completedPeonCount}/{visiblePeonTasks.length} Done
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Saved locally & active</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500">FEE COLLECTION</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1 tabular-nums">
                    ₹{totalCollected.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Receipts ready</p>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-[#181B20] text-white py-8">
            <div className="max-w-7xl mx-auto px-6">
              <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-4">
                Campus Overview
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                {[
                  { label: "Academic Wings", val: "3 Wings" },
                  { label: "Enrolled Students", val: `${students.length} Active` },
                  { label: "Timetable & HW", val: `${timetableSlots.length}P / ${homeworkList.length}HW` },
                  { label: "Inventory & HR", val: `${inventoryList.length}I / ${hrStaffList.length}S` },
                  { label: "Question Bank", val: `${questions.length} Questions` },
                  { label: "Alerts & Fees", val: `${notificationsData.length} Alerts` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-white/5 border border-white/10 p-3.5"
                  >
                    <p className="text-sm font-black text-amber-300 tabular-nums">{item.val}</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="bg-[#0F294A] text-slate-200 pt-10 pb-6 px-6 text-xs">
            <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-white/15">
              <div className="space-y-2">
                <h4 className="font-black text-white uppercase tracking-wider">Separate Portals</h4>
                <ul className="space-y-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("student")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      Student Login & Portal
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("fees")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      Fee System & Receipts
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("sis")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      SIS Directory
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-white uppercase tracking-wider">Admissions & Wings</h4>
                <ul className="space-y-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "teacher", "School")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      JMCT School (CBSE)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "teacher", "Pharmacy")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      JMCT Pharmacy (PCI)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "teacher", "Polytechnic")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      JMCT Polytechnic (MSBTE)
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-white uppercase tracking-wider">Staff & ERP Desks</h4>
                <ul className="space-y-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "timetable")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      Timetable & Homework Desk
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "inventory")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      Inventory & HR Staff Log
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => openMode("erp", "qbank")}
                      className="hover:text-amber-300 cursor-pointer"
                    >
                      Question Bank (Coordinator)
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-white uppercase tracking-wider">Contact Us</h4>
                <p className="font-bold text-white">JMCT Group of Institutions</p>
                <p className="text-slate-300">Wadala Road, Nashik – 422006, Maharashtra</p>
                <p className="text-amber-300 font-semibold">erp@jmctnashik.edu.in</p>
              </div>
            </div>

            <div className="max-w-7xl mx-auto pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-400">
              <p>Copyright © JMCT Campus ERP • Nashik</p>
              <p>School (CBSE) • Pharmacy (PCI) • Polytechnic (MSBTE)</p>
            </div>
          </footer>
        </>
      )}

      {/* =====================================================================
          5. STAFF & ERP OPERATIONS VIEW
      ===================================================================== */}
      {view === "erp" && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                JMCT NASHIK • STAFF & OPERATIONS DESK
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Campus ERP Operations Desk
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, class, year, subject..."
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold w-52 focus:bg-white focus:border-indigo-500 outline-none transition"
              />
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                {(["All", "School", "Pharmacy", "Polytechnic"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWingFilter(w)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      wingFilter === w
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {w === "All" ? "All Wings (3)" : w}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={exportCsvReport}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer whitespace-nowrap"
              >
                ↓ Export CSV
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                title="Reset sample data after testing"
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer whitespace-nowrap"
              >
                Reset Demo
              </button>
            </div>
          </div>

          <div className="space-y-2.5 print:hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {(
                [
                  ["admin", "01 • ADMIN", "Admissions & Fees"],
                  ["teacher", "02 • TEACHERS", "Attendance & Q-Upload"],
                  ["peon", "03 • PEON SYSTEM", "Duty & Cleaning"],
                  ["guard", "04 • SECURITY", "Gate Pass Log"],
                  ["parent", "05 • PARENTS", "Status & Online Pay"],
                  ["qbank", "06 • QUESTION BANK", hasCoordinatorPermission ? "Permitted Access" : "Coordinator Only"],
                ] as const
              ).map(([key, tag, title]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleTab(key)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    roleTab === key
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-800 border-slate-200/90 hover:border-indigo-300"
                  }`}
                >
                  <p
                    className={`text-[10px] font-extrabold tracking-wider ${
                      roleTab === key ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {tag}
                  </p>
                  <p className="text-xs sm:text-sm font-black mt-0.5">{title}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  ["timetable", "TIMETABLE", `${timetableSlots.length} Periods`],
                  ["homework", "HOMEWORK", `${homeworkList.length} Tasks`],
                  ["inventory", "INVENTORY", `${inventoryList.length} Items`],
                  ["hr", "HR & STAFF LOG", `${hrStaffList.length} Staff`],
                  ["notifications", "NOTIFICATIONS", `${notificationsData.length} Alerts`],
                ] as const
              ).map(([key, title, sub]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleTab(key)}
                  className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                    roleTab === key
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-white text-slate-800 border-slate-200/90 hover:border-slate-400"
                  }`}
                >
                  <span className="text-xs font-black tracking-wide">{title}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                      roleTab === key
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. ADMIN DESK */}
          {roleTab === "admin" && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-indigo-600 shadow-2xs">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Total Students
                  </p>
                  <p className="text-2xl font-black text-indigo-600 mt-1 tabular-nums">
                    {students.length}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-emerald-600 shadow-2xs">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Total Fee Collected
                  </p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                    ₹{totalCollected.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-rose-500 shadow-2xs">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Pending Dues
                  </p>
                  <p className="text-2xl font-black text-rose-600 mt-1 tabular-nums">
                    ₹{totalPending.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 border-t-4 border-t-amber-500 shadow-2xs">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Active Gate Passes
                  </p>
                  <p className="text-2xl font-black text-amber-600 mt-1 tabular-nums">
                    {insideGateCount} Inside
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleAddStudent}
                  className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                      ADMISSIONS COUNTER
                    </p>
                    <h2 className="text-lg font-black text-slate-900">+ New Student Admission</h2>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Student Full Name</label>
                    <input
                      required
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Pranav Deshpande"
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Select Wing</label>
                    <select
                      value={newWing}
                      onChange={(e) => setNewWing(e.target.value as Wing)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="School">JMCT International School (CBSE)</option>
                      <option value="Pharmacy">JMCT College of Pharmacy (PCI)</option>
                      <option value="Polytechnic">JMCT Polytechnic College (MSBTE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Class / Course & Batch</label>
                    <input
                      required
                      type="text"
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      placeholder="e.g. Grade 10 - A (CBSE) / B.Pharm Sem-IV"
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Mobile No.</label>
                      <input
                        required
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="98230XXXXX"
                        className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Annual Fee (₹)</label>
                      <input
                        required
                        type="number"
                        value={newFee}
                        onChange={(e) => setNewFee(e.target.value)}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold tabular-nums focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xs cursor-pointer transition"
                  >
                    Confirm Admission & Generate ID
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black text-base text-slate-900">
                        Student & Fee Register ({filteredStudents.length})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Live records • Filter by fee status, collect online payment, or print receipt
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-extrabold">
                      {(
                        [
                          ["All", "All"],
                          ["Due", "Due Only"],
                          ["Paid", "Paid Full"],
                        ] as const
                      ).map(([fKey, fLabel]) => (
                        <button
                          key={fKey}
                          type="button"
                          onClick={() => setFeeFilter(fKey)}
                          className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                            feeFilter === fKey
                              ? "bg-white text-indigo-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {fLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/90 border-b border-slate-200/70 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">
                        <tr>
                          <th className="px-5 py-3">Roll ID</th>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Wing & Course</th>
                          <th className="px-5 py-3">Fee Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((s) => {
                          const due = Math.max(0, s.totalFee - s.paidFee);
                          const paidPct =
                            s.totalFee > 0
                              ? Math.min(100, Math.round((s.paidFee / s.totalFee) * 100))
                              : 100;
                          const attPct =
                            s.totalDays > 0
                              ? Math.round((s.presentDays / s.totalDays) * 100)
                              : 100;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600 whitespace-nowrap">
                                {s.id}
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="font-bold text-slate-900">{s.name}</p>
                                <p className="text-xs text-slate-500 tabular-nums">
                                  {s.phone} • Att:{" "}
                                  <span
                                    className={`font-bold ${
                                      attPct < 75 ? "text-rose-600" : "text-emerald-600"
                                    }`}
                                  >
                                    {attPct}%
                                  </span>
                                </p>
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                    s.wing === "School"
                                      ? "bg-blue-50 text-blue-700"
                                      : s.wing === "Pharmacy"
                                      ? "bg-violet-50 text-violet-700"
                                      : "bg-amber-50 text-amber-800"
                                  }`}
                                >
                                  {s.wing}
                                </span>
                                <p className="text-xs font-medium text-slate-600 mt-0.5">
                                  {s.course}
                                </p>
                              </td>
                              <td className="px-5 py-3.5 min-w-[150px]">
                                <div className="flex justify-between text-[11px] font-bold tabular-nums mb-1">
                                  <span className="text-slate-700">
                                    ₹{s.paidFee.toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-slate-400">
                                    / ₹{s.totalFee.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      due === 0 ? "bg-emerald-500" : "bg-indigo-600"
                                    }`}
                                    style={{ width: `${paidPct}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStudentPortalId(s.id);
                                      setStudentLoginRollInput(s.id);
                                      setStudentUnlocked(true);
                                      openMode("student");
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold cursor-pointer transition"
                                  >
                                    Portal
                                  </button>
                                  {due > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => openOnlinePaymentModal(s)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer transition tabular-nums"
                                    >
                                      Pay ₹{due.toLocaleString("en-IN")}
                                    </button>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                      Paid Full
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setReceiptStudent(s)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition"
                                  >
                                    Receipt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStudent(s.id)}
                                    title="Remove student record"
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold cursor-pointer transition"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TEACHER DESK */}
          {roleTab === "teacher" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                      FACULTY WORKSPACE • ROLL CALL & QUESTION SUBMISSION
                    </span>
                    <h2 className="text-lg font-black text-slate-900">
                      Teacher Roll Call & Question Upload Desk
                    </h2>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold">
                    ● {teacherWing} • {teacherClass} ({teacherAcademicYear})
                  </span>
                </div>

                <div className="grid sm:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Teacher / Faculty Name</label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Select Wing</label>
                    <select
                      value={teacherWing}
                      onChange={(e) => handleWingSwitchForTeacher(e.target.value as Wing)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold text-indigo-700"
                    >
                      <option value="School">School Wing (CBSE Teachers)</option>
                      <option value="Pharmacy">Pharmacy Wing (PCI Faculty)</option>
                      <option value="Polytechnic">Polytechnic Wing (MSBTE Faculty)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Class / Batch</label>
                    <select
                      value={teacherClass}
                      onChange={(e) => setTeacherClass(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      {WING_COURSES[teacherWing].map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Academic Year</label>
                    <select
                      value={teacherAcademicYear}
                      onChange={(e) => setTeacherAcademicYear(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      {ACADEMIC_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      id="onlyClassCheck"
                      type="checkbox"
                      checked={onlySelectedClass}
                      onChange={(e) => setOnlySelectedClass(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <label
                      htmlFor="onlyClassCheck"
                      className="text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      Only Selected Class
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h3 className="font-black text-base text-slate-900">
                        {teacherWing} Attendance —{" "}
                        {onlySelectedClass ? teacherClass : "All Classes in Wing"} (
                        {attendanceStudents.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Marking by {teacherName} • Year {teacherAcademicYear}
                      </p>
                    </div>
                    {attendanceStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={markAllClassPresent}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer transition"
                      >
                        ✓ Mark All Present
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {attendanceStudents.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        No students found for this class selection.{" "}
                        <button
                          type="button"
                          onClick={() => setOnlySelectedClass(false)}
                          className="text-indigo-600 font-bold underline cursor-pointer"
                        >
                          Show all students in {teacherWing} wing
                        </button>
                      </div>
                    ) : (
                      attendanceStudents.map((s) => {
                        const pct = Math.round((s.presentDays / s.totalDays) * 100);
                        return (
                          <div
                            key={s.id}
                            className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-600 whitespace-nowrap">
                                  {s.id}
                                </span>
                                <span className="font-extrabold text-slate-900">{s.name}</span>
                                {pct < 75 && (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black whitespace-nowrap">
                                    ⚠ BELOW 75% ({pct}%)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                {s.wing} • {s.course} • Overall: {pct}% ({s.presentDays}/
                                {s.totalDays} days)
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isAttendanceLocked}
                                onClick={() => markAttendance(s.id, "Present")}
                                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition disabled:opacity-40 ${
                                  s.todayStatus === "Present"
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
                                }`}
                              >
                                ✓ Present
                              </button>
                              <button
                                type="button"
                                disabled={isAttendanceLocked}
                                onClick={() => markAttendance(s.id, "Absent")}
                                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition disabled:opacity-40 ${
                                  s.todayStatus === "Absent"
                                    ? "bg-rose-600 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-700 hover:bg-rose-50"
                                }`}
                              >
                                ✕ Absent
                              </button>
                              <button
                                type="button"
                                disabled={isAttendanceLocked || s.todayStatus === "Unmarked"}
                                onClick={() => resetAttendanceToUnmarked(s.id)}
                                className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {attendanceStudents.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        {isAttendanceLocked && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                            LOCKED ✓
                          </span>
                        )}
                        {attendanceNotice ? (
                          <span className="font-bold text-emerald-700">{attendanceNotice}</span>
                        ) : (
                          <span>Roll call check karke Submit Attendance dabayein.</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAttendanceLocked && (
                          <button
                            type="button"
                            onClick={handleUnlockAttendance}
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-extrabold cursor-pointer transition"
                          >
                            Unlock / Edit
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isSubmittingAttendance || isAttendanceLocked}
                          onClick={handleSubmitAttendance}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer transition"
                        >
                          {isAttendanceLocked
                            ? "Submitted & Locked"
                            : isSubmittingAttendance
                            ? "Submitting..."
                            : "Submit Attendance"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <form
                    onSubmit={handleTeacherUploadQuestion}
                    className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4"
                  >
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                        UPLOAD TO QUESTION BANK
                      </span>
                      <h3 className="text-lg font-black text-slate-900">
                        Upload Wing, Class & Year Question
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Teachers upload by wing, class, and year; only permitted Coordinators can
                        open, edit, and print the Question Bank.
                      </p>
                    </div>

                    {uploadNotice && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        ✓ {uploadNotice}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Wing</label>
                        <select
                          value={uploadWing}
                          onChange={(e) => handleUploadWingChange(e.target.value as Wing)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                        >
                          <option value="School">School (CBSE)</option>
                          <option value="Pharmacy">Pharmacy (PCI)</option>
                          <option value="Polytechnic">Polytechnic (MSBTE)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Academic Year</label>
                        <select
                          value={uploadYear}
                          onChange={(e) => setUploadYear(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                        >
                          {ACADEMIC_YEARS.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">Class / Course</label>
                      <select
                        value={uploadClass}
                        onChange={(e) => setUploadClass(e.target.value)}
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                      >
                        {WING_COURSES[uploadWing].map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Subject</label>
                        <input
                          required
                          type="text"
                          value={uploadSubject}
                          onChange={(e) => setUploadSubject(e.target.value)}
                          placeholder="e.g. Pharmaceutics"
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Marks</label>
                        <input
                          required
                          type="number"
                          value={uploadMarks}
                          onChange={(e) => setUploadMarks(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">Unit / Topic</label>
                      <input
                        type="text"
                        value={uploadUnit}
                        onChange={(e) => setUploadUnit(e.target.value)}
                        placeholder="e.g. Unit 3 - Dosage Forms"
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">Question Statement</label>
                      <textarea
                        required
                        rows={3}
                        value={uploadQuestionText}
                        onChange={(e) => setUploadQuestionText(e.target.value)}
                        placeholder="Enter question for unit test / sessional / semester exam..."
                        className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                    >
                      Upload Question to Question Bank
                    </button>
                  </form>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Your Submitted Questions ({teacherUploadedQuestions.length})
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        By {teacherName}
                      </span>
                    </div>
                    {teacherUploadedQuestions.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No questions uploaded under &ldquo;{teacherName}&rdquo; yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teacherUploadedQuestions.map((tq) => (
                          <div
                            key={tq.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <p className="font-bold text-slate-800 truncate">
                                {tq.wing} • {tq.className} ({tq.academicYear})
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {tq.subject} • {tq.marks} Marks
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                              ✓ Sent to Bank
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. SYSTEM-WISE PEON / SUPPORT STAFF MODULE */}
          {roleTab === "peon" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                      SYSTEM MODULE 03 • HOUSEKEEPING, LAB & BELL OPERATIONS
                    </span>
                    <h2 className="text-lg font-black text-slate-900">
                      Peon & Support Staff Duty System
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-extrabold tabular-nums">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800">
                      Total: {visiblePeonTasks.length}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900">
                      Pending: {visiblePeonTasks.length - completedPeonCount}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                      Done: {completedPeonCount}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-extrabold text-indigo-700">STEP 1: WING & ZONE</p>
                    <p className="text-slate-600 mt-0.5">
                      Select School, Pharmacy, or Polytechnic block/lab.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-extrabold text-indigo-700">STEP 2: SHIFT DISPATCH</p>
                    <p className="text-slate-600 mt-0.5">
                      Assign duty timing, water/sanitation, or file task.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="font-extrabold text-indigo-700">STEP 3: LIVE SIGN-OFF</p>
                    <p className="text-slate-600 mt-0.5">
                      Mark duty Completed once floor/lab check is done.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <form
                  onSubmit={handleAddPeonTask}
                  className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5"
                >
                  <h3 className="text-base font-black text-slate-900">+ Dispatch New Duty Slip</h3>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Support Staff Name</label>
                    <input
                      required
                      type="text"
                      value={peonStaff}
                      onChange={(e) => setPeonStaff(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Wing</label>
                      <select
                        value={peonWing}
                        onChange={(e) => setPeonWing(e.target.value as Wing)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                      >
                        <option value="School">School</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Polytechnic">Polytechnic</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Shift</label>
                      <select
                        value={peonShift}
                        onChange={(e) => setPeonShift(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                      >
                        <option value="Shift A • 07:30 AM – 03:30 PM">Shift A (Morning)</option>
                        <option value="Shift B • 11:00 AM – 07:00 PM">Shift B (Day/Eve)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Building / Lab Zone</label>
                    <input
                      type="text"
                      value={peonZone}
                      onChange={(e) => setPeonZone(e.target.value)}
                      placeholder="e.g. Lab 2 / Ground Floor Corridor"
                      className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Duty Instructions</label>
                    <input
                      required
                      type="text"
                      value={peonTaskText}
                      onChange={(e) => setPeonTaskText(e.target.value)}
                      placeholder="e.g. Water Cooler Refill & Bell Duty"
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                  >
                    Assign Duty to Roster
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-900">
                      Duty Roster & Completion Queue ({visiblePeonTasks.length})
                    </h3>
                    <span className="text-xs font-semibold text-slate-500">
                      Wing: {wingFilter} • Saved Locally
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {visiblePeonTasks.map((t) => (
                      <div
                        key={t.id}
                        className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600">
                              {t.id}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                              {t.wing}
                            </span>
                            <span className="text-xs font-bold text-slate-700">{t.zone}</span>
                          </div>
                          <p className="font-extrabold text-slate-900 text-sm">{t.locationTask}</p>
                          <p className="text-xs text-slate-500">
                            Assigned to: <strong>{t.staffName}</strong> • {t.shift}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPeonTasks((prev) =>
                              prev.map((item) =>
                                item.id === t.id ? { ...item, done: !item.done } : item
                              )
                            )
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                            t.done
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                          }`}
                        >
                          {t.done ? "✓ Completed" : "Mark Completed"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. SECURITY GUARD DESK */}
          {roleTab === "guard" && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddGatePass}
                className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4"
              >
                <h2 className="text-lg font-black text-slate-900">+ Campus Gate Pass Entry</h2>
                <div>
                  <label className="text-xs font-bold text-slate-700">On-Duty Security Guard</label>
                  <input
                    type="text"
                    value={guardName}
                    onChange={(e) => setGuardName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Visitor / Student Name</label>
                  <input
                    required
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Mr. Anil Kulkarni"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Category</label>
                    <select
                      value={visitorRole}
                      onChange={(e) => setVisitorRole(e.target.value as GatePass["roleType"])}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Student">Student</option>
                      <option value="Vendor">Vendor</option>
                      <option value="Visitor">Visitor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Wing</label>
                    <select
                      value={visitorWing}
                      onChange={(e) => setVisitorWing(e.target.value as Wing)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="School">School</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Polytechnic">Polytechnic</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Purpose of Visit</label>
                  <input
                    type="text"
                    value={visitorPurpose}
                    onChange={(e) => setVisitorPurpose(e.target.value)}
                    placeholder="e.g. Accounts Office / Lab Pass"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                >
                  Log Gate Entry
                </button>
              </form>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-900">
                    Gate Pass & Visitor Log ({gatePasses.length})
                  </h2>
                  <span className="text-xs text-slate-500 font-semibold">{guardName}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {gatePasses.map((g) => (
                    <div
                      key={g.id}
                      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">{g.id}</span>
                          <span className="font-extrabold text-slate-900">{g.visitorName}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {g.roleType} • {g.wing}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {g.purpose} • Time: {g.time}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setGatePasses((prev) =>
                            prev.map((item) =>
                              item.id === g.id
                                ? {
                                    ...item,
                                    status: item.status === "Inside" ? "Exited" : "Inside",
                                  }
                                : item
                            )
                          )
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                          g.status === "Inside"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {g.status === "Inside" ? "● Inside (Mark Exit)" : "Exited (Mark In)"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. PARENTS DESK & ONLINE PAYMENT */}
          {roleTab === "parent" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                      PARENT & STUDENT SELF-SERVICE DESK
                    </span>
                    <h2 className="text-2xl font-black text-slate-900">
                      Live Attendance, Fee Balance & Online Fee Payment
                    </h2>
                  </div>
                  <input
                    type="text"
                    value={parentLookupId}
                    onChange={(e) => setParentLookupId(e.target.value)}
                    placeholder="Enter Student ID (e.g. JMCT-PH-204)"
                    className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                  />
                </div>

                {parentStudent ? (
                  <div className="grid sm:grid-cols-4 gap-5 items-center">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">
                        STUDENT PROFILE
                      </p>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{parentStudent.name}</p>
                      <p className="text-xs font-semibold text-indigo-600">
                        {parentStudent.wing} • {parentStudent.course}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">
                        ATTENDANCE
                      </p>
                      <p className="text-2xl font-black text-emerald-600 mt-0.5 tabular-nums">
                        {Math.round((parentStudent.presentDays / parentStudent.totalDays) * 100)}%
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {parentStudent.presentDays}/{parentStudent.totalDays} Days • Today:{" "}
                        {parentStudent.todayStatus}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">
                        FEE BALANCE
                      </p>
                      <p className="text-2xl font-black text-rose-600 mt-0.5 tabular-nums">
                        ₹{(parentStudent.totalFee - parentStudent.paidFee).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Paid: ₹{parentStudent.paidFee.toLocaleString("en-IN")} / ₹
                        {parentStudent.totalFee.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {parentStudent.totalFee - parentStudent.paidFee > 0 && (
                        <button
                          type="button"
                          onClick={() => openOnlinePaymentModal(parentStudent)}
                          className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                        >
                          Pay Fee Online
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setReceiptStudent(parentStudent)}
                        className="px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Try a valid Student ID such as <strong>JMCT-SC-101</strong>,{" "}
                    <strong>JMCT-PH-204</strong>, or <strong>JMCT-PO-309</strong>.
                  </p>
                )}
              </div>

              {parentStudent && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-base text-slate-900">
                      Fee Payment History — {parentStudent.name} ({parentPayments.length})
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">{parentStudent.id}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {parentPayments.length === 0 ? (
                      <p className="p-6 text-xs text-slate-500">
                        No recorded online transactions yet for this student ID.
                      </p>
                    ) : (
                      parentPayments.map((p) => (
                        <div
                          key={p.txnId}
                          className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-mono font-bold text-indigo-700">{p.txnId}</p>
                            <p className="text-slate-600 mt-0.5">
                              Mode: <strong>{p.method}</strong>
                              {p.upiId ? ` (${p.upiId})` : ""} • {p.paidAt}
                            </p>
                          </div>
                          <span className="font-black text-emerald-700 text-sm tabular-nums">
                            + ₹{p.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. QUESTION BANK */}
          {roleTab === "qbank" && (
            <>
              {!hasCoordinatorPermission ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-2xs max-w-lg mx-auto space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">
                      QUESTION BANK • COORDINATOR PERMISSION REQUIRED
                    </span>
                    <h2 className="text-xl font-black text-slate-900">
                      Question Bank Access Restricted to Coordinators
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Only permitted Coordinators can open, edit, and print the{" "}
                      <strong>Question Bank</strong>. Teachers upload questions by Wing, Class,
                      and Academic Year from the <strong>02 • TEACHERS</strong> tab.
                    </p>
                  </div>

                  {coordAuthError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                      ⚠ {coordAuthError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyCoordinatorPermission} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Coordinator Permission Code
                      </label>
                      <input
                        required
                        type="password"
                        value={coordPasscodeInput}
                        onChange={(e) => setCoordPasscodeInput(e.target.value)}
                        placeholder="Enter Coordinator Passcode"
                        className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                    >
                      Verify Coordinator Permission →
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 print:hidden">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                        QUESTION BANK • COORDINATOR PERMISSION GRANTED • EDIT & PRINT
                      </span>
                      <h2 className="font-black text-lg text-slate-900">
                        Question Bank ({visibleQuestions.length} Questions •{" "}
                        {selectedPaperQuestions.length} Selected / {totalPaperMarks} Marks)
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={qClassFilter}
                        onChange={(e) => setQClassFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                      >
                        <option value="All">All Classes</option>
                        {availableQuestionClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>

                      <select
                        value={qYearFilter}
                        onChange={(e) => setQYearFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                      >
                        <option value="All">All Years</option>
                        {ACADEMIC_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            Year {yr}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowPaperPreview((v) => !v)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold cursor-pointer"
                      >
                        {showPaperPreview ? "Back to Edit List" : "Preview & Edit Paper"}
                      </button>

                      {showPaperPreview && (
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold cursor-pointer"
                        >
                          Print / Save PDF
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setHasCoordinatorPermission(false);
                          setShowPaperPreview(false);
                          setEditingQuestion(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold cursor-pointer"
                      >
                        Lock
                      </button>
                    </div>
                  </div>

                  {showPaperPreview ? (
                    <div className="p-6 space-y-5 bg-slate-50/60 print:bg-white print:p-2">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 grid sm:grid-cols-3 gap-3 print:hidden">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            Exam / Paper Title
                          </label>
                          <input
                            type="text"
                            value={paperTitle}
                            onChange={(e) => setPaperTitle(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            Time Duration
                          </label>
                          <input
                            type="text"
                            value={paperDuration}
                            onChange={(e) => setPaperDuration(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">
                            Paper Instructions
                          </label>
                          <input
                            type="text"
                            value={paperInstructions}
                            onChange={(e) => setPaperInstructions(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-300 space-y-4 print:border-none print:p-0">
                        <div className="border-b-2 border-slate-800 pb-3 text-center space-y-1">
                          <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                            JMCT GROUP OF INSTITUTIONS, NASHIK
                          </p>
                          <h3 className="text-lg font-black text-slate-900">{paperTitle}</h3>
                          <p className="text-xs font-bold text-slate-600">
                            Wing: {wingFilter} • Class: {qClassFilter} • Academic Year:{" "}
                            {qYearFilter}
                          </p>
                          <div className="flex justify-between text-xs font-extrabold text-slate-800 pt-2">
                            <span>Time: {paperDuration}</span>
                            <span>Max Marks: {totalPaperMarks}</span>
                          </div>
                          <p className="text-[11px] italic text-slate-600 text-left pt-1">
                            Note: {paperInstructions}
                          </p>
                        </div>

                        {selectedPaperQuestions.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-6">
                            No questions selected for this paper. Go back and tick &ldquo;Include in
                            Paper&rdquo; on the required questions.
                          </p>
                        ) : (
                          <ol className="list-decimal pl-5 space-y-4 text-sm">
                            {selectedPaperQuestions.map((q) => (
                              <li key={q.id} className="font-semibold text-slate-900">
                                <div className="flex justify-between gap-4">
                                  <span>{q.questionText}</span>
                                  <span className="font-black text-slate-900 whitespace-nowrap">
                                    [{q.marks} Marks]
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal print:hidden">
                                  {q.wing} • {q.className} • Year {q.academicYear} • {q.subject} (
                                  {q.unit}) • Uploaded by {q.uploadedBy}
                                </p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {visibleQuestions.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          No questions match the selected Wing, Class, or Academic Year filter.
                        </div>
                      ) : (
                        visibleQuestions.map((q) => {
                          const isIncluded = q.includedInPaper !== false;
                          return (
                            <div
                              key={q.id}
                              className={`px-6 py-4 space-y-2 transition ${
                                isIncluded ? "hover:bg-slate-50/70" : "bg-slate-50/60 opacity-75"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isIncluded}
                                      onChange={() => handleToggleIncludeInPaper(q.id)}
                                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                    />
                                    <span>Include in Paper</span>
                                  </label>
                                  <span className="text-xs font-extrabold text-indigo-700">
                                    • {q.id} • {q.wing} • {q.className} • Year {q.academicYear} •{" "}
                                    {q.subject} ({q.unit})
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                                    {q.marks} Marks
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestion({ ...q })}
                                    className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-slate-800">
                                {q.questionText}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Uploaded by: <strong>{q.uploadedBy}</strong>
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 7. TIMETABLE DESK */}
          {roleTab === "timetable" && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddTimetableSlot}
                className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  PERIOD & LAB ROSTER
                </span>
                <h2 className="text-lg font-black text-slate-900">+ Add Timetable Slot</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Wing</label>
                    <select
                      value={ttWing}
                      onChange={(e) => {
                        const w = e.target.value as Wing;
                        setTtWing(w);
                        setTtClass(WING_COURSES[w][0]);
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="School">School</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Polytechnic">Polytechnic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Day</label>
                    <select
                      value={ttDay}
                      onChange={(e) => setTtDay(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Class / Course</label>
                  <select
                    value={ttClass}
                    onChange={(e) => setTtClass(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  >
                    {WING_COURSES[ttWing].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Time Slot</label>
                    <input
                      required
                      type="text"
                      value={ttTiming}
                      onChange={(e) => setTtTiming(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Room / Lab</label>
                    <input
                      type="text"
                      value={ttRoom}
                      onChange={(e) => setTtRoom(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Subject / Lab Name</label>
                  <input
                    required
                    type="text"
                    value={ttSubject}
                    onChange={(e) => setTtSubject(e.target.value)}
                    placeholder="e.g. Organic Chemistry / Physics"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Faculty Name</label>
                  <input
                    type="text"
                    value={ttFaculty}
                    onChange={(e) => setTtFaculty(e.target.value)}
                    placeholder="e.g. Prof. Rajesh Deshmukh"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                >
                  Add Period to Timetable
                </button>
              </form>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-900">
                    Class & Lab Timetable ({visibleTimetable.length} Slots)
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">Wing: {wingFilter}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleTimetable.map((slot) => (
                    <div
                      key={slot.id}
                      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                            {slot.wing} • {slot.day}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{slot.timing}</span>
                          <span className="text-xs font-semibold text-slate-500">
                            • {slot.roomOrLab}
                          </span>
                        </div>
                        <p className="font-extrabold text-slate-900 text-sm">{slot.subject}</p>
                        <p className="text-xs text-slate-500">
                          {slot.className} • Faculty: <strong>{slot.faculty}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTimetableSlots((prev) => prev.filter((item) => item.id !== slot.id))
                        }
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 8. HOMEWORK DESK */}
          {roleTab === "homework" && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddHomework}
                className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  DAILY ASSIGNMENTS
                </span>
                <h2 className="text-lg font-black text-slate-900">+ Assign New Homework</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Wing</label>
                    <select
                      value={hwWing}
                      onChange={(e) => {
                        const w = e.target.value as Wing;
                        setHwWing(w);
                        setHwClass(WING_COURSES[w][0]);
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="School">School</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Polytechnic">Polytechnic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={hwDueDate}
                      onChange={(e) => setHwDueDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Class / Course</label>
                  <select
                    value={hwClass}
                    onChange={(e) => setHwClass(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  >
                    {WING_COURSES[hwWing].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Subject</label>
                    <input
                      required
                      type="text"
                      value={hwSubject}
                      onChange={(e) => setHwSubject(e.target.value)}
                      placeholder="e.g. Science"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Assigned By</label>
                    <input
                      type="text"
                      value={hwAssignedBy}
                      onChange={(e) => setHwAssignedBy(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Homework Task / Topic</label>
                  <textarea
                    required
                    rows={3}
                    value={hwTitle}
                    onChange={(e) => setHwTitle(e.target.value)}
                    placeholder="Enter assignment details for students..."
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                >
                  Publish Homework
                </button>
              </form>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-900">
                    Homework & Assignment Tracker ({visibleHomework.length})
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">Wing: {wingFilter}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleHomework.map((hw) => (
                    <div
                      key={hw.id}
                      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">{hw.id}</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                            {hw.wing} • {hw.subject}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            Due: {hw.dueDate}
                          </span>
                        </div>
                        <p className="font-extrabold text-slate-900 text-sm">{hw.title}</p>
                        <p className="text-xs text-slate-500">
                          {hw.className} • Assigned by: <strong>{hw.assignedBy}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setHomeworkList((prev) =>
                            prev.map((item) =>
                              item.id === hw.id ? { ...item, completed: !item.completed } : item
                            )
                          )
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                          hw.completed
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                        }`}
                      >
                        {hw.completed ? "✓ Completed" : "Mark Completed"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. INVENTORY DESK */}
          {roleTab === "inventory" && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddInventoryItem}
                className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  LAB & CAMPUS STOCK
                </span>
                <h2 className="text-lg font-black text-slate-900">+ Add Inventory Item</h2>

                <div>
                  <label className="text-xs font-bold text-slate-700">Item Name</label>
                  <input
                    required
                    type="text"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="e.g. Measuring Cylinder 100ml"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Wing</label>
                    <select
                      value={invWing}
                      onChange={(e) => setInvWing(e.target.value as Wing)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="School">School</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Polytechnic">Polytechnic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Category</label>
                    <input
                      type="text"
                      value={invCategory}
                      onChange={(e) => setInvCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Qty</label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={invQty}
                      onChange={(e) => setInvQty(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Unit</label>
                    <input
                      type="text"
                      value={invUnit}
                      onChange={(e) => setInvUnit(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Status</label>
                    <select
                      value={invStatus}
                      onChange={(e) =>
                        setInvStatus(e.target.value as InventoryItem["status"])
                      }
                      className="w-full mt-1 px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="Available">Available</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                >
                  Save to Inventory
                </button>
              </form>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-900">
                    Inventory & Lab Stock Register ({visibleInventory.length})
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">Wing: {wingFilter}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleInventory.map((inv) => (
                    <div
                      key={inv.id}
                      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">{inv.id}</span>
                          <span className="font-extrabold text-slate-900">{inv.itemName}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {inv.wing} • {inv.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 tabular-nums">
                          Stock Available: <strong>{inv.quantity}</strong> {inv.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setInventoryList((prev) =>
                            prev.map((item) =>
                              item.id === inv.id
                                ? {
                                    ...item,
                                    status:
                                      item.status === "Available"
                                        ? "Low Stock"
                                        : item.status === "Low Stock"
                                        ? "Out of Stock"
                                        : "Available",
                                  }
                                : item
                            )
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                          inv.status === "Available"
                            ? "bg-emerald-100 text-emerald-800"
                            : inv.status === "Low Stock"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {inv.status} (Cycle)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. HR & STAFF LOG DESK */}
          {roleTab === "hr" && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddHrStaff}
                className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  FACULTY, SUPPORT & GATE STAFF
                </span>
                <h2 className="text-lg font-black text-slate-900">+ Add Staff Record</h2>

                <div>
                  <label className="text-xs font-bold text-slate-700">Staff Full Name</label>
                  <input
                    required
                    type="text"
                    value={hrName}
                    onChange={(e) => setHrName(e.target.value)}
                    placeholder="e.g. Mr. Deepak Pawar"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Designation / Role</label>
                  <input
                    required
                    type="text"
                    value={hrRoleTitle}
                    onChange={(e) => setHrRoleTitle(e.target.value)}
                    placeholder="e.g. Lab Assistant / Clerk"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Wing</label>
                    <select
                      value={hrWing}
                      onChange={(e) => setHrWing(e.target.value as Wing)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="School">School</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Polytechnic">Polytechnic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Mobile No.</label>
                    <input
                      type="tel"
                      value={hrPhone}
                      onChange={(e) => setHrPhone(e.target.value)}
                      placeholder="98230XXXXX"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Shift Timing</label>
                  <input
                    type="text"
                    value={hrShift}
                    onChange={(e) => setHrShift(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                >
                  Add to HR & Staff Log
                </button>
              </form>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-900">
                    HR & Staff Attendance Log ({visibleHrStaff.length})
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">Wing: {wingFilter}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleHrStaff.map((st) => (
                    <div
                      key={st.id}
                      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">{st.id}</span>
                          <span className="font-extrabold text-slate-900">{st.name}</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                            {st.wing}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">{st.roleTitle}</p>
                        <p className="text-xs text-slate-500">
                          Shift: {st.shift} • Phone: {st.phone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setHrStaffList((prev) =>
                            prev.map((item) =>
                              item.id === st.id
                                ? {
                                    ...item,
                                    status:
                                      item.status === "On Duty"
                                        ? "On Leave"
                                        : item.status === "On Leave"
                                        ? "Shift Completed"
                                        : "On Duty",
                                  }
                                : item
                            )
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                          st.status === "On Duty"
                            ? "bg-emerald-100 text-emerald-800"
                            : st.status === "On Leave"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {st.status}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 11. NOTIFICATIONS DESK */}
          {roleTab === "notifications" && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddNotification}
                className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  CAMPUS ALERTS & CIRCULARS
                </span>
                <h2 className="text-lg font-black text-slate-900">+ Post New Notification</h2>

                <div>
                  <label className="text-xs font-bold text-slate-700">Alert Title</label>
                  <input
                    required
                    type="text"
                    value={notTitle}
                    onChange={(e) => setNotTitle(e.target.value)}
                    placeholder="e.g. Lab Practical Schedule Updated"
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Wing</label>
                    <select
                      value={notWing}
                      onChange={(e) => setNotWing(e.target.value as Wing | "All")}
                      className="w-full mt-1 px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="All">All Wings</option>
                      <option value="School">School</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Polytechnic">Polytechnic</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Audience</label>
                    <select
                      value={notAudience}
                      onChange={(e) =>
                        setNotAudience(e.target.value as CampusNotification["audience"])
                      }
                      className="w-full mt-1 px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="All">All</option>
                      <option value="Students">Students</option>
                      <option value="Parents">Parents</option>
                      <option value="Faculty & Staff">Faculty & Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Type</label>
                    <select
                      value={notCategory}
                      onChange={(e) =>
                        setNotCategory(e.target.value as CampusNotification["category"])
                      }
                      className="w-full mt-1 px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                    >
                      <option value="Fee Alert">Fee Alert</option>
                      <option value="Attendance">Attendance</option>
                      <option value="Exam & Q-Bank">Exam & Q-Bank</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Message</label>
                  <textarea
                    required
                    rows={3}
                    value={notMessage}
                    onChange={(e) => setNotMessage(e.target.value)}
                    placeholder="Enter notice details..."
                    className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm cursor-pointer transition"
                >
                  Publish Notification
                </button>
              </form>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-900">
                    Active Notifications & Alerts ({visibleNotifications.length})
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">Wing: {wingFilter}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleNotifications.map((nt) => (
                    <div key={nt.id} className="px-6 py-4 space-y-1 hover:bg-slate-50/70">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold">
                            {nt.category}
                          </span>
                          <span className="text-xs font-bold text-indigo-700">
                            {nt.wing} • For: {nt.audience}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {nt.dateLabel}
                        </span>
                      </div>
                      <p className="font-extrabold text-slate-900 text-sm">{nt.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{nt.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COORDINATOR QUESTION EDIT MODAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={handleSaveEditedQuestion}
            className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  COORDINATOR PAPER EDITOR • {editingQuestion.id}
                </p>
                <h3 className="text-lg font-black text-slate-900">Edit Question Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Wing</label>
                <select
                  value={editingQuestion.wing}
                  onChange={(e) => {
                    const nextWing = e.target.value as Wing;
                    setEditingQuestion({
                      ...editingQuestion,
                      wing: nextWing,
                      className: WING_COURSES[nextWing][0],
                    });
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                >
                  <option value="School">School (CBSE)</option>
                  <option value="Pharmacy">Pharmacy (PCI)</option>
                  <option value="Polytechnic">Polytechnic (MSBTE)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Academic Year</label>
                <select
                  value={editingQuestion.academicYear}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, academicYear: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                >
                  {ACADEMIC_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Class / Course</label>
              <select
                value={editingQuestion.className}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, className: e.target.value })
                }
                className="w-full mt-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
              >
                {WING_COURSES[editingQuestion.wing].map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Subject</label>
                <input
                  required
                  type="text"
                  value={editingQuestion.subject}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, subject: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Unit</label>
                <input
                  type="text"
                  value={editingQuestion.unit}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, unit: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Marks</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={editingQuestion.marks}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      marks: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Question Text</label>
              <textarea
                required
                rows={4}
                value={editingQuestion.questionText}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                }
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-extrabold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
              >
                Save Question Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PORTAL LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={handleLoginSubmit}
            className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-7 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900">JMCT Role Login</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apna role chunein aur dedicated portal/desk kholein
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                ⚠ {loginError}
              </div>
            )}

            <div>
              <label className="text-[11px] font-extrabold uppercase text-slate-500">
                Account Role
              </label>
              <select
                value={loginRole}
                onChange={(e) => handleLoginRoleChange(e.target.value as AccountRole)}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-slate-50"
              >
                <option value="student">Student (Dedicated Student Portal)</option>
                <option value="parent">Parent (Ward Status & Fee Pay)</option>
                <option value="admin">Admin (Admissions & ERP)</option>
                <option value="teacher">Teacher (Attendance & Q-Upload)</option>
                <option value="coordinator">Coordinator (Question Bank Permission)</option>
                <option value="peon">Peon / Support Staff (Duty Roster)</option>
                <option value="guard">Security Guard (Gate Pass)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-extrabold uppercase text-slate-500">
                {loginRole === "student" || loginRole === "parent"
                  ? "Student Roll ID"
                  : "Institutional Email / ID"}
              </label>
              <input
                required
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
              />
            </div>

            {loginRole === "coordinator" ? (
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-500">
                  Coordinator Permission Code
                </label>
                <input
                  required
                  type="password"
                  value={loginCoordCode}
                  onChange={(e) => setLoginCoordCode(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-500">
                  Password
                </label>
                <input
                  required
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm cursor-pointer"
            >
              Sign In to Role Workspace →
            </button>
          </form>
        </div>
      )}

      {/* ONLINE FEE PAYMENT MODAL */}
      {payingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 print:hidden">
          <form
            onSubmit={handlePayFormSubmit}
            className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  JMCT FEE GATEWAY • {payingStudent.id}
                </p>
                <h3 className="text-xl font-black text-slate-900">Pay Student Fee Online</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {payingStudent.name} • {payingStudent.wing} ({payingStudent.course})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayingStudent(null);
                  setPayError("");
                  setPaymentConfirmed(false);
                }}
                className="text-slate-400 hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">Pending Fee Balance:</span>
              <span className="text-base font-black text-rose-600 tabular-nums">
                ₹{modalDue.toLocaleString("en-IN")}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Payment Amount (₹)</label>
              <input
                required
                type="number"
                min={1}
                max={modalDue}
                value={payAmount}
                onChange={(e) => {
                  setPayAmount(e.target.value);
                  setPayError("");
                }}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-black tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Payment Method</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["UPI", "Card", "NetBanking"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPayMethod(mode);
                      setPayError("");
                    }}
                    className={`py-2 rounded-xl text-xs font-extrabold border cursor-pointer transition ${
                      payMethod === mode
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {mode === "NetBanking" ? "Net Banking" : mode}
                  </button>
                ))}
              </div>
            </div>

            {payMethod === "UPI" && (
              <div>
                <label className="text-xs font-bold text-slate-700">Payer UPI ID</label>
                <input
                  required
                  type="text"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setPayError("");
                  }}
                  placeholder="name@upi"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-semibold"
                />
              </div>
            )}

            {payError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {payError}
              </p>
            )}

            {paymentConfirmed && (
              <div className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5 space-y-2">
                <p>
                  Kya aap ₹{Number(payAmount).toLocaleString("en-IN")} ({payMethod}) ka payment
                  confirm karna chahte hain?
                </p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black cursor-pointer"
                  >
                    Haan, Confirm karo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentConfirmed(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!paymentConfirmed && (
              <button
                type="submit"
                disabled={isProcessingPay}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm cursor-pointer transition disabled:opacity-60 tabular-nums"
              >
                {isProcessingPay
                  ? "Processing Payment..."
                  : `Pay ₹${(Number(payAmount) || 0).toLocaleString("en-IN")} & Generate Receipt`}
              </button>
            )}
          </form>
        </div>
      )}

      {/* PRINTABLE FEE RECEIPT MODAL */}
      {receiptStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:max-w-none print:rounded-none">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  JMCT GROUP OF INSTITUTIONS, NASHIK
                </p>
                <h3 className="text-xl font-black text-slate-900">Official Fee Receipt</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {receiptStudent.wing} • {receiptStudent.course}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptStudent(null)}
                className="text-slate-400 hover:text-slate-900 font-bold cursor-pointer print:hidden"
              >
                ✕
              </button>
            </div>

            {lastPaymentMeta && lastPaymentMeta.studentId === receiptStudent.id && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-0.5">
                <p className="font-black">✓ Latest Online Payment Recorded</p>
                <p className="font-mono text-[11px]">
                  Txn ID: {lastPaymentMeta.txnId} • {lastPaymentMeta.method}
                </p>
                <p className="text-[11px]">{lastPaymentMeta.paidAt}</p>
              </div>
            )}

            <div className="py-4 space-y-2.5 text-sm border-b border-slate-200 tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-500">Roll ID</span>
                <span className="font-mono font-bold text-slate-900">{receiptStudent.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name</span>
                <span className="font-bold text-slate-900">{receiptStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile</span>
                <span className="font-semibold text-slate-800">{receiptStudent.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Attendance</span>
                <span className="font-bold text-slate-800">
                  {receiptStudent.presentDays}/{receiptStudent.totalDays} days (
                  {Math.round((receiptStudent.presentDays / receiptStudent.totalDays) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Annual Fee</span>
                <span className="font-bold text-slate-900">
                  ₹{receiptStudent.totalFee.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-extrabold text-emerald-700">
                  ₹{receiptStudent.paidFee.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 text-base">
                <span className="font-black text-slate-900">Balance Due</span>
                <span className="font-black text-rose-600">
                  ₹{Math.max(0, receiptStudent.totalFee - receiptStudent.paidFee).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-5 flex gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer"
              >
                Download / Print PDF Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceiptStudent(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}