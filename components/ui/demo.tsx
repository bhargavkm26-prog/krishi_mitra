"use client";

import React from "react";
import KrishiMitraAiChat from "@/components/ui/krishi-mitra-ai-chat";

export default function DemoPage() {
  return (
    <main className="min-h-screen w-full bg-[#030704] text-white">
      {/* Krishi Mitra AI Chat Component */}
      <section className="flex justify-center items-start w-full">
        <KrishiMitraAiChat />
      </section>

      {/* Institutional Academic Footer */}
      <footer className="text-center text-neutral-500 py-4 border-t border-emerald-950/40 text-xs font-mono">
        © {new Date().getFullYear()} Krishi Mitra • Dept. of Information Science &amp; Engineering, DSCE Bengaluru
      </footer>
    </main>
  );
}
