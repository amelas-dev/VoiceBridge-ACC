
import React, { useState, useEffect } from 'react';
import { TileData, UserSettings } from './types';
import { CATEGORIES, VOCABULARY, STORAGE_KEY, PINNED_STORAGE_KEY, DEFAULT_SETTINGS } from './constants';
import Tile from './components/Tile';
import SentenceStrip from './components/SentenceStrip';
import KeyboardView from './components/KeyboardView';
import SavedPhrasesView from './components/SavedPhrasesView';
import SettingsView from './components/SettingsView';
import SaveModal from './components/SaveModal';
import Toast, { ToastMessage } from './components/Toast';
import { Keyboard, Bookmark, Settings, Pin, Bell } from 'lucide-react';
import { playEmergencyAlert } from './services/gemini';

const App: React.FC = () => {
  const [sentence, setSentence] = useState<TileData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedTiles, setSavedTiles] = useState<TileData[]>([]);
  const [pinnedTiles, setPinnedTiles] = useState<TileData[]>([]);
  
  // Settings State 
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  
  // UI State for Modals/Toasts
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingSaveName, setPendingSaveName] = useState('');

  // Load saved phrases and pinned tiles on mount
  useEffect(() => {
    // Saved Phrases
    const loadedSaved = localStorage.getItem(STORAGE_KEY);
    if (loadedSaved) {
      try {
        setSavedTiles(JSON.parse(loadedSaved));
      } catch (e) {
        console.error("Failed to load saved phrases", e);
      }
    }

    // Pinned Tiles
    const loadedPinned = localStorage.getItem(PINNED_STORAGE_KEY);
    if (loadedPinned) {
      try {
        setPinnedTiles(JSON.parse(loadedPinned));
      } catch (e) {
        console.error("Failed to load pinned tiles", e);
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
    if (tile.id === 'folder_phrases') {
      setSelectedCategory('Phrases');
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

  const handleTogglePin = (tile: TileData) => {
    const isPinned = pinnedTiles.some(t => t.id === tile.id);
    let newPinned;
    
    if (isPinned) {
      newPinned = pinnedTiles.filter(t => t.id !== tile.id);
      showToast('success', 'Tile unpinned');
    } else {
      // Create a clean copy to pin (remove navigation flags if any, though regular tiles shouldn't have them)
      newPinned = [...pinnedTiles, tile];
      showToast('success', 'Tile pinned to General');
    }
    
    setPinnedTiles(newPinned);
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(newPinned));
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

  // Determine Layout Order based on settings
  const isSidebarRight = userSettings.sidebarPosition === 'right';
  const layoutClass = `flex-1 flex overflow-hidden ${isSidebarRight ? 'flex-col-reverse md:flex-row-reverse' : 'flex-col md:flex-row'}`;
  const sidebarBorderClass = isSidebarRight 
    ? 'border-t md:border-t-0 md:border-l' 
    : 'border-b md:border-b-0 md:border-r';
    
  // High Contrast overrides
  const isHighContrast = userSettings.accessibility?.highContrast;
  const mainBgClass = isHighContrast ? 'bg-black text-yellow-400' : 'bg-slate-50 text-slate-900';
  const sidebarBgClass = isHighContrast ? 'bg-black border-yellow-600' : 'bg-slate-100 border-slate-200';
  const categoryActiveBtnClass = isHighContrast ? 'bg-yellow-400 text-black shadow-none border-2 border-white' : 'bg-blue-600 text-white shadow-md scale-105';
  const categoryInactiveBtnClass = isHighContrast ? 'bg-black text-yellow-500 border border-yellow-700 hover:bg-yellow-900' : 'bg-white text-slate-600 hover:bg-slate-200';
  const alertBtnClass = isHighContrast ? 'bg-red-600 text-white border-2 border-white' : 'bg-red-100 text-red-600 hover:bg-red-200 border-2 border-transparent';

  return (
    <div className={`h-screen w-screen flex flex-col ${mainBgClass}`}>
      
      {/* Overlays */}
      <Toast toast={toast} onClose={() => setToast(null)} />
      
      <SaveModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={confirmSavePhrase}
        defaultName={pendingSaveName}
      />

      {/* Main Board UI */}
      <SentenceStrip 
        sentence={sentence} 
        onRemove={handleRemoveTile} 
        onClear={handleClear}
        onSave={openSaveModal}
        onAddTile={handleTileClick}
        isSpeaking={isSpeaking}
        setIsSpeaking={setIsSpeaking}
        settings={userSettings}
      />

      {/* Main Content Area */}
      <div className={layoutClass}>
        
        {/* Sidebar Container */}
        <div className={`w-full md:w-64 flex md:flex-col shrink-0 ${sidebarBorderClass} ${sidebarBgClass}`}>
          
          {/* Scrollable Categories List */}
          <div className="flex-1 p-2 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 md:py-4 rounded-xl font-bold text-left transition-all whitespace-nowrap md:whitespace-normal flex items-center gap-3 shrink-0
                  ${selectedCategory === cat 
                    ? categoryActiveBtnClass
                    : categoryInactiveBtnClass
                  }
                `}
              >
                {getCategoryIcon(cat)}
                <span>{cat}</span>
              </button>
            ))}

            {/* Mobile Only: Alarm Button */}
             <button
              onClick={playEmergencyAlert}
              className={`md:hidden px-4 py-3 rounded-xl font-bold text-left transition-all whitespace-nowrap flex items-center gap-3 shrink-0 ${alertBtnClass}`}
            >
              <Bell size={20} className="animate-wiggle" />
              <span>Alarm</span>
            </button>

            {/* Mobile Only Settings Button */}
            <button
              onClick={() => setSelectedCategory('Settings')}
              className={`md:hidden px-4 py-3 rounded-xl font-bold text-left transition-all whitespace-nowrap flex items-center gap-3 shrink-0
                ${selectedCategory === 'Settings' 
                  ? categoryActiveBtnClass
                  : categoryInactiveBtnClass
                }
              `}
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>

          {/* Desktop Only Settings & Alarm */}
          <div className={`hidden md:flex flex-col border-t p-2 space-y-2 ${isHighContrast ? 'border-yellow-600' : 'border-slate-200 bg-slate-100'}`}>
            
             <button
              onClick={playEmergencyAlert}
              className={`px-4 py-4 rounded-xl font-bold text-left transition-all flex items-center gap-3 ${alertBtnClass}`}
            >
              <Bell size={20} className="animate-wiggle" />
              <span>Alarm</span>
            </button>

            <button
              onClick={() => setSelectedCategory('Settings')}
              className={`px-4 py-4 rounded-xl font-bold text-left transition-all flex items-center gap-3
                ${selectedCategory === 'Settings' 
                  ? categoryActiveBtnClass
                  : `bg-transparent ${isHighContrast ? 'text-yellow-500 hover:text-yellow-300' : 'text-slate-600 hover:bg-slate-200'}`
                }
              `}
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>

        </div>

        {/* Dynamic Main View */}
        <div className={`flex-1 overflow-y-auto relative ${isHighContrast ? 'bg-black' : 'bg-slate-50'}`}>
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
           ) : selectedCategory === 'General' ? (
             // Special Layout for General Tab to show Pinned items
             <div className="p-4 pb-20 space-y-8">
                {/* Standard General Folders */}
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 px-1 ${isHighContrast ? 'text-yellow-600' : 'text-slate-400'}`}>Categories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {VOCABULARY['General']?.map((tile) => (
                      <Tile 
                        key={tile.id} 
                        data={tile} 
                        onClick={handleTileClick}
                        settings={userSettings} 
                      />
                    ))}
                  </div>
                </div>

                {/* Pinned Tiles Section */}
                {pinnedTiles.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 px-1 flex items-center gap-2 ${isHighContrast ? 'text-yellow-600' : 'text-slate-400'}`}>
                      <Pin size={16} className={isHighContrast ? "text-yellow-500" : "text-blue-500"} /> 
                      Pinned Tiles
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {pinnedTiles.map((tile) => (
                        <Tile 
                          key={`pinned-${tile.id}`} 
                          data={tile} 
                          onClick={handleTileClick}
                          settings={userSettings}
                          isPinned={true}
                          onTogglePin={() => handleTogglePin(tile)}
                        />
                      ))}
                    </div>
                  </div>
                )}
             </div>
           ) : (
             // Standard Category View
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 pb-20">
               {VOCABULARY[selectedCategory]?.map((tile) => (
                 <Tile 
                   key={tile.id} 
                   data={tile} 
                   onClick={handleTileClick}
                   settings={userSettings}
                   isPinned={pinnedTiles.some(p => p.id === tile.id)}
                   onTogglePin={() => handleTogglePin(tile)}
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
