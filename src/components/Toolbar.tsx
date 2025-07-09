import React from 'react'
import { motion } from 'framer-motion'
import {
  Scissors,
  Copy,
  Trash2,
  Undo,
  Redo,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Save,
  FolderOpen,
  Settings,
  Palette,
  Type,
  Sparkles,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ToolbarProps {
  isPlaying: boolean
  canUndo: boolean
  canRedo: boolean
  selectedClipId: string | null
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onUndo: () => void
  onRedo: () => void
  onCut: () => void
  onCopy: () => void
  onDelete: () => void
  onSplit: () => void
  onExport: () => void
  onSave: () => void
  onLoad: () => void
  onNewProject: () => void
}

export function Toolbar({
  isPlaying,
  canUndo,
  canRedo,
  selectedClipId,
  onPlay,
  onPause,
  onStop,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onDelete,
  onSplit,
  onExport,
  onSave,
  onLoad,
  onNewProject
}: ToolbarProps) {
  const toolGroups = [
    {
      name: 'Project',
      tools: [
        { icon: FolderOpen, label: 'New Project', action: onNewProject, shortcut: 'Ctrl+N' },
        { icon: Save, label: 'Save', action: onSave, shortcut: 'Ctrl+S' },
        { icon: Download, label: 'Export', action: onExport, shortcut: 'Ctrl+E', variant: 'default' as const },
      ]
    },
    {
      name: 'Playback',
      tools: [
        { icon: SkipBack, label: 'Previous', action: () => {}, shortcut: 'Left' },
        { 
          icon: isPlaying ? Pause : Play, 
          label: isPlaying ? 'Pause' : 'Play', 
          action: isPlaying ? onPause : onPlay, 
          shortcut: 'Space',
          variant: 'default' as const
        },
        { icon: Square, label: 'Stop', action: onStop, shortcut: 'Ctrl+.' },
        { icon: SkipForward, label: 'Next', action: () => {}, shortcut: 'Right' },
      ]
    },
    {
      name: 'Edit',
      tools: [
        { icon: Undo, label: 'Undo', action: onUndo, disabled: !canUndo, shortcut: 'Ctrl+Z' },
        { icon: Redo, label: 'Redo', action: onRedo, disabled: !canRedo, shortcut: 'Ctrl+Y' },
        { icon: Scissors, label: 'Cut', action: onCut, disabled: !selectedClipId, shortcut: 'Ctrl+X' },
        { icon: Copy, label: 'Copy', action: onCopy, disabled: !selectedClipId, shortcut: 'Ctrl+C' },
        { icon: Trash2, label: 'Delete', action: onDelete, disabled: !selectedClipId, shortcut: 'Del' },
      ]
    },
    {
      name: 'Tools',
      tools: [
        { icon: Scissors, label: 'Split', action: onSplit, disabled: !selectedClipId, shortcut: 'S' },
        { icon: Type, label: 'Add Text', action: () => {}, shortcut: 'T' },
        { icon: Sparkles, label: 'Effects', action: () => {}, shortcut: 'E' },
        { icon: Layers, label: 'Transitions', action: () => {}, shortcut: 'Shift+T' },
      ]
    }
  ]

  return (
    <div className="bg-card border-b px-4 py-2">
      <div className="flex items-center gap-1">
        {toolGroups.map((group, groupIndex) => (
          <React.Fragment key={group.name}>
            {groupIndex > 0 && <Separator orientation="vertical" className="h-8 mx-2" />}
            <div className="flex items-center gap-1">
              {group.tools.map((tool) => (
                <Tooltip key={tool.label}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant={tool.variant || 'ghost'}
                        size="icon"
                        onClick={tool.action}
                        disabled={tool.disabled}
                        className={`h-9 w-9 ${
                          tool.variant === 'default' 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : ''
                        }`}
                      >
                        <tool.icon className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div>{tool.label}</div>
                      {tool.shortcut && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {tool.shortcut}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}