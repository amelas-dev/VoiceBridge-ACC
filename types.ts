
export type Category = 'General' | 'Needs' | 'Feelings' | 'People' | 'Places' | 'Actions' | 'Connectors' | 'Greetings' | 'Responses' | 'Keyboard' | 'Saved' | 'Settings';

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

export enum AppMode {
  BOARD = 'BOARD',
  LIVE = 'LIVE',
}

export interface UserSettings {
  tileSize: number; // Height in pixels
  textSize: number; // Font size in pixels
}
