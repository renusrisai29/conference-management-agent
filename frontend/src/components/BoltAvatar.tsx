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
    <div
      className="relative w-full rounded-[22px] border border-blue-200/70 p-5 sm:p-6 flex flex-col items-center justify-center shadow-[0_6px_24px_rgba(14,116,144,0.06)] overflow-hidden select-none"
      style={{
        background: 'linear-gradient(145deg, #dbeafe 0%, #e0f2fe 50%, #eff6ff 100%)'
      }}
    >
      {/* Robot Image Box: Enlarged matching approved preview (352px x 236px) */}
      <div
        className="relative z-10 w-full max-w-[352px] h-[220px] sm:h-[236px] rounded-[18px] overflow-hidden bg-white mb-4 flex items-center justify-center transition-all duration-300"
        style={{
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.95)'
        }}
      >
        <img
          src={boltRobotImg}
          alt="Bolt Robot"
          className="w-full h-full object-cover select-none block"
          style={{
            objectPosition: '50% 48%',
            transform: 'scale(1.18)',
            imageRendering: '-webkit-optimize-contrast'
          }}
        />
      </div>

      {/* Status Label: 🟢 Bolt · Online & Listening */}
      <div className="relative z-10 inline-flex items-center gap-2 bg-white border border-slate-300/80 rounded-full px-3.5 py-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
        <span
          className={`w-2 h-2 rounded-full ${isThinking ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}
          style={{
            boxShadow: isThinking ? '0 0 6px #f59e0b' : '0 0 6px #22c55e'
          }}
        />
        <span className="text-[13px] font-bold text-slate-900">Bolt</span>
        <span className="text-slate-400 text-xs font-semibold">•</span>
        <span className="text-[13px] font-medium text-slate-600">
          {isThinking ? 'Processing...' : statusText}
        </span>
      </div>
    </div>
  );
};

