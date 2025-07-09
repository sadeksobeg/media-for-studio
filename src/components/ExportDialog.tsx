import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Settings, Film, Zap, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ExportSettings } from '@/types'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (settings: ExportSettings) => void
  duration: number
}

export function ExportDialog({ open, onOpenChange, onExport, duration }: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    fps: 30
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const formatOptions = [
    { value: 'mp4', label: 'MP4 (Recommended)', description: 'Best compatibility' },
    { value: 'mov', label: 'MOV', description: 'High quality, larger file' },
    { value: 'avi', label: 'AVI', description: 'Uncompressed, very large' }
  ]

  const qualityOptions = [
    { value: 'low', label: 'Low', description: 'Smaller file, lower quality', bitrate: '1 Mbps' },
    { value: 'medium', label: 'Medium', description: 'Balanced quality and size', bitrate: '5 Mbps' },
    { value: 'high', label: 'High', description: 'Great quality, larger file', bitrate: '10 Mbps' },
    { value: 'ultra', label: 'Ultra', description: 'Maximum quality, largest file', bitrate: '20 Mbps' }
  ]

  const resolutionOptions = [
    { value: '720p', label: '720p HD', description: '1280 × 720' },
    { value: '1080p', label: '1080p Full HD', description: '1920 × 1080' },
    { value: '4k', label: '4K Ultra HD', description: '3840 × 2160' }
  ]

  const fpsOptions = [
    { value: 24, label: '24 fps', description: 'Cinematic' },
    { value: 30, label: '30 fps', description: 'Standard' },
    { value: 60, label: '60 fps', description: 'Smooth motion' }
  ]

  const getEstimatedFileSize = () => {
    const bitrates = { low: 1, medium: 5, high: 10, ultra: 20 }
    const resolutionMultipliers = { '720p': 1, '1080p': 2.25, '4k': 9 }
    const fpsMultiplier = settings.fps / 30
    
    const baseBitrate = bitrates[settings.quality]
    const resolutionMultiplier = resolutionMultipliers[settings.resolution]
    const estimatedMB = (baseBitrate * resolutionMultiplier * fpsMultiplier * duration) / 8
    
    return estimatedMB > 1024 
      ? `${(estimatedMB / 1024).toFixed(1)} GB`
      : `${estimatedMB.toFixed(0)} MB`
  }

  const getEstimatedTime = () => {
    const baseTime = duration * 0.5 // Base processing time
    const qualityMultiplier = { low: 0.5, medium: 1, high: 1.5, ultra: 2.5 }[settings.quality]
    const resolutionMultiplier = { '720p': 1, '1080p': 2, '4k': 4 }[settings.resolution]
    
    const estimatedSeconds = baseTime * qualityMultiplier * resolutionMultiplier
    const minutes = Math.floor(estimatedSeconds / 60)
    const seconds = Math.floor(estimatedSeconds % 60)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          onExport(settings)
          onOpenChange(false)
          return 100
        }
        return prev + Math.random() * 10
      })
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Video
          </DialogTitle>
        </DialogHeader>

        {!isExporting ? (
          <div className="space-y-6">
            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={settings.format}
                  onValueChange={(value: any) => setSettings(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Quality & Resolution */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Quality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={settings.quality}
                    onValueChange={(value: any) => setSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {qualityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.bitrate}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Resolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={settings.resolution}
                    onValueChange={(value: any) => setSettings(prev => ({ ...prev, resolution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resolutionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Frame Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Frame Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {fpsOptions.map(option => (
                    <Button
                      key={option.value}
                      variant={settings.fps === option.value ? 'default' : 'outline'}
                      onClick={() => setSettings(prev => ({ ...prev, fps: option.value }))}
                      className="flex flex-col h-auto py-3"
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs opacity-70">{option.description}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{getEstimatedFileSize()}</div>
                    <div className="text-sm text-muted-foreground">Estimated Size</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{getEstimatedTime()}</div>
                    <div className="text-sm text-muted-foreground">Processing Time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{settings.format.toUpperCase()}</div>
                    <div className="text-sm text-muted-foreground">Format</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Download className="h-12 w-12 text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold mt-4">Exporting Video...</h3>
              <p className="text-muted-foreground">
                Processing your video with {settings.quality} quality at {settings.resolution}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          </div>
        )}

        <DialogFooter>
          {!isExporting ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} className="min-w-[120px]">
                <Download className="h-4 w-4 mr-2" />
                Export Video
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsExporting(false)}>
              Cancel Export
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}