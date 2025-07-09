export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  thumbnail: string;
  url: string;
  size: number;
  createdAt: Date;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  endTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  name: string;
  type: 'video' | 'audio' | 'image';
  thumbnail: string;
  volume: number;
  muted: boolean;
  effects: Effect[];
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  height: number;
  muted: boolean;
  locked: boolean;
  visible: boolean;
}

export interface Effect {
  id: string;
  name: string;
  type: 'filter' | 'transition' | 'text' | 'color' | 'blur' | 'brightness';
  parameters: Record<string, any>;
}

export interface VideoProject {
  id: string;
  name: string;
  duration: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  tracks: Track[];
  clips: TimelineClip[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'avi';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
}

export interface TextOverlay {
  text: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  duration: number;
}

export interface VideoFilter {
  id: string;
  name: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'sepia' | 'grayscale';
  value: number;
  enabled: boolean;
}

export interface Transition {
  id: string;
  name: string;
  type: 'fade' | 'slide' | 'wipe' | 'dissolve';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}