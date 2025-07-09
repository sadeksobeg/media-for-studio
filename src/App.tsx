import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MediaLibrary } from '@/components/MediaLibrary'
import { VideoPreview } from '@/components/VideoPreview'
import { Timeline } from '@/components/Timeline'
import { Toolbar } from '@/components/Toolbar'
import { ExportDialog } from '@/components/ExportDialog'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { MediaItem, TimelineClip, Track, Project, ExportSettings } from '@/types'
import { generateId } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [clips, setClips] = useState<TimelineClip[]>([])
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'video-1',
      name: 'Video 1',
      type: 'video',
      height: 80,
      muted: false,
      locked: false,
      visible: true
    },
    {
      id: 'audio-1',
      name: 'Audio 1',
      type: 'audio',
      height: 60,
      muted: false,
      locked: false,
      visible: true
    }
  ])
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(120) // 2 minutes default
  const [volume, setVolume] = useState(75)
  const [zoom, setZoom] = useState(1)
  
  // Selection state
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  
  // History for undo/redo
  const [history, setHistory] = useState<{ clips: TimelineClip[]; tracks: Track[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newState = { clips, tracks }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [clips, tracks, history, historyIndex])

  // Media library handlers
  const handleMediaAdd = useCallback((media: MediaItem) => {
    setMediaItems(prev => [...prev, media])
  }, [])

  const handleMediaDelete = useCallback((id: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== id))
    // Also remove any clips using this media
    setClips(prev => prev.filter(clip => clip.mediaId !== id))
  }, [])

  const handleMediaSelect = useCallback((media: MediaItem) => {
    // Add media to timeline
    const videoTrack = tracks.find(t => t.type === 'video')
    if (!videoTrack) return

    const newClip: TimelineClip = {
      id: generateId(),
      mediaId: media.id,
      trackId: videoTrack.id,
      startTime: currentTime,
      endTime: currentTime + media.duration,
      duration: media.duration,
      trimStart: 0,
      trimEnd: 0,
      name: media.name,
      type: media.type,
      thumbnail: media.thumbnail,
      volume: 100,
      muted: false,
      effects: []
    }

    setClips(prev => [...prev, newClip])
    saveToHistory()
  }, [tracks, currentTime, saveToHistory])

  // Timeline handlers
  const handleClipAdd = useCallback((clip: TimelineClip) => {
    setClips(prev => [...prev, clip])
    saveToHistory()
  }, [saveToHistory])

  const handleClipUpdate = useCallback((updatedClip: TimelineClip) => {
    setClips(prev => prev.map(clip => clip.id === updatedClip.id ? updatedClip : clip))
    saveToHistory()
  }, [saveToHistory])

  const handleClipDelete = useCallback((clipId: string) => {
    setClips(prev => prev.filter(clip => clip.id !== clipId))
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
    }
    saveToHistory()
  }, [selectedClipId, saveToHistory])

  const handleClipSplit = useCallback((clipId: string, time: number) => {
    const clip = clips.find(c => c.id === clipId)
    if (!clip || time <= clip.startTime || time >= clip.endTime) return

    const firstClip: TimelineClip = {
      ...clip,
      id: generateId(),
      endTime: time,
      duration: time - clip.startTime,
      trimEnd: clip.trimEnd + (clip.endTime - time)
    }

    const secondClip: TimelineClip = {
      ...clip,
      id: generateId(),
      startTime: time,
      duration: clip.endTime - time,
      trimStart: clip.trimStart + (time - clip.startTime)
    }

    setClips(prev => prev.filter(c => c.id !== clipId).concat([firstClip, secondClip]))
    saveToHistory()
  }, [clips, saveToHistory])

  // Track handlers
  const handleTrackAdd = useCallback((track: Track) => {
    setTracks(prev => [...prev, track])
    saveToHistory()
  }, [saveToHistory])

  const handleTrackUpdate = useCallback((updatedTrack: Track) => {
    setTracks(prev => prev.map(track => track.id === updatedTrack.id ? updatedTrack : track))
    saveToHistory()
  }, [saveToHistory])

  const handleTrackDelete = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(track => track.id !== trackId))
    // Remove clips on this track
    setClips(prev => prev.filter(clip => clip.trackId !== trackId))
    saveToHistory()
  }, [saveToHistory])

  // Playback handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleStop = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  // History handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setClips(prevState.clips)
      setTracks(prevState.tracks)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setClips(nextState.clips)
      setTracks(nextState.tracks)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex])

  // Edit handlers
  const handleCut = useCallback(() => {
    if (selectedClipId) {
      // Implement cut logic
      console.log('Cut clip:', selectedClipId)
    }
  }, [selectedClipId])

  const handleCopy = useCallback(() => {
    if (selectedClipId) {
      // Implement copy logic
      console.log('Copy clip:', selectedClipId)
    }
  }, [selectedClipId])

  const handleDelete = useCallback(() => {
    if (selectedClipId) {
      handleClipDelete(selectedClipId)
    }
  }, [selectedClipId, handleClipDelete])

  const handleSplit = useCallback(() => {
    if (selectedClipId) {
      handleClipSplit(selectedClipId, currentTime)
    }
  }, [selectedClipId, currentTime, handleClipSplit])

  // Project handlers
  const handleNewProject = useCallback(() => {
    setClips([])
    setMediaItems([])
    setCurrentTime(0)
    setDuration(120)
    setSelectedClipId(null)
    setHistory([])
    setHistoryIndex(-1)
  }, [])

  const handleSave = useCallback(() => {
    // Implement save logic
    console.log('Save project')
  }, [])

  const handleLoad = useCallback(() => {
    // Implement load logic
    console.log('Load project')
  }, [])

  const handleExport = useCallback((settings: ExportSettings) => {
    // Implement export logic
    console.log('Export with settings:', settings)
  }, [])

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPlay: isPlaying ? handlePause : handlePlay,
    onPause: handlePause,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCut: handleCut,
    onCopy: handleCopy,
    onDelete: handleDelete,
    onSplit: handleSplit,
    onSave: handleSave,
    onExport: () => setShowExportDialog(true),
    onNewProject: handleNewProject
  })

  // Auto-save current time when playing
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 0.1
        if (newTime >= duration) {
          setIsPlaying(false)
          return duration
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, duration])

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor
  }

  const ThemeIcon = themeIcons[theme]

  return (
    <TooltipProvider>
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.h1 
              className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Video Studio Pro
            </motion.h1>
            <div className="text-sm text-muted-foreground">
              Untitled Project
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const themes: Theme[] = ['light', 'dark', 'system']
                const currentIndex = themes.indexOf(theme)
                const nextTheme = themes[(currentIndex + 1) % themes.length]
                setTheme(nextTheme)
              }}
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Toolbar */}
        <Toolbar
          isPlaying={isPlaying}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          selectedClipId={selectedClipId}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCut={handleCut}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onSplit={handleSplit}
          onExport={() => setShowExportDialog(true)}
          onSave={handleSave}
          onLoad={handleLoad}
          onNewProject={handleNewProject}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Media Library */}
          <div className="w-80 flex-shrink-0">
            <MediaLibrary
              mediaItems={mediaItems}
              onMediaAdd={handleMediaAdd}
              onMediaDelete={handleMediaDelete}
              onMediaSelect={handleMediaSelect}
            />
          </div>

          {/* Center - Video Preview and Timeline */}
          <div className="flex-1 flex flex-col">
            {/* Video Preview */}
            <div className="h-1/2 p-4">
              <VideoPreview
                clips={clips}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                volume={volume}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onVolumeChange={setVolume}
                onFullscreen={handleFullscreen}
              />
            </div>

            {/* Timeline */}
            <div className="h-1/2">
              <Timeline
                clips={clips}
                tracks={tracks}
                duration={duration}
                currentTime={currentTime}
                zoom={zoom}
                onClipAdd={handleClipAdd}
                onClipUpdate={handleClipUpdate}
                onClipDelete={handleClipDelete}
                onClipSplit={handleClipSplit}
                onTrackAdd={handleTrackAdd}
                onTrackUpdate={handleTrackUpdate}
                onTrackDelete={handleTrackDelete}
                onCurrentTimeChange={handleSeek}
                onZoomChange={setZoom}
                onDurationChange={setDuration}
              />
            </div>
          </div>
        </div>

        {/* Export Dialog */}
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          onExport={handleExport}
          duration={duration}
        />
      </div>
    </TooltipProvider>
  )
}

export default App