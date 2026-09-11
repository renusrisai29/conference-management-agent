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
    <div className="relative w-full h-48 sm:h-56 bg-gradient-to-r from-[#F1F6FE] via-[#E4EFFD] to-[#D9EAFB] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-3 border border-blue-100 shadow-inner select-none">
      {/* Background Subtle Technology & Network Constellation Elements */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Left Network Constellation */}
        <g stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.45" fill="#BFDBFE">
          <line x1="12%" y1="28%" x2="22%" y2="45%" strokeDasharray="3,3" />
          <line x1="22%" y1="45%" x2="16%" y2="70%" />
          <line x1="22%" y1="45%" x2="32%" y2="38%" strokeDasharray="2,2" />
          <line x1="16%" y1="70%" x2="28%" y2="82%" />
          <line x1="32%" y1="38%" x2="26%" y2="60%" />

          <circle cx="12%" cy="28%" r="3" fill="#FFFFFF" filter="url(#node-glow)" />
          <circle cx="22%" cy="45%" r="3.5" fill="#DBEAFE" />
          <circle cx="16%" cy="70%" r="2.5" fill="#FFFFFF" />
          <circle cx="32%" cy="38%" r="2" fill="#93C5FD" />
          <circle cx="28%" cy="82%" r="3" fill="#BFDBFE" />
          <circle cx="26%" cy="60%" r="2" fill="#FFFFFF" />
        </g>

        {/* Right Network Constellation */}
        <g stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.45" fill="#BFDBFE">
          <line x1="72%" y1="25%" x2="84%" y2="35%" strokeDasharray="2,2" />
          <line x1="84%" y1="35%" x2="92%" y2="22%" />
          <line x1="84%" y1="35%" x2="78%" y2="58%" />
          <line x1="78%" y1="58%" x2="88%" y2="68%" />
          <line x1="88%" y1="68%" x2="94%" y2="52%" strokeDasharray="3,3" />
          <line x1="78%" y1="58%" x2="70%" y2="78%" />

          <circle cx="72%" cy="25%" r="2.5" fill="#93C5FD" />
          <circle cx="84%" cy="35%" r="4" fill="#FFFFFF" filter="url(#node-glow)" />
          <circle cx="92%" cy="22%" r="2" fill="#BFDBFE" />
          <circle cx="78%" cy="58%" r="3" fill="#DBEAFE" />
          <circle cx="88%" cy="68%" r="3.5" fill="#FFFFFF" />
          <circle cx="94%" cy="52%" r="2.5" fill="#BFDBFE" />
          <circle cx="70%" cy="78%" r="2" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Floating Robot Figure (Matching Reference Image 1) */}
      <div className="relative flex flex-col items-center justify-center -mt-2">
        <svg
          viewBox="0 0 280 240"
          className="w-48 sm:w-56 h-auto drop-shadow-sm transition-transform duration-500"
          style={{
            animation: 'robot-float 3.5s ease-in-out infinite'
          }}
        >
          <defs>
            {/* Robot Head Shading Gradient */}
            <radialGradient id="head-radial" cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#F5F8FA" />
              <stop offset="85%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </radialGradient>

            {/* Specular Highlight on Head */}
            <linearGradient id="head-shine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* Dark Visor Gradient */}
            <linearGradient id="visor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="40%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0B0F17" />
            </linearGradient>

            {/* Glowing Eyes Gradient */}
            <linearGradient id="eye-glow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="60%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>

            {/* Thinking / Alert Eye Gradient */}
            <linearGradient id="eye-thinking-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Eye Glow Filter */}
            <filter id="eye-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Hollow Torso Outer Body Gradient */}
            <radialGradient id="torso-outer" cx="42%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F1F5F9" />
              <stop offset="90%" stopColor="#DDE5ED" />
              <stop offset="100%" stopColor="#C4CFDC" />
            </radialGradient>

            {/* Hollow Torso Inner Cup Opening Rim */}
            <linearGradient id="torso-inner" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="60%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>

            {/* Arms Gradient */}
            <linearGradient id="arm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            {/* Ground Float Shadow Gradient */}
            <radialGradient id="ground-shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#475569" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
            </radialGradient>

            {/* Head Drop Shadow on Torso */}
            <filter id="head-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#0F172A" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Ground Soft Oval Drop Shadow */}
          <ellipse
            cx="138"
            cy="216"
            rx="32"
            ry="7"
            fill="url(#ground-shadow)"
            style={{
              animation: 'shadow-pulse 3.5s ease-in-out infinite'
            }}
          />

          {/* Floating Robot Entity */}
          <g>
            {/* 1. Lower Floating Cup Body (Hollow Bowl / Torso) */}
            <g id="robot-torso">
              {/* Outer Body Bowl */}
              <path
                d="M 104 140
                   C 104 182, 172 182, 172 140
                   C 172 135, 104 135, 104 140 Z"
                fill="url(#torso-outer)"
                stroke="#E2E8F0"
                strokeWidth="0.8"
              />

              {/* Inner Cup Opening Rim (Creates the 3D Hollow Bowl effect from Image 1) */}
              <ellipse
                cx="138"
                cy="140"
                rx="30"
                ry="11"
                fill="url(#torso-inner)"
                stroke="#CBD5E1"
                strokeWidth="0.8"
              />

              {/* Inside Cup Deep Cavity Shade */}
              <ellipse
                cx="138"
                cy="141"
                rx="24"
                ry="7.5"
                fill="#94A3B8"
                fillOpacity="0.35"
              />

              {/* Soft Specular Sheen on Bowl Front */}
              <path
                d="M 112 152
                   C 118 172, 148 174, 158 158
                   C 148 166, 122 164, 112 152 Z"
                fill="#FFFFFF"
                fillOpacity="0.5"
              />
            </g>

            {/* 2. Floating Left Arm (Viewer's Left - Curved down along torso) */}
            <path
              id="robot-left-arm"
              d="M 94 146
                 C 86 156, 86 176, 94 184
                 C 98 188, 102 184, 102 178
                 C 102 166, 99 152, 94 146 Z"
              fill="url(#arm-grad)"
              stroke="#E2E8F0"
              strokeWidth="0.5"
            />

            {/* 3. Floating Right Arm (Viewer's Right - Raised near the temple/ear like Image 1) */}
            <path
              id="robot-right-arm"
              d="M 174 150
                 C 182 140, 188 126, 185 116
                 C 183 111, 177 112, 176 117
                 C 174 128, 170 142, 174 150 Z"
              fill="url(#arm-grad)"
              stroke="#E2E8F0"
              strokeWidth="0.5"
            />

            {/* 4. Robot Head */}
            <g id="robot-head" filter="url(#head-shadow)">
              {/* Left Ear Capsule */}
              <rect
                x="68"
                y="78"
                width="12"
                height="22"
                rx="6"
                fill="#E2E8F0"
                stroke="#CBD5E1"
                strokeWidth="0.5"
              />

              {/* Right Ear Capsule */}
              <rect
                x="196"
                y="78"
                width="12"
                height="22"
                rx="6"
                fill="#E2E8F0"
                stroke="#CBD5E1"
                strokeWidth="0.5"
              />

              {/* Main Smooth Head Capsule */}
              <path
                d="M 76 86
                   C 76 46, 200 46, 200 86
                   C 200 126, 76 126, 76 86 Z"
                fill="url(#head-radial)"
                stroke="#FFFFFF"
                strokeWidth="1"
              />

              {/* Head Top Specular Shine */}
              <path
                d="M 96 56
                   C 114 48, 162 48, 180 56
                   C 160 52, 116 52, 96 56 Z"
                fill="url(#head-shine)"
              />

              {/* Visor Bezel / Recessed Screen Frame */}
              <rect
                x="92"
                y="69"
                width="92"
                height="44"
                rx="20"
                fill="url(#visor-grad)"
                stroke="#334155"
                strokeWidth="0.8"
              />

              {/* Visor Top Glass Highlight */}
              <path
                d="M 96 76
                   C 106 72, 168 72, 178 76
                   C 165 74, 110 74, 96 76 Z"
                fill="#FFFFFF"
                fillOpacity="0.25"
              />

              {/* Left Blue Glowing Eye */}
              <rect
                x="110"
                y="79"
                width="10"
                height="22"
                rx="5"
                fill={isThinking ? 'url(#eye-thinking-grad)' : 'url(#eye-glow-grad)'}
                filter="url(#eye-glow-filter)"
                className={isThinking ? 'animate-ping' : ''}
              />
              <rect
                x="111.5"
                y="81"
                width="4"
                height="10"
                rx="2"
                fill="#E0F2FE"
                fillOpacity="0.7"
              />

              {/* Right Blue Glowing Eye */}
              <rect
                x="156"
                y="79"
                width="10"
                height="22"
                rx="5"
                fill={isThinking ? 'url(#eye-thinking-grad)' : 'url(#eye-glow-grad)'}
                filter="url(#eye-glow-filter)"
                className={isThinking ? 'animate-ping' : ''}
              />
              <rect
                x="157.5"
                y="81"
                width="4"
                height="10"
                rx="2"
                fill="#E0F2FE"
                fillOpacity="0.7"
              />
            </g>
          </g>
        </svg>

        {/* Floating Animation Keyframes */}
        <style>{`
          @keyframes robot-float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }
          @keyframes shadow-pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.45;
            }
            50% {
              transform: scale(0.85);
              opacity: 0.3;
            }
          }
        `}</style>
      </div>

      {/* Name and Role Title Pill */}
      <div className="absolute bottom-2 flex items-center gap-2 bg-white/85 backdrop-blur-md px-3 py-1 rounded-full border border-blue-200/80 shadow-xs text-xs">
        <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
        <span className="font-bold text-slate-800">Bolt</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600 font-medium text-[11px]">{isThinking ? 'Processing...' : statusText}</span>
      </div>
    </div>
  );
};
