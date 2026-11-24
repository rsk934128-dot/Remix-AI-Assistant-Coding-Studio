export type Role = 'user' | 'assistant';

export type AssistantMode = 'general' | 'citizen' | 'coding' | 'writing' | 'research' | 'learning';

export interface GroundingWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingWeb;
}

export interface GeneratedImageMetadata {
  url: string;
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  mimeType?: string;
  model?: string;
  source?: 'gemini' | 'ai-synthesis';
  width?: number;
  height?: number;
  createdAt?: number;
}

export interface SmartReplySuggestion {
  text: string;
  type: 'question' | 'action';
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  groundingChunks?: GroundingChunk[];
  searchQueries?: string[];
  mode?: AssistantMode;
  error?: string;
  generatedImage?: GeneratedImageMetadata;
  smartReplies?: SmartReplySuggestion[];
  isGeneratingSmartReplies?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  mode: AssistantMode;
  enableSearch: boolean;
  isGeneratingTitle?: boolean;
  isPinned?: boolean;
  pinnedAt?: number;
}

export interface QuickPrompt {
  id: string;
  category: 'coding' | 'writing' | 'learning' | 'research' | 'daily';
  titleBn: string;
  titleEn: string;
  prompt: string;
  descriptionBn: string;
  icon: string;
}

export interface MusicTrack {
  videoId: string;
  title: string;
  artist?: string;
  originalUrl?: string;
  searchQuery?: string;
  thumbnail?: string;
  duration?: string;
  playedAt?: number;
  category?: string;
  isFavorite?: boolean;
}

export interface YouTubeUserProfile {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

export interface YouTubePlaylistItem {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  thumbnail: string;
  publishedAt?: string;
}
