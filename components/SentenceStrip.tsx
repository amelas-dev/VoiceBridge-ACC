
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

  // Determine Layout alignment based on settings
  const isSidebarRight = settings.sidebarPosition === 'right';
  // If sidebar is Right, buttons should be on Right (Standard flow)? 
  // Or should they be on Left to mirror?
  // User asked for "Opposite side". 
  // Standard: Sidebar Left, Content Right. Buttons usually Right end.
  // Flipped: Sidebar Right, Content Left. Buttons should probably stay close to Sidebar (Right) or move Left?
  // Let's assume accessibility means bringing controls to the active hand.
  // If I use Right Sidebar, I am Right Handed. I want buttons on Right.
  // If I use Left Sidebar, I am Left Handed. I want buttons on Left.
  // Currently buttons are 'justify-end' (Right).
  // So if Sidebar is Left (default), buttons should be Left? 
  // Wait, standard UI is usually LTR.
  // Let's implement dynamic reversal of the strip itself.
  
  // Flex Direction for the whole strip:
  // Default (Left Sidebar): Row. Sentence Left, Buttons Right.
  // Flipped (Right Sidebar): Row Reverse? Buttons Left, Sentence Right? 
  // No, if I am Right Handed (Sidebar Right), I want buttons near my thumb (Right).
  // If I am Left Handed (Sidebar Left), I want buttons near my thumb (Left).
  
  // So:
  // Sidebar Left -> Buttons Left (justify-start ? or flex-row-reverse of strip?)
  // Sidebar Right -> Buttons Right (justify-end)
  
  // Let's use flexDirection to swap the Sentence Area and Action Buttons Area
  const stripClass = `bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 flex flex-col h-auto md:h-32 shrink-0 ${isSidebarRight ? 'md:flex-row' : 'md:flex-row-reverse'}`;
  
  // Wait, if flex-row-reverse: Buttons (2nd child) come first (Left), Sentence (1st child) comes second (Right).
  // This matches "Left Handed" setup (Sidebar Left, Buttons Left).
  
  // If flex-row: Sentence (1st) Left, Buttons (2nd) Right.
  // This matches "Right Handed" setup (Sidebar Right, Buttons Right).
  
  return (
    <div className={stripClass}>
      
      {/* Scrollable Sentence Area */}
      <div className="flex-1 flex flex-col min-h-[5rem] relative">
        {/* If refined, show the natural sentence prominently */}
        {refinedText && (
           <div className="bg-indigo-50 px-4 py-2 text-indigo-800 font-medium text-sm flex justify-between items-center border-b border-indigo-100 animate-in slide-in-from-top-2">
             <div className="flex items-center gap-2">
               <Wand2 size={16} />
               <span>Corrected: <strong>"{refinedText}"</strong></span>
             </div>
             <button onClick={() => setRefinedText(null)} className="p-1 hover:bg-indigo-100 rounded">
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
              <Tile data={tile} onClick={() => {}} variant="small" />
              <button 
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 bg-slate-200 text-slate-600 rounded-full p-1 shadow-sm hover:bg-red-100 hover:text-red-500 transition-colors z-10"
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
                placeholder={sentence.length === 0 ? "Tap icons or type here..." : "Type to add..."}
                className="w-full h-12 pl-9 pr-2 rounded-xl border-2 border-transparent focus:border-blue-300 focus:bg-blue-50/50 bg-transparent text-lg text-slate-700 outline-none placeholder:text-slate-400 placeholder:italic transition-all"
             />
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && inputValue.trim() && (
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-b-xl z-50 max-h-60 overflow-y-auto">
            {suggestions.map((tile) => (
              <button
                key={tile.id}
                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(tile); }} // onMouseDown fires before onBlur
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-0"
              >
                <span className="text-2xl">{tile.emoji}</span>
                <span className="font-bold text-slate-700">{tile.label}</span>
                <span className="ml-auto text-xs text-slate-400 uppercase">{tile.category}</span>
              </button>
            ))}
            
            {/* Create Option */}
            <button
               onMouseDown={(e) => { e.preventDefault(); handleAddCustomText(); }}
               className="w-full px-4 py-3 flex items-center gap-3 hover:bg-indigo-50 transition-colors text-left text-indigo-600 font-bold bg-slate-50"
            >
              <Plus size={20} />
              <span>Add "{inputValue}"</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`flex md:flex-col lg:flex-row p-2 gap-2 border-slate-100 bg-slate-50 md:bg-white items-stretch justify-end ${isSidebarRight ? 'border-t md:border-t-0 md:border-l' : 'border-t md:border-t-0 md:border-r'}`}>
         
         <div className="flex flex-1 gap-2">
            <button 
              onClick={() => { onClear(); setInputValue(''); }}
              disabled={sentence.length === 0 && !inputValue}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear All"
            >
              <X size={20} />
              <span className="hidden xl:inline">Clear</span>
            </button>

            {/* Smart Fix Button */}
            <button
               onClick={handleSmartFix}
               disabled={(sentence.length === 0 && !inputValue) || isRefining}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 transition-colors"
               title="Smart Grammar Fix"
            >
               {isRefining ? <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <Wand2 size={20} />}
               <span className="hidden xl:inline">Fix</span>
            </button>

             <button 
              onClick={onSave}
              disabled={sentence.length === 0}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-amber-200"
              title="Save current phrase to 'Saved' tab"
            >
              <Save size={20} />
              <span className="inline">Save</span>
            </button>

            <button 
              onClick={handleSpeak}
              disabled={(sentence.length === 0 && !refinedText && !inputValue) || isSpeaking}
              className={`flex-[2] md:flex-none flex items-center justify-center gap-2 px-6 lg:px-8 py-2 rounded-lg font-bold text-white transition-all shadow-md ${
                isSpeaking 
                  ? 'bg-blue-400 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-700 active:translate-y-0.5'
              } disabled:opacity-50 disabled:shadow-none`}
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
