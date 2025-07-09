export interface MediaItem {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  duration: number
  thumbnail: string
  url: string
  size: number
  createdAt: Date
}

export interface TimelineClip {
  id: string
  mediaId: string
  trackId: string
  startTime: number
  endTime: number
  duration: number
  trimStart: number
  trimEnd: number
  name: string
  type: 'video' | 'audio' | 'image'
  thumbnail: string
  volume: number
  muted: boolean
  effects: Effect[]
}

export interface Track {
  id: string
  name: string
  type: 'video' | 'audio'
  height: number
  muted: boolean
  locked: boolean
  visible: boolean
}

export interface Effect {
  id: string
  name: string
  type: 'filter' | 'transition' | 'text'
  parameters: Record<string, any>
}

export interface Project {
  id: string
  name: string
  duration: number
  fps: number
  resolution: {
    width: number
    height: number
  }
  tracks: Track[]
  clips: TimelineClip[]
  createdAt: Date
  updatedAt: Date
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'avi'
  quality: 'low' | 'medium' | 'high' | 'ultra'
  resolution: '720p' | '1080p' | '4k'
  fps: 24 | 30 | 60
}