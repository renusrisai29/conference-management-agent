import React from 'react';
import { Role } from '../types';
import { UserCheck, Activity } from 'lucide-react';
import vignanLogoImg from '../assets/vignan_logo.png';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenIntegrations: () => void;
}

const ROLES: { id: Role; label: string }[] = [
  { id: 'CHAIR', label: '👑 Chair (Dr. Radhika)' },
  { id: 'ORGANIZER', label: '📋 Organizer (Dr. Suresh)' },
  { id: 'REVIEWER', label: '🔍 Reviewer (Dr. Holloway)' },
  { id: 'AUTHOR', label: '✍️ Author (Prof. Elena)' },
  { id: 'PARTICIPANT', label: '🎓 Participant (Kiran)' },
  { id: 'SESSION_CHAIR', label: '🎙️ Session Chair (Prof. Sofia)' },
  { id: 'ADMIN', label: '⚙️ Admin' },
];

const Badges: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-1.5'}`}>
    {/* ABET Badge */}
    <div className="border border-slate-300 rounded px-1 sm:px-1.5 py-0.5 flex items-center gap-1 bg-slate-50 text-[9px] sm:text-[10px] shrink-0">
      <span className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-amber-600 inline-block shrink-0"></span>
      <div className="leading-tight">
        <span className="font-bold text-slate-800">ABET</span>
        {!isMobile && <span className="block text-[6px] text-slate-500">CSE, EEE, ECE</span>}
      </div>
    </div>

    {/* NAAC A+ Badge */}
    <div className="border border-slate-300 rounded px-1 sm:px-1.5 py-0.5 bg-slate-50 text-[9px] sm:text-[10px] text-center shrink-0">
      <span className="text-[7px] sm:text-[8px] font-bold text-slate-600 block leading-none">NAAC</span>
      <span className="font-black text-[#E31B23] text-[10px] sm:text-xs leading-none">A+</span>
    </div>

    {/* NIRF 70th Rank */}
    <div className="border border-slate-300 rounded px-1 sm:px-1.5 py-0.5 bg-slate-50 text-[9px] sm:text-[10px] text-center shrink-0">
      <span className="text-[6px] sm:text-[7px] font-bold text-slate-600 block leading-none">NIRF</span>
      <span className="font-black text-[#E31B23] text-[10px] sm:text-xs leading-none">70<sup className="text-[6px] sm:text-[7px]">th</sup></span>
    </div>

    {/* NBA Accredited */}
    <div className="border border-slate-300 rounded px-1 sm:px-1.5 py-0.5 bg-slate-50 text-[9px] sm:text-[10px] text-center shrink-0">
      <span className="text-[6px] sm:text-[7px] font-bold text-slate-600 block leading-none">NBA</span>
      <span className="font-bold text-blue-800 text-[8px] sm:text-[9px] leading-none">TIER-1</span>
    </div>
  </div>
);

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenIntegrations
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      {/* 1. Mobile Top Header Bar (< md) - Compact 2-row layout */}
      <div className="md:hidden px-3 py-1.5 flex flex-col gap-1">
        {/* Row 1: Logo + Badges + Integrations Button */}
        <div className="flex items-center justify-between gap-2">
          <img
            src={vignanLogoImg}
            alt="VIGNAN'S"
            className="h-8 sm:h-9 w-auto object-contain select-none shrink-0"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Badges isMobile />
            <button
              onClick={onOpenIntegrations}
              className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
              title="Inspect Agent 17, Groq, Supabase, and Payment status"
            >
              <Activity className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="hidden xs:inline">Health</span>
            </button>
          </div>
        </div>

        {/* Row 2: Title Block */}
        <div className="text-center">
          <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase leading-none">
            CSE PRESENTS
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-[#0E2A47] leading-tight mt-0.5">
            AGENTIC AI HACKATHON
          </h1>
          <div className="text-[10px] sm:text-xs font-semibold text-blue-700 flex items-center justify-center gap-1 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Conference Management Agent
          </div>
        </div>
      </div>

      {/* 2. Desktop Main Top Header Bar (>= md) - Unchanged Layout & Sizing */}
      <div className="hidden md:flex max-w-7xl mx-auto px-6 py-2 items-center justify-between gap-4">
        {/* Left: VIGNAN'S Institutional Logo Area */}
        <div className="flex items-center select-none py-1">
          <img
            src={vignanLogoImg}
            alt="VIGNAN'S Foundation for Science, Technology & Research"
            className="h-[54px] w-auto object-contain block"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>

        {/* Center: CSE PRESENTS & AGENTIC AI HACKATHON Title */}
        <div className="text-center flex-1 px-2">
          <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            CSE PRESENTS
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0E2A47]">
            AGENTIC AI HACKATHON
          </h1>
          <div className="text-xs sm:text-sm font-semibold text-blue-700 flex items-center justify-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Conference Management Agent
          </div>
        </div>

        {/* Right: Institutional Badges & Role Controls */}
        <div className="flex flex-row items-center gap-3">
          <Badges />
          <button
            onClick={onOpenIntegrations}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
            title="Inspect Agent 17, Groq, Supabase, and Payment status"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Integrations</span>
          </button>
        </div>
      </div>

      {/* 3. Mobile Persona / Role Selector Bar (< md) - Compact Horizontally Scrollable Bar */}
      <div className="md:hidden bg-slate-50 border-t border-slate-200 px-2.5 py-1 flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-slate-600 shrink-0">
          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700">Role:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap scroll-smooth flex-1">
          {ROLES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onRoleChange(id)}
              className={`px-2.5 py-0.5 sm:py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition ${
                currentRole === id
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Desktop Persona / Role Selector Bar (>= md) - Unchanged Layout */}
      <div className="hidden md:flex bg-slate-50 border-t border-slate-200 px-6 py-1.5 items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-slate-700">Active Persona / Role:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ROLES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onRoleChange(id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                currentRole === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
