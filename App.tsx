import React, { useState, useEffect } from 'react';
import { TileData, AppMode, UserSettings } from './types';
import { CATEGORIES, VOCABULARY, STORAGE_KEY } from './constants';
import Tile from './components/Tile';
import SentenceStrip from './components/SentenceStrip';
import LiveSession from './components/LiveSession';
import KeyboardView from './components/KeyboardView';
import SavedPhrasesView from './components/SavedPhrasesView';
import SettingsView from './components/SettingsView';
import SaveModal from './components/SaveModal';
import Toast, { ToastMessage } from './components/Toast';
import { Keyboard, Bookmark, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.BOARD);
  const [sentence, setSentence] = useState<TileData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedTiles, setSavedTiles] = useState<TileData[]>([]);
  
  // Settings State (Default: Tile Height 160px ~ h-40, Text Size 20px ~ text-xl)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    tileSize: 160,
    textSize: 20
  });
  
  // UI State for Modals/Toasts
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingSaveName, setPendingSaveName] = useState('');

  // Load saved phrases on mount
  useEffect(() => {
    const loaded = localStorage.getItem(STORAGE_KEY);
    if (loaded) {
      try {
        setSavedTiles(JSON.parse(loaded));
      } catch (e) {
        console.error("Failed to load saved phrases", e);
        showToast('error', 'Failed to load saved phrases');
      }
    }
  }, []);

  // --- Helpers ---

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ id: Date.now().toString(), type, message });
  };

  const generateId = () => {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  };

  // --- Handlers ---

  const handleTileClick = (tile: TileData) => {
    // Navigation Logic: Check for special folder tiles or back buttons
    if (tile.id === 'folder_connectors') {
      setSelectedCategory('Connectors');
      return;
    }
    if (tile.id === 'folder_responses') {
      setSelectedCategory('Responses');
      return;
    }
    if (tile.id === 'folder_greetings') {
      setSelectedCategory('Greetings');
      return;
    }
    if (tile.id === 'back_general') {
      setSelectedCategory('General');
      return;
    }

    // Add a unique instance of the tile to the sentence
    const instanceTile = { ...tile, id: `${tile.id}-${generateId()}` };
    setSentence((prev) => [...prev, instanceTile]);
  };

  const handleRemoveTile = (index: number) => {
    setSentence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setSentence([]);
  };

  const openSaveModal = () => {
    if (sentence.length === 0) return;
    const fullText = sentence.map(t => t.textToSpeak || t.label).join(' ');
    // Smart default name: truncate if too long
    const defaultLabel = fullText.length > 40 ? fullText.substring(0, 40) + '...' : fullText;
    setPendingSaveName(defaultLabel);
    setIsSaveModalOpen(true);
  };

  const confirmSavePhrase = (label: string) => {
    try {
      const fullText = sentence.map(t => t.textToSpeak || t.label).join(' ');
      
      const newTile: TileData = {
        id: `saved-${generateId()}`,
        label: label.trim(), 
        textToSpeak: fullText,
        emoji: '⭐',
        color: 'bg-amber-100 border-amber-300',
        category: 'Saved',
      };

      const updated = [newTile, ...savedTiles];
      setSavedTiles(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      showToast('success', 'Phrase saved to "Saved" tab!');
      setIsSaveModalOpen(false);
    } catch (e) {
      console.error("Storage error:", e);
      showToast('error', 'Could not save. Storage might be full.');
    }
  };

  const handleDeleteSavedPhrase = (id: string) => {
    try {
      const updated = savedTiles.filter(t => t.id !== id);
      setSavedTiles(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast('success', 'Phrase deleted.');
    } catch (e) {
      showToast('error', 'Failed to delete phrase.');
    }
  };

  // Helper to get icon for category
  const getCategoryIcon = (cat: string) => {
    if (cat === 'Keyboard') return <Keyboard size={20} />;
    if (cat === 'Saved') return <Bookmark size={20} />;
    return null;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Overlays */}
      <Toast toast={toast} onClose={() => setToast(null)} />
      
      <SaveModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={confirmSavePhrase}
        defaultName={pendingSaveName}
      />

      {/* Live Mode Overlay */}
      {mode === AppMode.LIVE && (
        <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-300">
           <LiveSession onClose={() => setMode(AppMode.BOARD)} />
        </div>
      )}

      {/* Main Board UI */}
      <SentenceStrip 
        sentence={sentence} 
        onRemove={handleRemoveTile} 
        onClear={handleClear}
        onSave={openSaveModal}
        onLiveToggle={() => setMode(AppMode.LIVE)}
        isSpeaking={isSpeaking}
        setIsSpeaking={setIsSpeaking}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar Container */}
        <div className="w-full md:w-64 bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col shrink-0">
          
          {/* Scrollable Categories List */}
          <div className="flex-1 p-2 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 md:py-4 rounded-xl font-bold text-left transition-all whitespace-nowrap md:whitespace-normal flex items-center gap-3 shrink-0
                  ${selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'bg-white text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {getCategoryIcon(cat)}
                <span>{cat}</span>
              </button>
            ))}

            {/* Mobile Only Settings Button (Appended to end of list) */}
            <button
              onClick={() => setSelectedCategory('Settings')}
              className={`md:hidden px-4 py-3 rounded-xl font-bold text-left transition-all whitespace-nowrap flex items-center gap-3 shrink-0
                ${selectedCategory === 'Settings' 
                  ? 'bg-slate-700 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>

          {/* Desktop Only Settings Button (Fixed at Bottom) */}
          <div className="hidden md:flex flex-col border-t border-slate-200 p-2 bg-slate-100">
            <button
              onClick={() => setSelectedCategory('Settings')}
              className={`px-4 py-4 rounded-xl font-bold text-left transition-all flex items-center gap-3
                ${selectedCategory === 'Settings' 
                  ? 'bg-slate-700 text-white shadow-md' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>

        </div>

        {/* Dynamic Main View */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
           {selectedCategory === 'Keyboard' ? (
             <KeyboardView onAddTile={handleTileClick} />
           ) : selectedCategory === 'Saved' ? (
             <SavedPhrasesView 
                savedTiles={savedTiles}
                onAddTile={handleTileClick} 
                onDeleteTile={handleDeleteSavedPhrase}
                onSwitchToKeyboard={() => setSelectedCategory('Keyboard')}
                settings={userSettings}
             />
           ) : selectedCategory === 'Settings' ? (
             <SettingsView 
               settings={userSettings}
               onSettingsChange={setUserSettings}
             />
           ) : (
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 pb-20">
               {VOCABULARY[selectedCategory]?.map((tile) => (
                 <Tile 
                   key={tile.id} 
                   data={tile} 
                   onClick={handleTileClick}
                   settings={userSettings} 
                 />
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default App;