
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { TileData, UserSettings } from '../types';
import Tile from './Tile';
import { X, Volume2, Save, Wand2, Search, Plus, Keyboard } from 'lucide-react';
import { speakText, refineSentence } from '../services/gemini';
import { VOCABULARY } from '../constants';

interface SentenceStripProps {
  sentence: TileData[];
  onRemove: (index: number) => void;
  onClear: () => void;
  onSave: () => void;
  onAddTile: (tile: TileData) => void;
  isSpeaking: boolean;
  setIsSpeaking: (v: boolean) => void;
  settings: UserSettings;
}

const SentenceStrip: React.FC<SentenceStripProps> = ({ 
  sentence, 
  onRemove, 
  onClear, 
  onSave,
  onAddTile,
  isSpeaking,
  setIsSpeaking,
  settings
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const isHighContrast = settings.accessibility?.highContrast;

  // Flatten vocabulary for search, excluding folders and navigation
  const allTiles = useMemo(() => {
    const tiles: TileData[] = [];
    Object.values(VOCABULARY).forEach(categoryTiles => {
      categoryTiles.forEach(tile => {
        if (!tile.id.startsWith('folder_') && !tile.isNavigation) {
          tiles.push(tile);
        }
      });
    });
    return tiles;
  }, []);

  // Filter tiles based on input
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const lowerInput = inputValue.toLowerCase().trim();
    // Prioritize exact matches or startsWith, limit to 8 results
    return allTiles
      .filter(t => t.label.toLowerCase().includes(lowerInput))
      .sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();
        // Exact starts come first
        if (aLabel.startsWith(lowerInput) && !bLabel.startsWith(lowerInput)) return -1;
        if (!aLabel.startsWith(lowerInput) && bLabel.startsWith(lowerInput)) return 1;
        return 0;
      })
      .slice(0, 8);
  }, [inputValue, allTiles]);

  // Auto-scroll to end when sentence changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
    // Reset refined text if sentence changes manually
    setRefinedText(null);
  }, [sentence]);

  const handleSpeak = async () => {
    if ((sentence.length === 0 && !refinedText && !inputValue) || isSpeaking) return;
    
    setIsSpeaking(true);
    // If user typed something but didn't select a tile, speak it too
    let textToPlay = refinedText || sentence.map(t => t.textToSpeak || t.label).join(' ');
    
    if (inputValue.trim()) {
      textToPlay = textToPlay ? `${textToPlay} ${inputValue}` : inputValue;
    }

    await speakText(textToPlay, settings.voiceName);
    setIsSpeaking(false);
  };

  const handleSmartFix = async () => {
    if (sentence.length === 0 && !inputValue) return;
    setIsRefining(true);
    try {
      const rawText = sentence.map(t => t.label).join(' ') + (inputValue ? ` ${inputValue}` : '');
      const result = await refineSentence(rawText);
      setRefinedText(result);
    } catch (e) {
      console.error("Failed to refine", e);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSuggestionClick = (tile: TileData) => {
    onAddTile(tile);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAddCustomText = () => {
    if (!inputValue.trim()) return;
    const newTile: TileData = {
      id: `custom-${Date.now()}`,
      label: inputValue,
      emoji: '💬',
      color: 'bg-white border-slate-300',
      category: 'Keyboard'
    };
    onAddTile(newTile);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If suggestions exist, pick the first one
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0]);
      } else {
        // Otherwise add as custom text
        handleAddCustomText();
      }
    }
  };

  const isSidebarRight = settings.sidebarPosition === 'right';
  const stripClass = `border-b shadow-sm sticky top-0 z-50 flex flex-col h-auto md:h-32 shrink-0 ${isSidebarRight ? 'md:flex-row' : 'md:flex-row-reverse'} 
    ${isHighContrast ? 'bg-black border-yellow-400' : 'bg-white border-slate-200'}`;
  
  return (
    <div className={stripClass}>
      
      {/* Scrollable Sentence Area */}
      <div className="flex-1 flex flex-col min-h-[5rem] relative">
        {/* If refined, show the natural sentence prominently */}
        {refinedText && (
           <div className={`px-4 py-2 font-medium text-sm flex justify-between items-center border-b animate-in slide-in-from-top-2
             ${isHighContrast ? 'bg-yellow-900 text-yellow-300 border-yellow-600' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}
           `}>
             <div className="flex items-center gap-2">
               <Wand2 size={16} />
               <span>Corrected: <strong>"{refinedText}"</strong></span>
             </div>
             <button onClick={() => setRefinedText(null)} className="p-1 hover:opacity-75 rounded">
               <X size={14} />
             </button>
           </div>
        )}

        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto flex items-center p-2 gap-2 no-scrollbar"
        >
          {sentence.map((tile, index) => (
            <div key={`${tile.id}-${index}`} className={`relative group shrink-0 animate-in fade-in zoom-in duration-200 ${refinedText ? 'opacity-50 grayscale' : ''}`}>
              <Tile data={tile} onClick={() => {}} variant="small" settings={settings} />
              <button 
                onClick={() => onRemove(index)}
                className={`absolute -top-2 -right-2 rounded-full p-1 shadow-sm transition-colors z-10
                  ${isHighContrast 
                    ? 'bg-red-600 text-white border border-white hover:bg-red-700' 
                    : 'bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-500'}
                `}
                aria-label="Remove tile"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          
          {/* Interactive Input Field */}
          <div className="flex-1 min-w-[150px] relative h-full flex items-center">
             <div className="absolute left-2 text-slate-400 pointer-events-none">
                {sentence.length === 0 && !inputValue ? <Keyboard size={20} className="animate-pulse" /> : <Search size={16} />}
             </div>
             <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay so click registers
                onKeyDown={handleKeyDown}
                placeholder={sentence.length === 0 ? "Tap icons or type..." : "Type to add..."}
                className={`w-full h-12 pl-9 pr-2 rounded-xl border-2 text-lg outline-none transition-all
                   ${isHighContrast 
                     ? 'bg-black border-yellow-400 text-yellow-400 placeholder:text-yellow-700 focus:ring-2 focus:ring-yellow-400' 
                     : 'bg-transparent border-transparent focus:border-blue-300 focus:bg-blue-50/50 text-slate-700 placeholder:text-slate-400 placeholder:italic'}
                `}
             />
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && inputValue.trim() && (
          <div className={`absolute top-full left-0 right-0 border shadow-xl rounded-b-xl z-50 max-h-60 overflow-y-auto
             ${isHighContrast ? 'bg-black border-yellow-400' : 'bg-white border-slate-200'}
          `}>
            {suggestions.map((tile) => (
              <button
                key={tile.id}
                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(tile); }} // onMouseDown fires before onBlur
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b last:border-0
                   ${isHighContrast 
                     ? 'text-yellow-400 border-yellow-800 hover:bg-yellow-900' 
                     : 'hover:bg-blue-50 text-slate-700 border-slate-50'}
                `}
              >
                <span className="text-2xl">{tile.emoji}</span>
                <span className="font-bold">{tile.label}</span>
                <span className={`ml-auto text-xs uppercase ${isHighContrast ? 'text-yellow-600' : 'text-slate-400'}`}>{tile.category}</span>
              </button>
            ))}
            
            {/* Create Option */}
            <button
               onMouseDown={(e) => { e.preventDefault(); handleAddCustomText(); }}
               className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left font-bold
                 ${isHighContrast ? 'text-cyan-400 hover:bg-cyan-900 bg-black' : 'hover:bg-indigo-50 text-indigo-600 bg-slate-50'}
               `}
            >
              <Plus size={20} />
              <span>Add "{inputValue}"</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`flex md:flex-col lg:flex-row p-2 gap-2 items-stretch justify-end 
         ${isSidebarRight ? 'border-t md:border-t-0 md:border-l' : 'border-t md:border-t-0 md:border-r'}
         ${isHighContrast ? 'bg-black border-yellow-400' : 'bg-slate-50 md:bg-white border-slate-100'}
      `}>
         
         <div className="flex flex-1 gap-2">
            <button 
              onClick={() => { onClear(); setInputValue(''); }}
              disabled={sentence.length === 0 && !inputValue}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${isHighContrast 
                  ? 'bg-slate-800 text-white border border-white hover:bg-slate-700' 
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}
              `}
              title="Clear All"
            >
              <X size={20} />
              <span className="hidden xl:inline">Clear</span>
            </button>

            {/* Smart Fix Button */}
            <button
               onClick={handleSmartFix}
               disabled={(sentence.length === 0 && !inputValue) || isRefining}
               className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50
                 ${isHighContrast 
                   ? 'bg-indigo-900 text-cyan-300 border border-cyan-500 hover:bg-indigo-800' 
                   : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}
               `}
               title="Smart Grammar Fix"
            >
               {isRefining ? <div className={`animate-spin w-5 h-5 border-2 border-t-transparent rounded-full ${isHighContrast ? 'border-cyan-300' : 'border-indigo-500'}`} /> : <Wand2 size={20} />}
               <span className="hidden xl:inline">Fix</span>
            </button>

             <button 
              onClick={onSave}
              disabled={sentence.length === 0}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                 ${isHighContrast 
                   ? 'bg-amber-900 text-amber-300 border border-amber-500 hover:bg-amber-800' 
                   : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'}
              `}
              title="Save current phrase"
            >
              <Save size={20} />
              <span className="inline">Save</span>
            </button>

            <button 
              onClick={handleSpeak}
              disabled={(sentence.length === 0 && !refinedText && !inputValue) || isSpeaking}
              className={`flex-[2] md:flex-none flex items-center justify-center gap-2 px-6 lg:px-8 py-2 rounded-lg font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:shadow-none
                ${isHighContrast 
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-white' 
                  : 'bg-blue-600 hover:bg-blue-700 active:translate-y-0.5'} 
                ${isSpeaking ? 'cursor-wait opacity-90' : ''}
              `}
            >
              <Volume2 size={24} className={isSpeaking ? 'animate-pulse' : ''} />
              <span>{isSpeaking ? 'Speaking...' : 'Speak'}</span>
            </button>
         </div>
      </div>
    </div>
  );
};

export default SentenceStrip;
