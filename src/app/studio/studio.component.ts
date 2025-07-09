import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { VideoStudioService } from './services/video-studio.service';
import { MediaDto } from '../proxy/medias/models';
import { ProjectDto } from '../proxy/projects/models';
import { ProjectService } from '../proxy/projects/project.service';
import { 
  MediaItem, 
  TimelineClip, 
  Track, 
  ExportSettings,
  Effect,
  TextOverlay 
} from './interfaces/video-studio.interface';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  styleUrls: ['./studio.component.scss']
})
export class StudioComponent implements OnInit, OnDestroy {
  // Project state
  currentProject: ProjectDto | null = null;
  mediaItems: MediaDto[] = [];
  clips: TimelineClip[] = [];
  tracks: Track[] = [
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
  ];

  // Playback state
  isPlaying = false;
  currentTime = 0;
  duration = 120;
  volume = 75;
  zoom = 1;
  
  // Selection state
  selectedClipId: string | null = null;
  
  // History for undo/redo
  canUndo = false;
  canRedo = false;
  private history: { clips: TimelineClip[]; tracks: Track[] }[] = [];
  private historyIndex = -1;
  
  // UI state
  showExportDialog = false;
  showEffectsPanel = false;
  showTextDialog = false;
  isExporting = false;
  exportProgress = 0;
  
  // Settings
  exportSettings: ExportSettings = {
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    fps: 30
  };

  textOverlay: TextOverlay = {
    text: '',
    fontSize: 24,
    color: '#ffffff',
    x: 50,
    y: 50,
    duration: 5
  };

  private destroy$ = new Subject<void>();
  private playbackInterval: any;
  private exportInterval: any;

  constructor(
    private videoStudioService: VideoStudioService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.initializeStudio();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearIntervals();
  }

