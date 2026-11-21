import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JMCT Campus OS | School, Pharmacy & Polytechnic ERP Platform — Nashik",
  description:
    "Unified ERP & Campus Management System for JMCT International School (CBSE), JMCT College of Pharmacy (PCI), and JMCT Polytechnic College (MSBTE).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="antialiased bg-white text-slate-900">{children}</body>
    </html>
  );
}