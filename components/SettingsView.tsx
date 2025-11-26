
import React, { useState } from 'react';
import { Palette, Type, Layout, Volume2, Check, Play, Download, WifiOff, Loader2, ArrowLeftRight, Eye, MousePointer2, Ear, BellRing, Sun } from 'lucide-react';
import { UserSettings } from '../types';
import { VOICE_OPTIONS, VOCABULARY, DEFAULT_SETTINGS } from '../constants';
import Tile from './Tile';
import { speakText, preloadAudioAssets } from '../services/gemini';

interface SettingsViewProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange }) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ completed: number, total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'accessibility'>('general');

  // Initialize accessibility if missing (backward compatibility)
  const safeSettings = {
    ...settings,
    accessibility: settings.accessibility || DEFAULT_SETTINGS.accessibility
  };

  const updateAccessibility = (key: keyof typeof safeSettings.accessibility, value: any) => {
    onSettingsChange({
      ...safeSettings,
      accessibility: {
        ...safeSettings.accessibility,
        [key]: value
      }
    });
  };

  const handleVoicePreview = async (voiceName: string) => {
    if (playingVoice) return;
    setPlayingVoice(voiceName);
    try {
      await speakText(`Hello, I am ${voiceName}`, voiceName);
    } catch (e) {
      console.error(e);
    } finally {
      setPlayingVoice(null);
    }
  };

  const handleDownloadAssets = async () => {
    if (downloadProgress) return; // Already downloading
    
    try {
      setDownloadProgress({ completed: 0, total: 100 }); // Initialize state
      
      await preloadAudioAssets(VOCABULARY, settings.voiceName, (completed, total) => {
        setDownloadProgress({ completed, total });
      });
      
      // Brief delay to show 100% completion before clearing
      setTimeout(() => setDownloadProgress(null), 1000);
      
    } catch (e) {
      console.error("Download failed", e);
      setDownloadProgress(null);
      alert("Something went wrong while downloading. Please check your internet connection and try again.");
    }
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
             <button 
               onClick={() => setActiveTab('general')}
               className={`text-2xl font-bold transition-opacity ${activeTab === 'general' ? 'text-slate-800 opacity-100' : 'text-slate-400 opacity-50 hover:opacity-100'}`}
             >
               Settings
             </button>
             <button 
               onClick={() => setActiveTab('accessibility')}
               className={`text-2xl font-bold transition-opacity flex items-center gap-2 ${activeTab === 'accessibility' ? 'text-blue-600 opacity-100' : 'text-slate-400 opacity-50 hover:opacity-100'}`}
             >
               <Eye className="w-8 h-8" />
               Accessibility
             </button>
          </div>
          <button 
            onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
            className="text-sm font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
          >
            Reset Defaults
          </button>
        </div>

        {activeTab === 'general' ? (
        <div className="grid lg:grid-cols-2 gap-6 animate-in slide-in-from-left-4 fade-in duration-300">
          
          {/* LEFT COLUMN: Visuals */}
          <div className="space-y-6">
            
            {/* Visual Customization Card */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Palette size={20} className="text-indigo-500" />
                Appearance
              </h3>

              <div className="space-y-6">
                {/* Tile Size Control */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <Layout size={16} /> Tile Size
                    </label>
                    <span className="text-xs font-bold text-slate-400">{settings.tileSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="300"
                    step="10"
                    value={settings.tileSize}
                    onChange={(e) => onSettingsChange({ ...settings, tileSize: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Text Size Control */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <Type size={16} /> Text Size
                    </label>
                    <span className="text-xs font-bold text-slate-400">{settings.textSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="48"
                    step="2"
                    value={settings.textSize}
                    onChange={(e) => onSettingsChange({ ...settings, textSize: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Layout Card */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowLeftRight size={20} className="text-purple-500" />
                Interface Layout
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Flip the layout to make buttons easier to reach with your dominant hand.
              </p>
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                   onClick={() => onSettingsChange({ ...settings, sidebarPosition: 'left' })}
                   className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
                     ${settings.sidebarPosition === 'left' 
                       ? 'bg-white text-slate-800 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700'
                     }
                   `}
                >
                   <Layout size={16} className="rotate-180" />
                   Sidebar Left
                </button>
                <button
                   onClick={() => onSettingsChange({ ...settings, sidebarPosition: 'right' })}
                   className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
                     ${settings.sidebarPosition === 'right' 
                       ? 'bg-white text-slate-800 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700'
                     }
                   `}
                >
                   Sidebar Right
                   <Layout size={16} />
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Audio */}
          <div className="space-y-6">
            
            {/* Offline Assets Card */}
             <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <WifiOff size={20} className="text-emerald-600" />
                Offline Mode
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Download all voice assets for <strong>"{settings.voiceName}"</strong> so the app speaks instantly without internet.
              </p>
              
              {!downloadProgress ? (
                <button
                  onClick={handleDownloadAssets}
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Download size={20} />
                  Download Voice Assets
                </button>
              ) : (
                <div className="space-y-2">
                   <div className="flex justify-between text-xs font-bold text-slate-500">
                     <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Downloading...</span>
                     <span>{Math.round((downloadProgress.completed / downloadProgress.total) * 100)}%</span>
                   </div>
                   <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                        style={{ width: `${(downloadProgress.completed / downloadProgress.total) * 100}%` }}
                      />
                   </div>
                   <p className="text-xs text-center text-slate-400">
                     Processed {downloadProgress.completed} of {downloadProgress.total} phrases
                   </p>
                </div>
              )}
            </div>

            {/* Voice Selection Card */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Volume2 size={20} className="text-blue-500" />
                Voice Selection
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOICE_OPTIONS.map((voice) => {
                  const isSelected = settings.voiceName === voice.id;
                  const isPlaying = playingVoice === voice.id;

                  return (
                    <div 
                      key={voice.id}
                      onClick={() => onSettingsChange({ ...settings, voiceName: voice.id })}
                      className={`
                        relative group p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {voice.label}
                        </span>
                        {isSelected && <Check size={16} className="text-blue-500" />}
                      </div>
                      
                      <p className="text-xs text-slate-500 font-medium mb-3">{voice.description}</p>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVoicePreview(voice.id);
                        }}
                        disabled={!!playingVoice}
                        className={`
                          w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors
                          ${isSelected 
                            ? 'bg-blue-200 text-blue-700 hover:bg-blue-300' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                      >
                        {isPlaying ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play size={12} className="fill-current" />
                        )}
                        {isPlaying ? 'Playing...' : 'Test Voice'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        ) : (
          // ACCESSIBILITY TAB
          <div className="grid lg:grid-cols-2 gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
             
             {/* Interaction Mode */}
             <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                   <MousePointer2 size={20} className="text-orange-500" />
                   Input Method
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                   Customize how you interact with the screen. Ideal for paralysis, ALS, or limited motor control.
                </p>

                <div className="space-y-4">
                   <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${safeSettings.accessibility.mode === 'standard' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50'}`}
                        onClick={() => updateAccessibility('mode', 'standard')}
                   >
                      <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-slate-800">Standard Touch / Click</span>
                         {safeSettings.accessibility.mode === 'standard' && <Check size={20} className="text-orange-600"/>}
                      </div>
                      <p className="text-xs text-slate-500">Default behavior. Tap or click to activate immediately.</p>
                   </div>

                   <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${safeSettings.accessibility.mode === 'dwell' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-slate-50'}`}
                        onClick={() => updateAccessibility('mode', 'dwell')}
                   >
                      <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-slate-800">Dwell Click (Head/Eye Tracker)</span>
                         {safeSettings.accessibility.mode === 'dwell' && <Check size={20} className="text-orange-600"/>}
                      </div>
                      <p className="text-xs text-slate-500">Hover over a button to select it automatically. No physical click required.</p>
                      
                      {/* Dwell Config */}
                      {safeSettings.accessibility.mode === 'dwell' && (
                         <div className="mt-4 pt-4 border-t border-orange-200">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-xs font-bold text-slate-600">Hover Time needed</span>
                               <span className="text-xs font-bold text-orange-600">{safeSettings.accessibility.dwellTime / 1000}s</span>
                            </div>
                            <input 
                               type="range" min="500" max="3000" step="100"
                               value={safeSettings.accessibility.dwellTime}
                               onChange={(e) => updateAccessibility('dwellTime', Number(e.target.value))}
                               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                         </div>
                      )}
                   </div>
                </div>
             </div>

             {/* Visual Accessibility */}
             <div className="space-y-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                   <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <Sun size={20} className="text-yellow-500" />
                      Visual Aids
                   </h3>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div>
                            <span className="font-bold text-slate-700 block">High Contrast Mode</span>
                            <span className="text-xs text-slate-500">Yellow on Black theme for maximum visibility.</span>
                         </div>
                         <button 
                            onClick={() => updateAccessibility('highContrast', !safeSettings.accessibility.highContrast)}
                            className={`w-14 h-8 rounded-full transition-colors relative ${safeSettings.accessibility.highContrast ? 'bg-yellow-400' : 'bg-slate-200'}`}
                         >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${safeSettings.accessibility.highContrast ? 'left-7' : 'left-1'}`} />
                         </button>
                      </div>

                      <div>
                         <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-700">Extra Grid Spacing</label>
                            <span className="text-xs font-bold text-slate-500">{safeSettings.accessibility.gridGap}px</span>
                         </div>
                         <input
                           type="range"
                           min="0"
                           max="40"
                           step="4"
                           value={safeSettings.accessibility.gridGap}
                           onChange={(e) => updateAccessibility('gridGap', Number(e.target.value))}
                           className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-500"
                         />
                         <p className="text-xs text-slate-400 mt-1">Add space between buttons to prevent accidental clicks.</p>
                      </div>
                   </div>
                </div>

                {/* Auditory & Tremor */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                   <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <Ear size={20} className="text-purple-500" />
                      Feedback & Filters
                   </h3>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div>
                            <span className="font-bold text-slate-700 block">Auditory Hover</span>
                            <span className="text-xs text-slate-500">Read button labels aloud when you hover over them.</span>
                         </div>
                         <button 
                            onClick={() => updateAccessibility('speakOnHover', !safeSettings.accessibility.speakOnHover)}
                            className={`w-14 h-8 rounded-full transition-colors relative ${safeSettings.accessibility.speakOnHover ? 'bg-purple-500' : 'bg-slate-200'}`}
                         >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${safeSettings.accessibility.speakOnHover ? 'left-7' : 'left-1'}`} />
                         </button>
                      </div>
                      
                      {safeSettings.accessibility.mode === 'standard' && (
                         <div className="pt-4 border-t border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-slate-700">Touch Filter (Hold Time)</label>
                                <span className="text-xs font-bold text-slate-500">{safeSettings.accessibility.clickHoldTime}ms</span>
                             </div>
                             <input
                               type="range"
                               min="0"
                               max="1000"
                               step="100"
                               value={safeSettings.accessibility.clickHoldTime}
                               onChange={(e) => updateAccessibility('clickHoldTime', Number(e.target.value))}
                               className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                             />
                             <p className="text-xs text-slate-400 mt-1">
                                {safeSettings.accessibility.clickHoldTime === 0 
                                  ? "Instant click (Normal)" 
                                  : "Button must be held down to activate. Helps with tremors."}
                             </p>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
