import React from 'react';
import boltRobotImg from '../assets/bolt_robot.jpg';

interface BoltAvatarProps {
  isThinking?: boolean;
  statusText?: string;
}

export const BoltAvatar: React.FC<BoltAvatarProps> = ({
  isThinking = false,
  statusText = 'Online & Listening'
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

      {/* Approved Bolt Robot from Preview */}
      <div
        className="relative flex flex-col items-center justify-center -mt-3 sm:-mt-4 z-10"
        style={{
          animation: 'bolt-breathe 4.5s ease-in-out infinite'
        }}
      >
        {/* Ambient Blue Eye Glow Enhancement */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: '100px',
            height: '60px',
            background: isThinking
              ? 'radial-gradient(ellipse, rgba(245, 158, 11, 0.45) 0%, rgba(251, 191, 36, 0.2) 50%, transparent 75%)'
              : 'radial-gradient(ellipse, rgba(56, 189, 248, 0.45) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 75%)',
            top: '26%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(12px)',
            zIndex: 1,
            animation: 'eye-pulse 3s ease-in-out infinite alternate'
          }}
        />

        {/* Robot Image Frame (Spotlight view style from approved preview) */}
        <div
          className="relative z-10 w-44 sm:w-52 h-32 sm:h-38 rounded-2xl overflow-hidden shadow-md shadow-sky-500/10 border border-white/90"
          style={{
            background: 'radial-gradient(circle at center, #ffffff 40%, #e0f2fe 100%)',
            boxShadow: '0 10px 25px -6px rgba(2, 132, 199, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.9)'
          }}
        >
          <img
            src={boltRobotImg}
            alt="Bolt AI Assistant"
            className="w-full h-full object-cover select-none"
            style={{
              objectPosition: '50% 48%',
              transform: 'scale(1.22)',
              imageRendering: '-webkit-optimize-contrast'
            }}
          />
        </div>

        {/* Soft Contact Shadow underneath */}
        <div
          className="w-28 sm:w-32 h-2 rounded-full -mt-1 filter blur-[3px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(15, 23, 42, 0.25) 0%, rgba(2, 132, 199, 0.12) 40%, transparent 75%)',
            animation: 'shadow-pulse 4.5s ease-in-out infinite'
          }}
        />
      </div>

      {/* Floating & Pulse Animation Keyframes */}
      <style>{`
        @keyframes bolt-breathe {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes shadow-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(0.85);
            opacity: 0.3;
          }
        }
        @keyframes eye-pulse {
          0% {
            opacity: 0.45;
            transform: translate(-50%, -50%) scale(0.9);
          }
          100% {
            opacity: 0.85;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }
      `}</style>

      {/* Name and Role Title Pill */}
      <div className="absolute bottom-2 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1 rounded-full border border-blue-200/80 shadow-xs text-xs z-20">
        <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
        <span className="font-bold text-slate-800">Bolt</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600 font-medium text-[11px]">{isThinking ? 'Processing...' : statusText}</span>
      </div>
    </div>
  );
};
