
import React, { useRef, useEffect, useState } from 'react';
import { TileData } from '../types';
import Tile from './Tile';
import { X, Volume2, MessageSquare, Save, Wand2 } from 'lucide-react';
import { speakText, refineSentence } from '../services/gemini';

interface SentenceStripProps {
  sentence: TileData[];
  onRemove: (index: number) => void;
  onClear: () => void;
  onSave: () => void;
  onLiveToggle: () => void;
  isSpeaking: boolean;
  setIsSpeaking: (v: boolean) => void;
}

const SentenceStrip: React.FC<SentenceStripProps> = ({ 
  sentence, 
  onRemove, 
  onClear, 
  onSave,
  onLiveToggle,
  isSpeaking,
  setIsSpeaking
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);

  // Auto-scroll to end when sentence changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
    // Reset refined text if sentence changes manually
    setRefinedText(null);
  }, [sentence]);

  const handleSpeak = async () => {
    if ((sentence.length === 0 && !refinedText) || isSpeaking) return;
    
    setIsSpeaking(true);
    // Speak the refined text if available, otherwise the raw tokens
    const text = refinedText || sentence.map(t => t.textToSpeak || t.label).join(' ');
    
    await speakText(text);
    setIsSpeaking(false);
  };

  const handleSmartFix = async () => {
    if (sentence.length === 0) return;
    setIsRefining(true);
    try {
      const rawText = sentence.map(t => t.label).join(' ');
      const result = await refineSentence(rawText);
      setRefinedText(result);
    } catch (e) {
      console.error("Failed to refine", e);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10 flex flex-col md:flex-row h-auto md:h-32 shrink-0">
      
      {/* Scrollable Sentence Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-[5rem]">
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
          {sentence.length === 0 ? (
            <div className="flex items-center text-slate-400 italic text-lg px-4 h-full w-full">
              <span className="animate-pulse">Tap icons to build a sentence...</span>
            </div>
          ) : (
            sentence.map((tile, index) => (
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
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex md:flex-col lg:flex-row p-2 gap-2 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50 md:bg-white items-stretch justify-end">
         
         <div className="flex flex-1 gap-2">
            <button 
              onClick={onClear}
              disabled={sentence.length === 0}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear All"
            >
              <X size={20} />
              <span className="hidden xl:inline">Clear</span>
            </button>

            {/* Smart Fix Button */}
            <button
               onClick={handleSmartFix}
               disabled={sentence.length === 0 || isRefining}
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
              disabled={(sentence.length === 0 && !refinedText) || isSpeaking}
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

         {/* Live Toggle */}
         <button
            onClick={onLiveToggle}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border-2 border-indigo-200 transition-colors"
         >
           <MessageSquare size={20} />
           <span className="whitespace-nowrap">Live AI</span>
         </button>

      </div>
    </div>
  );
};

export default SentenceStrip;
