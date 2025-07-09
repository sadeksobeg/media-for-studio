import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  RotateCcw,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatTime } from '@/lib/utils'
import { TimelineClip } from '@/types'

interface VideoPreviewProps {
  clips: TimelineClip[]
  currentTime: number
  duration: number
  isPlaying: boolean
  volume: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onFullscreen: () => void
}

export function VideoPreview({
  clips,
  currentTime,
  duration,
  isPlaying,
  volume,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onFullscreen
}: VideoPreviewProps) {
  const [showControls, setShowControls] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Get current clip based on current time
  const currentClip = clips.find(clip => 
    currentTime >= clip.startTime && currentTime <= clip.endTime
  )

  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    if (isPlaying && !isHovered) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    } else {
      setShowControls(true)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying, isHovered])

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
  }

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    onSeek(newTime)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    onVolumeChange(isMuted ? volume : 0)
  }

  return (
    <div className="h-full bg-black rounded-2xl overflow-hidden relative group">
      {/* Video Display Area */}
      <div 
        className="w-full h-full relative cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={isPlaying ? onPause : onPlay}
      >
        {/* Video Content */}
        {currentClip ? (
          <div className="w-full h-full flex items-center justify-center">
            {currentClip.type === 'video' ? (
              <video
                ref={videoRef}
                src={currentClip.thumbnail}
                className="max-w-full max-h-full object-contain"
                muted={isMuted}
              />
            ) : currentClip.type === 'image' ? (
              <img
                src={currentClip.thumbnail}
                alt={currentClip.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🎵</div>
                <div className="text-xl">{currentClip.name}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white/60">
              <div className="text-6xl mb-4">🎬</div>
              <div className="text-xl">No content at current time</div>
              <div className="text-sm mt-2">Add clips to the timeline to preview</div>
            </div>
          </div>
        )}

        {/* Play/Pause Overlay */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: !isPlaying && showControls ? 1 : 0,
            scale: !isPlaying && showControls ? 1 : 0.8
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-black/50 rounded-full p-6">
            <Play className="h-12 w-12 text-white fill-white" />
          </div>
        </motion.div>

        {/* Controls Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: showControls ? 1 : 0,
            y: showControls ? 0 : 20
          }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pointer-events-auto"
        >
          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={([value]) => onSeek(value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/80 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip(-10)}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={isPlaying ? onPause : onPlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 fill-white" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip(10)}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSeek(0)}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={([value]) => {
                      setIsMuted(false)
                      onVolumeChange(value)
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Timeline Position Indicator */}
        <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Current Clip Info */}
        {currentClip && (
          <div className="absolute top-4 right-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
            {currentClip.name}
          </div>
        )}
      </div>
    </div>
  )
}