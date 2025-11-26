
import React, { useState } from 'react';
import { TileData } from '../types';
import { Delete, Eraser, Check, Space, Image as ImageIcon } from 'lucide-react';
import { generateTileImage } from '../services/gemini';

interface KeyboardViewProps {
  onAddTile: (tile: TileData) => void;
}

const KeyboardView: React.FC<KeyboardViewProps> = ({ onAddTile }) => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const handleKeyPress = (key: string) => {
    setText(prev => prev + key);
  };

  const handleBackspace = () => {
    setText(prev => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setText(prev => prev + ' ');
  };

  const handleGenerateImage = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const img = await generateTileImage(text, imageSize);
      setGeneratedImage(img);
    } catch (e) {
      console.error(e);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdd = () => {
    if (!text.trim()) return;
    
    const newTile: TileData = {
      id: `custom-${Date.now()}`,
      label: text,
      emoji: generatedImage ? '' : '💬',
      imageUrl: generatedImage || undefined,
      color: 'bg-white border-slate-300',
      category: 'Keyboard',
    };
    
    onAddTile(newTile);
    setText('');
    setGeneratedImage(null);
  };

  // Styles to mimic the Tile component but flexible
  const tileBase = "flex-1 rounded-xl shadow-sm border-b-4 flex items-center justify-center transition-all active:scale-95 active:border-b-0 active:translate-y-1 select-none touch-manipulation";
  const charTile = `${tileBase} bg-white border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-2xl md:text-5xl font-bold`;
  const actionTile = `${tileBase} text-xl md:text-2xl font-bold uppercase tracking-wider`;

  return (
    <div className="flex flex-col h-full bg-slate-50 p-2 md:p-4 gap-2 md:gap-3 overflow-hidden">
      
      {/* Input & Generation Area */}
      <div className="flex flex-col md:flex-row gap-3 shrink-0">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-3 md:p-4 flex gap-3 items-center">
          <input 
            type="text" 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type word..."
            className="flex-1 text-2xl md:text-4xl font-bold outline-none text-slate-800 placeholder:text-slate-300 bg-transparent"
          />
          {text.length > 0 && (
            <button 
              onClick={() => { setText(''); setGeneratedImage(null); }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Eraser size={28} />
            </button>
          )}
        </div>

        {/* AI Image Generation Controls */}
        <div className="flex gap-2 items-center bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-sm">
          {generatedImage ? (
             <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
               <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
               <button 
                 onClick={() => setGeneratedImage(null)}
                 className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <Delete size={20} />
               </button>
             </div>
          ) : (
            <div className="flex items-center gap-2">
               <select 
                 value={imageSize}
                 onChange={(e) => setImageSize(e.target.value as any)}
                 className="h-full bg-slate-100 border-r border-slate-200 rounded-l-lg px-2 text-sm font-bold text-slate-600 outline-none"
               >
                 <option value="1K">1K</option>
                 <option value="2K">2K</option>
                 <option value="4K">4K</option>
               </select>
               <button
                 onClick={handleGenerateImage}
                 disabled={!text.trim() || isGenerating}
                 className="flex flex-col items-center justify-center px-4 py-1 text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isGenerating ? (
                   <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
                 ) : (
                   <>
                     <ImageIcon size={24} />
                     <span className="text-xs font-bold">Gen Image</span>
                   </>
                 )}
               </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Grid */}
      <div className="flex-1 flex flex-col gap-2 md:gap-3 pb-safe">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex-1 flex gap-2 md:gap-3 w-full">
            {row.map((char) => (
              <button
                key={char}
                onClick={() => handleKeyPress(char)}
                className={charTile}
              >
                {char}
              </button>
            ))}
          </div>
        ))}

        {/* Bottom Action Row */}
        <div className="flex-1 flex gap-2 md:gap-3 w-full">
          <button
            onClick={handleBackspace}
            className={`${actionTile} bg-red-100 border-red-300 text-red-600 max-w-[20%]`}
            aria-label="Backspace"
          >
            <Delete size={32} />
          </button>
          
          <button
            onClick={handleSpace}
            className={`${actionTile} bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200`}
          >
            Space
          </button>

          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className={`${actionTile} bg-blue-500 border-blue-700 text-white max-w-[25%] hover:bg-blue-600 disabled:opacity-50 disabled:grayscale`}
          >
            <div className="flex flex-col items-center">
               <Check size={32} />
               <span className="text-xs md:text-sm">Add</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardView;
