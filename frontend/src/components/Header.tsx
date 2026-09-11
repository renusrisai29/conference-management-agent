import React from 'react';
import { Role } from '../types';
import { ShieldCheck, Cpu, UserCheck, Activity } from 'lucide-react';
import vignanLogoImg from '../assets/vignan_logo.png';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenIntegrations: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenIntegrations
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      {/* Main Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: VIGNAN'S Institutional Logo Area (Matching Reference Image) */}
        <div className="flex items-center select-none py-1">
          <img
            src={vignanLogoImg}
            alt="VIGNAN'S Foundation for Science, Technology & Research"
            className="h-12 sm:h-14 md:h-[54px] w-auto object-contain block"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>

        {/* Center: CSE PRESENTS & AGENTIC AI HACKATHON Title */}
        <div className="text-center flex-1 px-2">
          <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            CSE PRESENTS
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#0E2A47]">
            AGENTIC AI HACKATHON
          </h1>
          <div className="text-xs sm:text-sm font-semibold text-blue-700 flex items-center justify-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Conference Management Agent
          </div>
        </div>

        {/* Right: Institutional Badges & Role Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Accreditation Badges */}
          <div className="flex items-center gap-1.5 scale-90 sm:scale-100">
            {/* ABET Badge */}
            <div className="border border-slate-300 rounded px-1.5 py-0.5 flex items-center gap-1 bg-slate-50 text-[10px]">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 inline-block"></span>
              <div className="leading-tight">
                <span className="font-bold text-slate-800">ABET</span>
                <span className="block text-[6px] text-slate-500">CSE, EEE, ECE</span>
              </div>
            </div>

            {/* NAAC A+ Badge */}
            <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50 text-[10px] text-center">
              <span className="text-[8px] font-bold text-slate-600 block">NAAC</span>
              <span className="font-black text-[#E31B23] text-xs leading-none">A+</span>
            </div>

            {/* NIRF 70th Rank */}
            <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50 text-[10px] text-center">
              <span className="text-[7px] font-bold text-slate-600 block">NIRF</span>
              <span className="font-black text-[#E31B23] text-xs leading-none">70<sup className="text-[7px]">th</sup></span>
            </div>

            {/* NBA Accredited */}
            <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50 text-[10px] text-center">
              <span className="text-[7px] font-bold text-slate-600 block">NBA</span>
              <span className="font-bold text-blue-800 text-[9px] leading-none">TIER-1</span>
            </div>
          </div>

          {/* Quick Integration Health Button */}
          <button
            onClick={onOpenIntegrations}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Inspect Agent 17, Groq, Supabase, and Payment status"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Integrations</span>
          </button>
        </div>
      </div>

      {/* Persona / Role Selector Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-slate-700">Active Persona / Role:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['CHAIR', 'ORGANIZER', 'REVIEWER', 'AUTHOR', 'PARTICIPANT', 'SESSION_CHAIR', 'ADMIN'] as Role[]).map(role => (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                currentRole === role
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {role === 'CHAIR' && '👑 Chair (Dr. Radhika)'}
              {role === 'ORGANIZER' && '📋 Organizer (Dr. Suresh)'}
              {role === 'REVIEWER' && '🔍 Reviewer (Dr. Holloway)'}
              {role === 'AUTHOR' && '✍️ Author (Prof. Elena)'}
              {role === 'PARTICIPANT' && '🎓 Participant (Kiran)'}
              {role === 'SESSION_CHAIR' && '🎙️ Session Chair (Prof. Sofia)'}
              {role === 'ADMIN' && '⚙️ Admin'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
