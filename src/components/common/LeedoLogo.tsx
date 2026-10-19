import React from 'react';

interface LeedoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  lightText?: boolean;
}

export const LeedoLogo: React.FC<LeedoLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  lightText = true,
}) => {
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  }[size];

  const textSizes = {
    sm: { kr: 'text-sm', en: 'text-[11px]' },
    md: { kr: 'text-base', en: 'text-xs' },
    lg: { kr: 'text-2xl', en: 'text-base' },
    xl: { kr: 'text-3xl', en: 'text-lg' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Golden Architectural LD Emblem */}
      <div
        className={`relative ${dimensions} shrink-0 rounded-xl bg-slate-950 p-1 shadow-lg ring-1 ring-amber-400/30 flex items-center justify-center overflow-hidden`}
      >
        <img
          src="/leedo_logo.svg"
          alt="LEEDO Logo"
          className="h-full w-full object-contain filter drop-shadow-[0_2px_4px_rgba(217,169,72,0.4)]"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${textSizes.kr} ${
                lightText ? 'text-white' : 'text-slate-900'
              }`}
            >
              이도
            </span>
            <span className={`font-black tracking-wider text-amber-400 ${textSizes.en}`}>
              LEEDO
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 tracking-tight">
            이도 업무포털
          </span>
        </div>
      )}
    </div>
  );
};
