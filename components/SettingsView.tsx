
import React from 'react';
import { Palette, Type, Layout } from 'lucide-react';
import { UserSettings } from '../types';
import Tile from './Tile';

interface SettingsViewProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange }) => {
  
  // Default values for reset
  const defaults = { tileSize: 160, textSize: 20 };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          Settings
        </h2>

        <div className="space-y-6">
          {/* Customizations Section */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Palette className="text-blue-500" />
              Customizations
            </h3>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                {/* Sliders Area */}
                <div className="space-y-6">
                  {/* Tile Size Slider */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Layout size={20} />
                        </div>
                        <label htmlFor="tileSize" className="font-bold text-slate-700">Tile Height</label>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{settings.tileSize}px</span>
                    </div>
                    <input
                      id="tileSize"
                      type="range"
                      min="100"
                      max="300"
                      step="10"
                      value={settings.tileSize}
                      onChange={(e) => onSettingsChange({ ...settings, tileSize: Number(e.target.value) })}
                      className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-bold px-1 mt-2 uppercase tracking-wide">
                      <span>Compact</span>
                      <span>Spacious</span>
                    </div>
                  </div>

                  {/* Text Size Slider */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                          <Type size={20} />
                        </div>
                        <label htmlFor="textSize" className="font-bold text-slate-700">Text Size</label>
                      </div>
                      <span className="text-sm font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">{settings.textSize}px</span>
                    </div>
                    <input
                      id="textSize"
                      type="range"
                      min="14"
                      max="48"
                      step="2"
                      value={settings.textSize}
                      onChange={(e) => onSettingsChange({ ...settings, textSize: Number(e.target.value) })}
                      className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600 hover:accent-pink-500 transition-all"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-bold px-1 mt-2 uppercase tracking-wide">
                      <span>Small</span>
                      <span>Large</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onSettingsChange(defaults)}
                  className="w-full py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>

              {/* Live Preview */}
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Live Preview</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Updates Real-time</span>
                </h4>
                <div className="flex-1 bg-slate-100/50 rounded-xl border-2 border-dashed border-slate-200 p-4 overflow-hidden flex flex-col items-center justify-center gap-4">
                   {/* Multiple Preview Tiles to show effect */}
                   <div className="w-full grid grid-cols-2 gap-4">
                      <Tile 
                        data={{ 
                          id: 'preview-1', 
                          label: 'Hello', 
                          emoji: '👋', 
                          color: 'bg-white border-slate-300', 
                          category: 'Settings' 
                        }} 
                        onClick={() => {}}
                        settings={settings}
                      />
                      <Tile 
                        data={{ 
                          id: 'preview-2', 
                          label: 'Short', 
                          emoji: '⚡', 
                          color: 'bg-yellow-100 border-yellow-300', 
                          category: 'Settings' 
                        }} 
                        onClick={() => {}}
                        settings={settings}
                      />
                   </div>
                   {/* Longer text example */}
                   <div className="w-full max-w-[200px]">
                      <Tile 
                        data={{ 
                          id: 'preview-3', 
                          label: 'Example of longer text', 
                          emoji: '📝', 
                          color: 'bg-blue-100 border-blue-300', 
                          category: 'Settings' 
                        }} 
                        onClick={() => {}}
                        settings={settings}
                      />
                   </div>
                </div>
              </div>
            </div>
          </section>

          {/* Info Section */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
             <h3 className="text-lg font-bold text-slate-800 mb-2">VoiceBridge AAC</h3>
             <p className="text-slate-500">
               Adjust the tiles to suit your visual needs. Changes apply immediately to all board and saved tiles.
             </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
