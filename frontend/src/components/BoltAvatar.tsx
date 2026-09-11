import React from 'react';

interface BoltAvatarProps {
  isThinking?: boolean;
  statusText?: string;
}

export const BoltAvatar: React.FC<BoltAvatarProps> = ({
  isThinking = false,
  statusText = 'Standby'
}) => {
  return (
    <div className="relative w-full h-44 sm:h-52 bg-gradient-to-b from-[#EBF3FC] to-[#F4F8FD] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-3 border border-blue-100 shadow-inner">
      {/* Background Node / Constellation Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="20%" cy="30%" r="3" fill="#2563EB" opacity="0.6" />
        <circle cx="80%" cy="40%" r="4" fill="#2563EB" opacity="0.6" />
        <circle cx="70%" cy="80%" r="2.5" fill="#2563EB" opacity="0.5" />
        <circle cx="30%" cy="75%" r="3.5" fill="#2563EB" opacity="0.5" />
        <line x1="20%" y1="30%" x2="45%" y2="40%" stroke="#2563EB" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
        <line x1="80%" y1="40%" x2="55%" y2="45%" stroke="#2563EB" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
        <line x1="70%" y1="80%" x2="50%" y2="70%" stroke="#2563EB" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
      </svg>

      {/* 3D-styled Animated Robot Character (Bolt) */}
      <div className={`relative flex flex-col items-center select-none transition-transform duration-500 ${isThinking ? 'scale-105' : 'hover:scale-102'}`}>
        
        {/* Soft Ambient Floating Shadow */}
        <div className="w-24 h-4 bg-blue-900/10 rounded-[100%] blur-sm mt-3 animate-pulse"></div>

        {/* Floating Container with subtle up-down levitation */}
        <div className="absolute -top-3 flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
          
          {/* Head */}
          <div className="relative w-28 h-20 bg-gradient-to-b from-white via-slate-100 to-slate-200 rounded-[34px] shadow-lg flex items-center justify-center border-2 border-white/80">
            {/* Ear Nodes */}
            <div className="absolute -left-2.5 w-3.5 h-6 bg-slate-300 rounded-full border border-slate-200 shadow-sm"></div>
            <div className="absolute -right-2.5 w-3.5 h-6 bg-slate-300 rounded-full border border-slate-200 shadow-sm"></div>

            {/* Dark Visor */}
            <div className="w-20 h-11 bg-[#0F172A] rounded-[20px] flex items-center justify-center gap-3.5 shadow-inner px-2">
              {/* Glowing Eyes */}
              <div
                className={`w-3.5 h-6 bg-[#38BDF8] rounded-full shadow-[0_0_12px_#38bdf8] transition-all duration-300 ${
                  isThinking ? 'h-3.5 bg-amber-400 shadow-[0_0_15px_#f59e0b]' : 'animate-pulse'
                }`}
              ></div>
              <div
                className={`w-3.5 h-6 bg-[#38BDF8] rounded-full shadow-[0_0_12px_#38bdf8] transition-all duration-300 ${
                  isThinking ? 'h-3.5 bg-amber-400 shadow-[0_0_15px_#f59e0b]' : 'animate-pulse'
                }`}
              ></div>
            </div>

            {/* Head highlight shine */}
            <div className="absolute top-1.5 left-4 w-12 h-2.5 bg-white/70 rounded-full blur-[1px]"></div>
          </div>

          {/* Torso & Hand Waving */}
          <div className="relative -mt-1.5 flex items-center justify-center">
            {/* Torso Cup/Chassis */}
            <div className="w-14 h-11 bg-gradient-to-b from-slate-100 to-slate-300 rounded-b-3xl border-t border-slate-200 shadow-md"></div>
            
            {/* Left Arm */}
            <div className="absolute -left-3.5 top-0 w-3 h-7 bg-slate-200 rounded-full transform -rotate-12"></div>

            {/* Right Arm (Waving) */}
            <div className="absolute -right-4 -top-2 w-3.5 h-8 bg-slate-200 rounded-full transform rotate-45 origin-bottom shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Name and Role Title */}
      <div className="absolute bottom-2 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-blue-200 shadow-sm text-xs">
        <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
        <span className="font-bold text-slate-800">Bolt</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600 font-medium text-[11px]">{isThinking ? 'Processing Tool...' : statusText}</span>
      </div>
    </div>
  );
};
