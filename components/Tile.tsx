
import React from 'react';
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
  const baseClasses = "flex flex-col items-center justify-center rounded-xl shadow-sm transition-all duration-200 active:scale-95 border-b-4 select-none";
  
  // Dynamic Styles based on Settings (Only applies to 'normal' variant)
  const isCustomSized = variant === 'normal' && settings;
  const tileStyle = isCustomSized ? { height: `${settings.tileSize}px` } : {};
  const textStyle = isCustomSized ? { fontSize: `${settings.textSize}px`, lineHeight: 1.2 } : {};
  
  // Emoji/Image scales with Tile Size (container), Text scales with Text Size setting.
  const emojiStyle = isCustomSized ? { fontSize: `${settings.tileSize * 0.4}px`, lineHeight: 1 } : {}; 
  const imageContainerStyle = isCustomSized ? { width: `${settings.tileSize * 0.55}px`, height: `${settings.tileSize * 0.55}px` } : {};
  const navIconSize = isCustomSized ? Math.max(24, settings.tileSize * 0.3) : 32;

  // Use flex gap instead of margins for cleaner layout logic
  const contentClass = variant === 'normal' 
    ? "h-full flex flex-col items-center justify-center w-full" 
    : "flex flex-col items-center justify-center h-full w-full";
    
  const contentGap = isCustomSized 
    ? { gap: `${Math.max(4, settings.tileSize * 0.05)}px` } 
    : { gap: '0.5rem' };

  // Special rendering for Navigation Tiles (Back Buttons)
  if (data.isNavigation && variant === 'normal') {
    return (
      <button
        onClick={() => onClick(data)}
        className={`flex flex-col items-center justify-center rounded-xl transition-all duration-200 active:scale-95 border-2 border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:border-slate-400 hover:text-slate-700 w-full group ${!isCustomSized ? 'h-32 md:h-40' : ''}`}
        style={tileStyle}
        aria-label={data.label}
      >
        <div className="bg-white p-3 rounded-full shadow-sm border border-slate-200 group-hover:scale-110 transition-transform mb-2">
          <ArrowLeft size={navIconSize} />
        </div>
        <span className={`${!isCustomSized ? 'font-bold text-lg' : 'font-bold'}`} style={textStyle}>{data.label}</span>
      </button>
    );
  }

  const sizeClasses = variant === 'normal' 
    ? (isCustomSized ? "w-full font-bold" : "h-32 md:h-40 w-full text-lg md:text-xl font-bold")
    : "h-20 w-20 text-sm font-semibold mx-1 shrink-0"; // Small for sentence strip

  const buttonContent = (
    <button
      onClick={() => onClick(data)}
      className={`${baseClasses} ${sizeClasses} ${data.color} hover:brightness-95 overflow-hidden w-full h-full`}
      style={variant === 'normal' ? tileStyle : undefined}
      aria-label={data.label}
    >
      <div className={contentClass} style={contentGap}>
        {data.imageUrl ? (
           <div 
             className={`relative ${variant === 'normal' && !isCustomSized ? 'w-24 h-24 md:w-32 md:h-32' : ''} ${variant === 'small' ? 'w-10 h-10' : ''}`}
             style={variant === 'normal' ? imageContainerStyle : undefined}
           >
             <img 
               src={data.imageUrl} 
               alt={data.label}
               className="w-full h-full object-contain rounded-lg" 
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
          className="leading-tight text-slate-800 text-center px-1 break-words w-full"
          style={variant === 'normal' ? textStyle : undefined}
        >
          {data.label}
        </span>
      </div>
    </button>
  );

  // Wrap in a relative div if we need to show the Pin button (only on normal tiles that aren't navigation)
  if (variant === 'normal' && onTogglePin && !data.isNavigation) {
    return (
      <div className="relative w-full h-full group">
        {buttonContent}
        <button 
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-20 shadow-sm
            ${isPinned 
              ? 'bg-blue-100 text-blue-600 opacity-100' 
              : 'bg-white/50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-slate-600'
            }`}
          title={isPinned ? "Unpin tile" : "Pin tile"}
        >
          <Pin size={16} className={isPinned ? "fill-current" : ""} />
        </button>
      </div>
    );
  }

  return buttonContent;
};

export default Tile;
