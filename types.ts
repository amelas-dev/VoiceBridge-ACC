
export type Category = 'General' | 'Needs' | 'Feelings' | 'People' | 'Places' | 'Actions' | 'Connectors' | 'Phrases' | 'Greetings' | 'Responses' | 'Keyboard' | 'Saved' | 'Settings';

export interface TileData {
  id: string;
  label: string;
  emoji: string;
  color: string;
  category: Category;
  textToSpeak?: string; // Optional override for TTS
  isNavigation?: boolean; // Optional flag for navigation tiles (Back buttons)
  imageUrl?: string; // Optional generated image URL
}

export interface Vocabulary {
  [key: string]: TileData[];
}

export interface UserSettings {
  tileSize: number; // Height in pixels
  textSize: number; // Font size in pixels
  voiceName: string; // Gemini TTS Voice Name
  sidebarPosition: 'left' | 'right'; // Screen side for navigation
}
