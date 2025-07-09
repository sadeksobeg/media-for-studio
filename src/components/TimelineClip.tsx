import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'
import { Scissors, Volume2, VolumeX, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimelineClip } from '@/types'
import { formatTime } from '@/lib/utils'

interface TimelineClipProps {
  clip: TimelineClip
  pixelsPerSecond: number
  isActive: boolean
  onSelect: () => void
  onUpdate: (clip: TimelineClip) => void
  onDelete: () => void
  onSplit: (time: number) => void
  onResize: (clipId: string, handle: 'left' | 'right', deltaX: number) => void
}

export function TimelineClipComponent({
  clip,
  pixelsPerSecond,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onSplit,
  onResize
}: TimelineClipProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null)
  const clipRef = useRef<HTMLDivElement>(null)
  const startResizeX = useRef(0)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: clip.id,
  })

  const width = clip.duration * pixelsPerSecond
  const left = clip.startTime * pixelsPerSecond

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const handleResizeStart = (handle: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation()
    setResizeHandle(handle)
    startResizeX.current = e.clientX

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startResizeX.current
      onResize(clip.id, handle, deltaX)
      startResizeX.current = e.clientX
    }

    const handleMouseUp = () => {
      setResizeHandle(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleSplit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!clipRef.current) return
    
    const rect = clipRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const splitTime = clip.startTime + (x / pixelsPerSecond)
    onSplit(splitTime)
  }

  const getClipColor = () => {
    switch (clip.type) {
      case 'video':
        return 'bg-blue-500'
      case 'audio':
        return 'bg-green-500'
      case 'image':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        left,
        width: Math.max(width, 20),
        position: 'absolute',
        top: 8,
        height: clip.type === 'audio' ? 40 : 60,
        zIndex: isDragging ? 10 : isActive ? 5 : 1,
      }}
      className={`
        ${getClipColor()} 
        rounded-lg overflow-hidden cursor-pointer select-none
        ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${clip.muted ? 'opacity-60' : ''}
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...listeners}
      {...attributes}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div ref={clipRef} className="w-full h-full relative">
        {/* Clip Content */}
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">
                {clip.name}
              </div>
              {clip.type === 'video' && clip.thumbnail && (
                <div className="mt-1 w-8 h-6 bg-black/20 rounded overflow-hidden">
                  <img 
                    src={clip.thumbnail} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            
            {isHovered && (
              <div className="flex items-center gap-1">
                {clip.type === 'audio' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdate({ ...clip, muted: !clip.muted })
                    }}
                  >
                    {clip.muted ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white hover:bg-white/20"
                  onClick={handleSplit}
                >
                  <Scissors className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white hover:bg-white/20"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="text-white/80 text-xs">
            {formatTime(clip.duration)}
          </div>
        </div>

        {/* Audio Waveform */}
        {clip.type === 'audio' && (
          <div className="absolute bottom-1 left-2 right-2 flex items-end gap-px h-4">
            {Array.from({ length: Math.floor(width / 4) }).map((_, i) => (
              <div
                key={i}
                className="bg-white/60 rounded-full"
                style={{
                  width: '2px',
                  height: `${Math.random() * 80 + 20}%`,
                }}
              />
            ))}
          </div>
        )}

        {/* Resize Handles */}
        {isHovered && !isDragging && (
          <>
            <div
              className="resize-handle left"
              onMouseDown={(e) => handleResizeStart('left', e)}
            />
            <div
              className="resize-handle right"
              onMouseDown={(e) => handleResizeStart('right', e)}
            />
          </>
        )}

        {/* Trim Indicators */}
        {clip.trimStart > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400" />
        )}
        {clip.trimEnd > 0 && (
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-400" />
        )}

        {/* Effects Indicator */}
        {clip.effects.length > 0 && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-pink-400 rounded-full" />
        )}
      </div>
    </motion.div>
  )
}