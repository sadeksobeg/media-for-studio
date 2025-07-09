import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import { 
  Plus, 
  Minus, 
  Scissors, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { TimelineClip, Track, MediaItem } from '@/types'
import { formatTime, generateId, clamp } from '@/lib/utils'
import { TimelineClipComponent } from './TimelineClip'

interface TimelineProps {
  clips: TimelineClip[]
  tracks: Track[]
  duration: number
  currentTime: number
  zoom: number
  onClipAdd: (clip: TimelineClip) => void
  onClipUpdate: (clip: TimelineClip) => void
  onClipDelete: (clipId: string) => void
  onClipSplit: (clipId: string, time: number) => void
  onTrackAdd: (track: Track) => void
  onTrackUpdate: (track: Track) => void
  onTrackDelete: (trackId: string) => void
  onCurrentTimeChange: (time: number) => void
  onZoomChange: (zoom: number) => void
  onDurationChange: (duration: number) => void
}

export function Timeline({
  clips,
  tracks,
  duration,
  currentTime,
  zoom,
  onClipAdd,
  onClipUpdate,
  onClipDelete,
  onClipSplit,
  onTrackAdd,
  onTrackUpdate,
  onTrackDelete,
  onCurrentTimeChange,
  onZoomChange,
  onDurationChange
}: TimelineProps) {
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [draggedClip, setDraggedClip] = useState<TimelineClip | null>(null)
  const [isResizing, setIsResizing] = useState<{ clipId: string; handle: 'left' | 'right' } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Calculate pixel per second based on zoom
  const pixelsPerSecond = zoom * 10

  // Timeline width in pixels
  const timelineWidth = duration * pixelsPerSecond

  // Time markers for the ruler
  const timeMarkers = []
  const markerInterval = Math.max(1, Math.floor(10 / zoom))
  for (let i = 0; i <= duration; i += markerInterval) {
    timeMarkers.push(i)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const clipId = event.active.id as string
    const clip = clips.find(c => c.id === clipId)
    if (clip) {
      setDraggedClip(clip)
      setActiveClipId(clipId)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event
    
    if (!over || !draggedClip) {
      setDraggedClip(null)
      setActiveClipId(null)
      return
    }

    const trackId = over.id as string
    const track = tracks.find(t => t.id === trackId)
    
    if (!track) {
      setDraggedClip(null)
      setActiveClipId(null)
      return
    }

    // Calculate new position based on drag delta
    const timeOffset = delta.x / pixelsPerSecond
    const newStartTime = Math.max(0, draggedClip.startTime + timeOffset)
    const newEndTime = newStartTime + draggedClip.duration

    // Snap to grid (optional)
    const snappedStartTime = Math.round(newStartTime * 4) / 4 // Snap to quarter seconds

    const updatedClip: TimelineClip = {
      ...draggedClip,
      trackId: track.id,
      startTime: snappedStartTime,
      endTime: snappedStartTime + draggedClip.duration
    }

    onClipUpdate(updatedClip)
    setDraggedClip(null)
    setActiveClipId(null)
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = x / pixelsPerSecond
    onCurrentTimeChange(clamp(time, 0, duration))
  }

  const handleClipResize = (clipId: string, handle: 'left' | 'right', deltaX: number) => {
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return

    const timeDelta = deltaX / pixelsPerSecond

    let updatedClip: TimelineClip

    if (handle === 'left') {
      const newStartTime = Math.max(0, clip.startTime + timeDelta)
      const newTrimStart = clip.trimStart + timeDelta
      updatedClip = {
        ...clip,
        startTime: newStartTime,
        trimStart: Math.max(0, newTrimStart),
        duration: clip.endTime - newStartTime
      }
    } else {
      const newEndTime = Math.max(clip.startTime + 0.1, clip.endTime + timeDelta)
      const newTrimEnd = clip.trimEnd - timeDelta
      updatedClip = {
        ...clip,
        endTime: newEndTime,
        trimEnd: Math.max(0, newTrimEnd),
        duration: newEndTime - clip.startTime
      }
    }

    onClipUpdate(updatedClip)
  }

  const addTrack = (type: 'video' | 'audio') => {
    const newTrack: Track = {
      id: generateId(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter(t => t.type === type).length + 1}`,
      type,
      height: type === 'video' ? 80 : 60,
      muted: false,
      locked: false,
      visible: true
    }
    onTrackAdd(newTrack)
  }

  return (
    <div className="h-full bg-card border-t flex flex-col">
      {/* Timeline Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Timeline</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTrack('video')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Video Track
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTrack('audio')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Audio Track
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="w-32">
              <Slider
                value={[zoom]}
                min={0.1}
                max={2}
                step={0.1}
                onValueChange={([value]) => onZoomChange(value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px]">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-48 bg-muted/20 border-r">
          <div className="h-12 border-b bg-muted/30 flex items-center px-4">
            <span className="text-sm font-medium">Tracks</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {tracks.map((track) => (
              <TrackHeader
                key={track.id}
                track={track}
                onUpdate={onTrackUpdate}
                onDelete={() => onTrackDelete(track.id)}
              />
            ))}
          </div>
        </div>

        {/* Timeline Area */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Time Ruler */}
            <div 
              className="h-12 bg-muted/30 border-b relative timeline-ruler"
              style={{ width: Math.max(timelineWidth, 800) }}
            >
              {timeMarkers.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <div className="w-px bg-border h-3" />
                  <div className="text-xs text-muted-foreground px-1">
                    {formatTime(time)}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Tracks */}
            <div 
              ref={timelineRef}
              className="relative"
              style={{ width: Math.max(timelineWidth, 800) }}
              onClick={handleTimelineClick}
            >
              {tracks.map((track) => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  clips={clips.filter(c => c.trackId === track.id)}
                  pixelsPerSecond={pixelsPerSecond}
                  activeClipId={activeClipId}
                  onClipSelect={setActiveClipId}
                  onClipUpdate={onClipUpdate}
                  onClipDelete={onClipDelete}
                  onClipSplit={onClipSplit}
                  onClipResize={handleClipResize}
                />
              ))}

              {/* Playhead */}
              <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                style={{ left: currentTime * pixelsPerSecond }}
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full" />
              </div>
            </div>

            <DragOverlay>
              {draggedClip && (
                <div className="drag-overlay">
                  <TimelineClipComponent
                    clip={draggedClip}
                    pixelsPerSecond={pixelsPerSecond}
                    isActive={false}
                    onSelect={() => {}}
                    onUpdate={() => {}}
                    onDelete={() => {}}
                    onSplit={() => {}}
                    onResize={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  )
}

interface TrackHeaderProps {
  track: Track
  onUpdate: (track: Track) => void
  onDelete: () => void
}

function TrackHeader({ track, onUpdate, onDelete }: TrackHeaderProps) {
  return (
    <div 
      className="border-b bg-card p-3 flex flex-col gap-2"
      style={{ height: track.height + 16 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm truncate">{track.name}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdate({ ...track, muted: !track.muted })}
        >
          {track.muted ? (
            <VolumeX className="h-3 w-3" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdate({ ...track, visible: !track.visible })}
        >
          {track.visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdate({ ...track, locked: !track.locked })}
        >
          {track.locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
      </div>

      {track.type === 'audio' && (
        <div className="flex items-center gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="waveform-bar bg-primary/60 w-1 rounded-full"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TimelineTrackProps {
  track: Track
  clips: TimelineClip[]
  pixelsPerSecond: number
  activeClipId: string | null
  onClipSelect: (clipId: string) => void
  onClipUpdate: (clip: TimelineClip) => void
  onClipDelete: (clipId: string) => void
  onClipSplit: (clipId: string, time: number) => void
  onClipResize: (clipId: string, handle: 'left' | 'right', deltaX: number) => void
}

function TimelineTrack({
  track,
  clips,
  pixelsPerSecond,
  activeClipId,
  onClipSelect,
  onClipUpdate,
  onClipDelete,
  onClipSplit,
  onClipResize
}: TimelineTrackProps) {
  return (
    <div
      className="border-b bg-muted/5 relative timeline-track"
      style={{ height: track.height + 16 }}
      data-track-id={track.id}
    >
      {clips.map((clip) => (
        <TimelineClipComponent
          key={clip.id}
          clip={clip}
          pixelsPerSecond={pixelsPerSecond}
          isActive={activeClipId === clip.id}
          onSelect={() => onClipSelect(clip.id)}
          onUpdate={onClipUpdate}
          onDelete={() => onClipDelete(clip.id)}
          onSplit={(time) => onClipSplit(clip.id, time)}
          onResize={onClipResize}
        />
      ))}
    </div>
  )
}