  private initializeStudio(): void {
    // Subscribe to service state
    this.videoStudioService.mediaItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.mediaItems = items;
      });

    this.videoStudioService.clips$
      .pipe(takeUntil(this.destroy$))
      .subscribe(clips => {
        this.clips = clips;
        this.updateCanUndoRedo();
      });

    this.videoStudioService.tracks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tracks => {
        this.tracks = tracks;
      });

    this.videoStudioService.currentTime$
      .pipe(takeUntil(this.destroy$))
      .subscribe(time => {
        this.currentTime = time;
      });

    this.videoStudioService.isPlaying$
      .pipe(takeUntil(this.destroy$))
      .subscribe(playing => {
        this.isPlaying = playing;
        this.handlePlaybackChange();
      });

    this.videoStudioService.duration$
      .pipe(takeUntil(this.destroy$))
      .subscribe(duration => {
        this.duration = duration;
      });

    this.videoStudioService.zoom$
      .pipe(takeUntil(this.destroy$))
      .subscribe(zoom => {
        this.zoom = zoom;
      });

    this.videoStudioService.volume$
      .pipe(takeUntil(this.destroy$))
      .subscribe(volume => {
        this.volume = volume;
      });
  }

  private handlePlaybackChange(): void {
    this.clearPlaybackInterval();

    if (this.isPlaying) {
      this.playbackInterval = setInterval(() => {
        const newTime = this.currentTime + 0.1;
        if (newTime >= this.duration) {
          this.videoStudioService.stop();
        } else {
          this.videoStudioService.seek(newTime);
        }
      }, 100);
    }
  }

  private clearPlaybackInterval(): void {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  private clearIntervals(): void {
    this.clearPlaybackInterval();
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
  }

  private saveToHistory(): void {
    const newState = { clips: [...this.clips], tracks: [...this.tracks] };
    const newHistory = this.history.slice(0, this.historyIndex + 1);
    newHistory.push(newState);
    this.history = newHistory;
    this.historyIndex = newHistory.length - 1;
    this.updateCanUndoRedo();
  }

  private updateCanUndoRedo(): void {
    this.canUndo = this.historyIndex > 0;
    this.canRedo = this.historyIndex < this.history.length - 1;
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isInputFocused(event.target)) return;

    const { ctrlKey, metaKey, shiftKey, key } = event;
    const isModifierPressed = ctrlKey || metaKey;

    if (isModifierPressed) {
      switch (key.toLowerCase()) {
        case 's':
          event.preventDefault();
          this.saveProject();
          break;
        case 'n':
          event.preventDefault();
          this.newProject();
          break;
        case 'e':
          event.preventDefault();
          this.showExportDialog = true;
          break;
        case 'z':
          event.preventDefault();
          if (shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 'y':
          event.preventDefault();
          this.redo();
          break;
        case 'x':
          event.preventDefault();
          this.cutClip();
          break;
        case 'c':
          event.preventDefault();
          this.copyClip();
          break;
      }
    } else {
      switch (key) {
        case ' ':
          event.preventDefault();
          this.togglePlayPause();
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          this.deleteClip();
          break;
        case 's':
          event.preventDefault();
          this.splitClip();
          break;
        case 't':
          event.preventDefault();
          this.addTextOverlay();
          break;
      }
    }
  }

  private isInputFocused(target: any): boolean {
    return target instanceof HTMLInputElement ||
           target instanceof HTMLTextAreaElement ||
           target instanceof HTMLSelectElement;
  }

  private setupKeyboardShortcuts(): void {
    // Additional keyboard shortcut setup if needed
  }

  // Playback controls
  togglePlayPause(): void {
    if (this.isPlaying) {
      this.videoStudioService.pause();
    } else {
      this.videoStudioService.play();
    }
  }

  stop(): void {
    this.videoStudioService.stop();
  }

  onSeek(time: number): void {
    this.videoStudioService.seek(time);
  }

  onVolumeChange(volume: number): void {
    this.videoStudioService.setVolume(volume);
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  // Project management
  newProject(): void {
    if (confirm('Are you sure you want to create a new project? Unsaved changes will be lost.')) {
      this.videoStudioService.newProject();
      this.currentProject = null;
      this.selectedClipId = null;
      this.history = [];
      this.historyIndex = -1;
      this.updateCanUndoRedo();
    }
  }

  saveProject(): void {
    if (this.currentProject) {
      // Update existing project
      const updateDto = {
        title: this.currentProject.title,
        description: this.currentProject.description
      };
      
      this.projectService.update(this.currentProject.id!, updateDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (project) => {
            this.currentProject = project;
            console.log('Project saved successfully');
          },
          error: (error) => {
            console.error('Failed to save project:', error);
          }
        });
    } else {
      // Create new project
      const createDto = {
        title: 'New Video Project',
        description: 'Created in Video Studio'
      };
      
      this.projectService.create(createDto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (project) => {
            this.currentProject = project;
            console.log('Project created and saved');
          },
          error: (error) => {
            console.error('Failed to create project:', error);
          }
        });
    }
  }

  // Edit operations
  undo(): void {
    if (this.canUndo) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.clips = [...state.clips];
      this.tracks = [...state.tracks];
      this.videoStudioService.setClips(this.clips);
      this.videoStudioService.setTracks(this.tracks);
      this.updateCanUndoRedo();
    }
  }

  redo(): void {
    if (this.canRedo) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.clips = [...state.clips];
      this.tracks = [...state.tracks];
      this.videoStudioService.setClips(this.clips);
      this.videoStudioService.setTracks(this.tracks);
      this.updateCanUndoRedo();
    }
  }

  cutClip(): void {
    if (this.selectedClipId) {
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) {
        // Store in clipboard (simplified)
        localStorage.setItem('clipboard-clip', JSON.stringify(clip));
        this.deleteClip();
      }
    }
  }

  copyClip(): void {
    if (this.selectedClipId) {
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) {
        localStorage.setItem('clipboard-clip', JSON.stringify(clip));
      }
    }
  }

  deleteClip(): void {
    if (this.selectedClipId) {
      this.saveToHistory();
      this.videoStudioService.removeClip(this.selectedClipId);
      this.selectedClipId = null;
    }
  }

  splitClip(): void {
    if (this.selectedClipId) {
      this.saveToHistory();
      this.videoStudioService.splitClip(this.selectedClipId, this.currentTime);
    }
  }

  // Tool functions
  addTextOverlay(): void {
    this.showTextDialog = true;
  }

  applyTextOverlay(): void {
    if (this.textOverlay.text && this.selectedClipId) {
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) {
        const textEffect: Effect = {
          id: this.videoStudioService.generateId(),
          name: 'Text Overlay',
          type: 'text',
          parameters: {
            text: this.textOverlay.text,
            fontSize: this.textOverlay.fontSize,
            color: this.textOverlay.color,
            x: this.textOverlay.x,
            y: this.textOverlay.y,
            duration: this.textOverlay.duration
          }
        };

        this.saveToHistory();
        const updatedClip = {
          ...clip,
          effects: [...clip.effects, textEffect]
        };
        this.videoStudioService.updateClip(updatedClip);
      }
    }
    this.showTextDialog = false;
    this.resetTextOverlay();
  }

  private resetTextOverlay(): void {
    this.textOverlay = {
      text: '',
      fontSize: 24,
      color: '#ffffff',
      x: 50,
      y: 50,
      duration: 5
    };
  }

  openEffectsPanel(): void {
    this.showEffectsPanel = !this.showEffectsPanel;
  }

  openTransitionsPanel(): void {
    // Implement transitions panel
    console.log('Opening transitions panel');
  }

  // View controls
  zoomIn(): void {
    this.videoStudioService.setZoom(Math.min(2, this.zoom + 0.1));
  }

  zoomOut(): void {
    this.videoStudioService.setZoom(Math.max(0.1, this.zoom - 0.1));
  }

  onZoomChanged(zoom: number): void {
    this.videoStudioService.setZoom(zoom);
  }

  // Media handlers
  onMediaSelected(media: MediaDto): void {
    const mediaItem: MediaItem = {
      id: media.id!,
      name: media.title || 'Untitled',
      type: this.getMediaType(media.video || ''),
      duration: 30, // Default duration
      thumbnail: media.video || 'assets/images/placeholders/100x50.png',
      url: media.video || '',
      size: 0,
      createdAt: new Date()
    };

    // Add to timeline
    const videoTrack = this.tracks.find(t => t.type === 'video');
    if (videoTrack) {
      const newClip: TimelineClip = {
        id: this.videoStudioService.generateId(),
        mediaId: mediaItem.id,
        trackId: videoTrack.id,
        startTime: this.currentTime,
        endTime: this.currentTime + mediaItem.duration,
        duration: mediaItem.duration,
        trimStart: 0,
        trimEnd: 0,
        name: mediaItem.name,
        type: mediaItem.type,
        thumbnail: mediaItem.thumbnail,
        volume: 100,
        muted: false,
        effects: []
      };

      this.saveToHistory();
      this.videoStudioService.addClip(newClip);
    }
  }

  onMediaDeleted(mediaId: string): void {
    // Remove clips using this media
    const clipsToRemove = this.clips.filter(clip => clip.mediaId === mediaId);
    if (clipsToRemove.length > 0) {
      this.saveToHistory();
      clipsToRemove.forEach(clip => {
        this.videoStudioService.removeClip(clip.id);
      });
    }
  }

  onMediaUploaded(media: MediaDto): void {
    // Media uploaded, refresh the list if needed
    console.log('Media uploaded:', media);
  }

  // Timeline handlers
  onClipSelected(clipId: string): void {
    this.selectedClipId = clipId;
  }

  onClipUpdated(clip: TimelineClip): void {
    this.saveToHistory();
    this.videoStudioService.updateClip(clip);
  }

  onClipDeleted(clipId: string): void {
    this.saveToHistory();
    this.videoStudioService.removeClip(clipId);
    if (this.selectedClipId === clipId) {
      this.selectedClipId = null;
    }
  }

  onClipSplit(data: { clipId: string; time: number }): void {
    this.saveToHistory();
    this.videoStudioService.splitClip(data.clipId, data.time);
  }

  onTrackAdded(track: Track): void {
    this.saveToHistory();
    this.videoStudioService.addTrack(track);
  }

  onTrackUpdated(track: Track): void {
    this.saveToHistory();
    this.videoStudioService.updateTrack(track);
  }

  onTrackDeleted(trackId: string): void {
    this.saveToHistory();
    this.videoStudioService.removeTrack(trackId);
  }

  // Effects handlers
  onEffectApplied(data: { clipId: string; effect: Effect }): void {
    const clip = this.clips.find(c => c.id === data.clipId);
    if (clip) {
      this.saveToHistory();
      const updatedClip = {
        ...clip,
        effects: [...clip.effects, data.effect]
      };
      this.videoStudioService.updateClip(updatedClip);
    }
  }

  onEffectRemoved(data: { clipId: string; effectId: string }): void {
    const clip = this.clips.find(c => c.id === data.clipId);
    if (clip) {
      this.saveToHistory();
      const updatedClip = {
        ...clip,
        effects: clip.effects.filter(e => e.id !== data.effectId)
      };
      this.videoStudioService.updateClip(updatedClip);
    }
  }

  // Export functionality
  exportProject(): void {
    this.isExporting = true;
    this.exportProgress = 0;

    // Simulate export progress
    this.exportInterval = setInterval(() => {
      this.exportProgress += Math.random() * 10;
      if (this.exportProgress >= 100) {
        this.exportProgress = 100;
        clearInterval(this.exportInterval);
        
        setTimeout(() => {
          this.isExporting = false;
          this.showExportDialog = false;
          this.exportProgress = 0;
          
          // In a real app, you would call your backend export service
          this.videoStudioService.exportProject(this.exportSettings)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (result) => {
                console.log('Export completed:', result);
                alert('Video exported successfully!');
              },
              error: (error) => {
                console.error('Export failed:', error);
                alert('Export failed. Please try again.');
              }
            });
        }, 500);
      }
    }, 200);
  }

  cancelExport(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
    this.isExporting = false;
    this.exportProgress = 0;
    this.showExportDialog = false;
  }

  getEstimatedFileSize(): string {
    const bitrates = { low: 1, medium: 5, high: 10, ultra: 20 };
    const resolutionMultipliers = { '720p': 1, '1080p': 2.25, '4k': 9 };
    const fpsMultiplier = this.exportSettings.fps / 30;
    
    const baseBitrate = bitrates[this.exportSettings.quality];
    const resolutionMultiplier = resolutionMultipliers[this.exportSettings.resolution];
    const estimatedMB = (baseBitrate * resolutionMultiplier * fpsMultiplier * this.duration) / 8;
    
    return estimatedMB > 1024 
      ? `${(estimatedMB / 1024).toFixed(1)} GB`
      : `${estimatedMB.toFixed(0)} MB`;
  }

  getEstimatedTime(): string {
    const baseTime = this.duration * 0.5;
    const qualityMultiplier = { low: 0.5, medium: 1, high: 1.5, ultra: 2.5 }[this.exportSettings.quality];
    const resolutionMultiplier = { '720p': 1, '1080p': 2, '4k': 4 }[this.exportSettings.resolution];
    
    const estimatedSeconds = baseTime * qualityMultiplier * resolutionMultiplier;
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = Math.floor(estimatedSeconds % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getSelectedClip(): TimelineClip | null {
    return this.selectedClipId ? this.clips.find(c => c.id === this.selectedClipId) || null : null;
  }

  private getMediaType(url: string): 'video' | 'audio' | 'image' {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'avi', 'mov', 'webm'].includes(extension || '')) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) return 'audio';
    return 'image';
  }
}