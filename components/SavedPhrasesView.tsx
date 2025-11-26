
import React, { useState } from 'react';
import { TileData, UserSettings } from '../types';
import Tile from './Tile';
import { Plus, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface SavedPhrasesViewProps {
  savedTiles: TileData[];
  onAddTile: (tile: TileData) => void;
  onDeleteTile: (id: string) => void;
  onSwitchToKeyboard: () => void;
  settings: UserSettings;
}

const SavedPhrasesView: React.FC<SavedPhrasesViewProps> = ({ 
  savedTiles, 
  onAddTile, 
  onDeleteTile, 
  onSwitchToKeyboard,
  settings 
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent tile click
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteTile(deleteId);
      setDeleteId(null);
    }
  };

  const tileHeightStyle = { height: `${settings.tileSize}px` };

  return (
    <>
      <div className="p-4 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Saved Phrases</h2>
          <span className="text-sm text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">{savedTiles.length} phrases</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
          {/* Add New Phrase Button - Redirects to Keyboard */}
          <div className="flex flex-col" style={tileHeightStyle}>
            <button
              onClick={onSwitchToKeyboard}
              className="w-full h-full flex flex-col items-center justify-center rounded-xl border-3 border-dashed border-slate-300 text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all gap-2 group"
            >
              <div className="p-3 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors">
                <Plus size={32} />
              </div>
              <span className="font-bold">New Phrase</span>
            </button>
          </div>

          {/* Saved List */}
          {savedTiles.map((tile) => (
            <div key={tile.id} className="relative group animate-in fade-in duration-300">
              <Tile 
                data={tile} 
                onClick={onAddTile} 
                settings={settings}
              />
              <button
                onClick={(e) => initiateDelete(e, tile.id)}
                className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-slate-200 transition-all z-20"
                title="Delete phrase"
                aria-label="Delete phrase"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Phrase"
        message="Are you sure you want to remove this phrase from your saved items? This action cannot be undone."
      />
    </>
  );
};

export default SavedPhrasesView;
