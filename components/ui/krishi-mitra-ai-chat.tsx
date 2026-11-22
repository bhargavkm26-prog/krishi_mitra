"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  Sprout,
  ShieldAlert,
  CreditCard,
  Droplets,
  IdCard,
  Tractor,
  FileText,
  Building2,
  Sparkles,
  User,
  Bot,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

interface ChatMessage {
  id: string;
  sender: "farmer" | "chief_secretary";
  text: string;
  timestamp: string;
}

export default function KrishiMitraAiChat() {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 140,
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Handle local submission (no external API connected yet; ready for integration)
  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "farmer",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversation((prev) => [...prev, userMsg]);
    setMessage("");
    adjustHeight(true);

    // Simulated local Chief Secretary acknowledgement
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "chief_secretary",
        text: `Consultation received regarding: "${trimmed}". The Chief Secretary secretariat is reviewing official Central & Karnataka gazettes, Bhoomi RTC records, and FRUITS FID database. (API integration ready).`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setConversation((prev) => [...prev, replyMsg]);
    }, 600);
  };

  const handleQuickAction = (promptText: string) => {
    setMessage(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#030704] text-white flex flex-col items-center justify-between overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* High-Contrast Emerald Horizon Aura Glow (Matches Landing Page Obsidian Palette) */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Subtle Upper Ambient Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[140px] rounded-full" />
        
        {/* Atmospheric Lower Emerald Horizon Arc */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1100px] h-[480px] rounded-[100%] bg-gradient-to-t from-emerald-600/25 via-emerald-950/20 to-transparent blur-[80px]" />
        
        {/* Fine Radial Contrast Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#030704_85%)]" />
      </div>

      {/* Top Academic Sub-Bar */}
      <header className="relative z-10 w-full max-w-5xl px-6 pt-6 flex items-center justify-between text-xs font-mono text-emerald-400/80 border-b border-emerald-900/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="tracking-wider">COMMUNITY PROJECT (1BCP308) // DEPT. OF ISE, DSCE</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-neutral-400">
          <span>FRUITS &amp; BHOOMI LINKED</span>
          <span>•</span>
          <span className="text-emerald-400">KANNADA &amp; ENGLISH</span>
        </div>
      </header>

      {/* Main Content Area: Centered Header & Optional Conversation Scroll */}
      <div className="relative z-10 flex-1 w-full max-w-3xl px-4 flex flex-col items-center justify-center my-auto py-8">
        
        {conversation.length === 0 ? (
          /* Empty State: Centered Chief Secretary Title & Tagline */
          <div className="text-center transition-all duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-mono tracking-widest uppercase mb-4 shadow-sm shadow-emerald-950/50">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Sovereign Secretariat Consultation
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
              Krishi<span className="text-emerald-400">Mitra</span> AI
            </h1>
            
            {/* Chief Secretary Slogan */}
            <p className="mt-3 text-sm sm:text-base text-neutral-300 max-w-xl mx-auto leading-relaxed">
              Official AI Chief Secretary — Cross-Ministerial Statutory Guidance &amp; Scheme Resolution for Indian &amp; Karnataka Farmers.
            </p>
          </div>
        ) : (
          /* Active Chat Thread View */
          <div className="w-full flex flex-col gap-4 max-h-[50vh] overflow-y-auto px-2 py-4 mb-4 rounded-xl bg-black/40 border border-emerald-950/50 backdrop-blur-md">
            {conversation.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-3 text-sm max-w-[85%] rounded-2xl p-4",
                  msg.sender === "farmer"
                    ? "ml-auto bg-emerald-900/40 text-emerald-100 border border-emerald-600/30 rounded-tr-sm"
                    : "mr-auto bg-[#08190f] text-neutral-200 border border-emerald-500/25 rounded-tl-sm shadow-md"
                )}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {msg.sender === "farmer" ? (
                    <User className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Bot className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="font-mono text-[10px] text-neutral-400 mb-1">
                    {msg.sender === "farmer" ? "Farmer Inquiry" : "Chief Secretary Directive"} • {msg.timestamp}
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}

      </div>

      {/* Input Box Section & Agricultural Quick Actions */}
      <div className="relative z-10 w-full max-w-3xl px-4 pb-10">
        
        {/* Floating High-Contrast Glass Input Capsule */}
        <div className="relative bg-[#061109]/90 backdrop-blur-xl rounded-2xl border border-emerald-500/30 shadow-2xl shadow-emerald-950/50 transition-all focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/50">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the Chief Secretary about schemes, PMFBY claim window, RTC linking, subsidies..."
            className={cn(
              "w-full px-5 py-4 resize-none border-none",
              "bg-transparent text-white text-sm sm:text-base",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-500 min-h-[50px] leading-relaxed"
            )}
            style={{ overflow: "hidden" }}
          />

          {/* Footer Controls (No attachment option, only status & Send button) */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-emerald-950/60 bg-black/20 rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Grounded in Official Gazettes</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                aria-label="Send Inquiry"
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all",
                  message.trim()
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:opacity-90 shadow-md shadow-emerald-500/20 cursor-pointer"
                    : "bg-emerald-950/60 text-neutral-500 border border-emerald-900/30 cursor-not-allowed"
                )}
              >
                <span>Consult</span>
                <ArrowUpIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Action Chips Grounded in Karnataka & Central Agriculture */}
        <div className="flex items-center justify-center flex-wrap gap-2.5 mt-5">
          <QuickAction 
            icon={<Sprout className="w-3.5 h-3.5 text-emerald-400" />} 
            label="PM-KISAN ₹6,000" 
            onClick={() => handleQuickAction("Am I eligible for PM-KISAN ₹6,000 annual installment if I hold 1.8 hectares of dryland?")}
          />
          <QuickAction 
            icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400" />} 
            label="PMFBY 72h Crop Loss" 
            onClick={() => handleQuickAction("What are the mandatory steps to claim PMFBY crop loss within the 72-hour intimation window?")}
          />
          <QuickAction 
            icon={<CreditCard className="w-3.5 h-3.5 text-sky-400" />} 
            label="KCC Crop Loan (4%)" 
            onClick={() => handleQuickAction("How can I apply for a Kisan Credit Card (KCC) crop loan at 4% subvention interest rate?")}
          />
          <QuickAction 
            icon={<Droplets className="w-3.5 h-3.5 text-cyan-400" />} 
            label="Krishi Bhagya Drip Subsidy" 
            onClick={() => handleQuickAction("What is the subsidy percentage for Krishi Bhagya farm ponds and micro-drip irrigation in Karnataka?")}
          />
          <QuickAction 
            icon={<IdCard className="w-3.5 h-3.5 text-emerald-300" />} 
            label="FRUITS FID & RTC Linking" 
            onClick={() => handleQuickAction("How do I link my Bhoomi RTC/Pahani land record with my Karnataka FRUITS Farmer ID (FID)?")}
          />
          <QuickAction 
            icon={<Tractor className="w-3.5 h-3.5 text-orange-400" />} 
            label="Machinery & Tractor Subsidy" 
            onClick={() => handleQuickAction("What subsidies are available for farm mechanization, tractors, and Custom Hiring Centres in Karnataka?")}
          />
          <QuickAction 
            icon={<FileText className="w-3.5 h-3.5 text-yellow-300" />} 
            label="Mandatory Documents Checklist" 
            onClick={() => handleQuickAction("Give me the complete mandatory document checklist before visiting the Taluk or RSK office.")}
          />
          <QuickAction 
            icon={<Building2 className="w-3.5 h-3.5 text-teal-300" />} 
            label="Find Nearest RSK Kendra" 
            onClick={() => handleQuickAction("Where is my nearest Raitha Samparka Kendra (RSK) in Karnataka and what services do they provide?")}
          />
        </div>

      </div>

    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-1.5 h-auto py-1.5 px-3 rounded-full border-emerald-900/60 bg-[#061109]/80 text-neutral-300 hover:text-emerald-200 hover:bg-emerald-950/80 hover:border-emerald-500/50 transition-all text-xs font-normal shadow-sm"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
