
import React, { useRef, useState, useEffect } from 'react';
import { TileData, UserSettings } from '../types';
import { ArrowLeft, Pin } from 'lucide-react';

interface TileProps {
  data: TileData;
  onClick: (tile: TileData) => void;
  variant?: 'normal' | 'small';
  settings?: UserSettings;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

const Tile: React.FC<TileProps> = ({ 
  data, 
  onClick, 
  variant = 'normal', 
  settings, 
  isPinned, 
  onTogglePin 
}) => {
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTime = useRef<number>(0);
  const animationFrame = useRef<number | null>(null);

  // Constants
  const isHighContrast = settings?.accessibility?.highContrast;
  const isDwellMode = settings?.accessibility?.mode === 'dwell';
  const dwellTime = settings?.accessibility?.dwellTime || 1000;
  const gridGap = settings?.accessibility?.gridGap || 0;
  const clickHoldTime = settings?.accessibility?.clickHoldTime || 0;
  const speakOnHover = settings?.accessibility?.speakOnHover || false;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  const handleMouseEnter = () => {
    // Auditory Hover
    if (speakOnHover && 'speechSynthesis' in window) {
      // Use browser TTS for quick hover feedback (Gemini is too slow for hover)
      const u = new SpeechSynthesisUtterance(data.label);
      u.rate = 1.2;
      window.speechSynthesis.cancel(); // Stop previous
      window.speechSynthesis.speak(u);
    }

    // Dwell Logic
    if (isDwellMode && variant === 'normal') {
      startTime.current = Date.now();
      setDwellProgress(0);

      const updateProgress = () => {
        const elapsed = Date.now() - startTime.current;
        const progress = Math.min((elapsed / dwellTime) * 100, 100);
        setDwellProgress(progress);
        
        if (progress < 100) {
          animationFrame.current = requestAnimationFrame(updateProgress);
        } else {
          // Trigger Click
          handleClick();
          setDwellProgress(0);
        }
      };
      
      animationFrame.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleMouseLeave = () => {
    if (isDwellMode) {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      setDwellProgress(0);
    }
  };

  // Filter click based on Click Hold Time (Tremor filter)
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseDown = () => {
    if (clickHoldTime > 0) {
      setIsPressing(true);
      pressTimer.current = setTimeout(() => {
        setIsPressing(false); // Visual feedback end
        onClick(data);
      }, clickHoldTime);
    }
  };

  const handleMouseUp = () => {
    if (clickHoldTime > 0) {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      setIsPressing(false);
    }
  };

  const handleClick = () => {
    // If hold time is set, ignore normal clicks (rely on MouseDown timer)
    if (clickHoldTime > 0) return;
    onClick(data);
  };

  // --- STYLES ---

  // Base Styles
  let baseClasses = "flex flex-col items-center justify-center rounded-xl shadow-sm transition-all duration-200 active:scale-95 border-b-4 select-none relative overflow-hidden";
  
  // High Contrast Override
  if (isHighContrast) {
    baseClasses = "flex flex-col items-center justify-center rounded-xl border-4 transition-all duration-100 active:scale-95 select-none relative overflow-hidden bg-black border-yellow-400 text-yellow-400 shadow-none";
  }

  // Dynamic Styles based on Settings
  const isCustomSized = variant === 'normal' && settings;
  const tileStyle = isCustomSized ? { height: `${settings.tileSize}px` } : {};
  const textStyle = isCustomSized ? { fontSize: `${settings.textSize}px`, lineHeight: 1.2 } : {};
  
  const emojiStyle = isCustomSized ? { fontSize: `${settings.tileSize * 0.4}px`, lineHeight: 1 } : {}; 
  const imageContainerStyle = isCustomSized ? { width: `${settings.tileSize * 0.55}px`, height: `${settings.tileSize * 0.55}px` } : {};
  const navIconSize = isCustomSized ? Math.max(24, settings.tileSize * 0.3) : 32;

  // Grid Gap Wrapper Style
  const wrapperStyle = variant === 'normal' && gridGap > 0 ? { padding: `${gridGap / 2}px` } : {};

  const contentClass = variant === 'normal' 
    ? "h-full flex flex-col items-center justify-center w-full z-10" 
    : "flex flex-col items-center justify-center h-full w-full z-10";
    
  const contentGap = isCustomSized 
    ? { gap: `${Math.max(4, settings.tileSize * 0.05)}px` } 
    : { gap: '0.5rem' };

  // --- RENDER ---

  // Navigation Tile Render
  if (data.isNavigation && variant === 'normal') {
    return (
      <div style={wrapperStyle} className="w-full h-full">
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`flex flex-col items-center justify-center rounded-xl transition-all duration-200 active:scale-95 w-full group ${!isCustomSized ? 'h-32 md:h-40' : ''} 
            ${isHighContrast 
              ? 'bg-black border-4 border-white text-white hover:bg-slate-900' 
              : 'border-2 border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:border-slate-400 hover:text-slate-700'
            }`}
          style={tileStyle}
          aria-label={data.label}
        >
          {/* Dwell Overlay */}
          {dwellProgress > 0 && (
             <div className="absolute inset-0 bg-blue-500/20 z-0" style={{ height: `${dwellProgress}%`, bottom: 0, top: 'auto', width: '100%', transition: 'none' }} />
          )}

          <div className={`p-3 rounded-full shadow-sm border transition-transform mb-2 z-10
            ${isHighContrast ? 'bg-black border-white text-white group-hover:scale-110' : 'bg-white border-slate-200 group-hover:scale-110'}
          `}>
            <ArrowLeft size={navIconSize} />
          </div>
          <span className={`z-10 ${!isCustomSized ? 'font-bold text-lg' : 'font-bold'}`} style={textStyle}>{data.label}</span>
        </button>
      </div>
    );
  }

  const sizeClasses = variant === 'normal' 
    ? (isCustomSized ? "w-full font-bold" : "h-32 md:h-40 w-full text-lg md:text-xl font-bold")
    : "h-20 w-20 text-sm font-semibold mx-1 shrink-0"; // Small for sentence strip

  const buttonContent = (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={(e) => { handleMouseLeave(); handleMouseUp(); }}
      onMouseEnter={handleMouseEnter}
      className={`${baseClasses} ${sizeClasses} ${!isHighContrast ? data.color : ''} ${!isHighContrast ? 'hover:brightness-95' : 'hover:bg-slate-900'} w-full h-full`}
      style={variant === 'normal' ? tileStyle : undefined}
      aria-label={data.label}
    >
      {/* Dwell / Hold Progress Overlay */}
      {(dwellProgress > 0) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 rotate-[-90deg]" viewBox="0 0 100 100" preserveAspectRatio="none">
           <rect x="0" y="0" width="100" height="100" fill="none" />
           <circle cx="50" cy="50" r="40" stroke="rgba(0,0,0,0.1)" strokeWidth="100" fill="none" />
           <circle cx="50" cy="50" r="20" stroke={isHighContrast ? "yellow" : "#3b82f6"} strokeWidth="100" fill="none" 
             strokeDasharray="300" 
             strokeDashoffset={300 - (300 * dwellProgress) / 100}
             style={{ transition: 'stroke-dashoffset 0ms linear' }}
             opacity="0.3"
           />
        </svg>
      )}
      
      {/* Hold Visual Feedback */}
      {isPressing && (
         <div className="absolute inset-0 bg-black/20 z-20 animate-pulse" />
      )}

      <div className={contentClass} style={contentGap}>
        {data.imageUrl ? (
           <div 
             className={`relative ${variant === 'normal' && !isCustomSized ? 'w-24 h-24 md:w-32 md:h-32' : ''} ${variant === 'small' ? 'w-10 h-10' : ''}`}
             style={variant === 'normal' ? imageContainerStyle : undefined}
           >
             <img 
               src={data.imageUrl} 
               alt={data.label}
               className={`w-full h-full object-contain rounded-lg ${isHighContrast ? 'grayscale contrast-125' : ''}`} 
             />
           </div>
        ) : (
          <span 
            className={`${variant === 'normal' && !isCustomSized ? "text-4xl md:text-6xl" : ""} ${variant === 'small' ? "text-2xl" : ""}`}
            style={variant === 'normal' ? emojiStyle : undefined}
          >
            {data.emoji}
          </span>
        )}
        <span 
          className="leading-tight text-center px-1 break-words w-full"
          style={variant === 'normal' ? textStyle : undefined}
        >
          {data.label}
        </span>
      </div>
    </button>
  );

  // Wrap in Grid Gap Div if normal variant
  const finalContent = variant === 'normal' ? (
    <div style={wrapperStyle} className="w-full h-full relative group">
       {buttonContent}
       {/* Pin Button */}
       {onTogglePin && !data.isNavigation && (
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-20 shadow-sm
              ${isPinned 
                ? (isHighContrast ? 'bg-yellow-400 text-black opacity-100' : 'bg-blue-100 text-blue-600 opacity-100')
                : (isHighContrast ? 'bg-black border border-yellow-400 text-yellow-400 opacity-0 group-hover:opacity-100' : 'bg-white/50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-slate-600')
              }`}
            style={gridGap > 0 ? { top: `${gridGap/2 + 8}px`, right: `${gridGap/2 + 8}px` } : {}}
            title={isPinned ? "Unpin tile" : "Pin tile"}
          >
            <Pin size={16} className={isPinned ? "fill-current" : ""} />
          </button>
       )}
    </div>
  ) : buttonContent;

  return finalContent;
};

export default Tile;
