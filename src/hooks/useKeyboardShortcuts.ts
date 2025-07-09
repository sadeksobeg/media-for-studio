import { useEffect } from 'react'

interface KeyboardShortcuts {
  onPlay?: () => void
  onPause?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onDelete?: () => void
  onSplit?: () => void
  onSave?: () => void
  onExport?: () => void
  onNewProject?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      const { ctrlKey, metaKey, shiftKey, key } = event
      const isModifierPressed = ctrlKey || metaKey

      // Prevent default browser shortcuts
      if (isModifierPressed) {
        switch (key.toLowerCase()) {
          case 's':
            event.preventDefault()
            shortcuts.onSave?.()
            break
          case 'n':
            event.preventDefault()
            shortcuts.onNewProject?.()
            break
          case 'e':
            event.preventDefault()
            shortcuts.onExport?.()
            break
          case 'z':
            event.preventDefault()
            if (shiftKey) {
              shortcuts.onRedo?.()
            } else {
              shortcuts.onUndo?.()
            }
            break
          case 'y':
            event.preventDefault()
            shortcuts.onRedo?.()
            break
          case 'x':
            event.preventDefault()
            shortcuts.onCut?.()
            break
          case 'c':
            event.preventDefault()
            shortcuts.onCopy?.()
            break
          case 'v':
            event.preventDefault()
            shortcuts.onPaste?.()
            break
        }
      } else {
        switch (key) {
          case ' ':
            event.preventDefault()
            // Toggle play/pause - you'll need to track play state
            shortcuts.onPlay?.()
            break
          case 'Delete':
          case 'Backspace':
            event.preventDefault()
            shortcuts.onDelete?.()
            break
          case 's':
            event.preventDefault()
            shortcuts.onSplit?.()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}