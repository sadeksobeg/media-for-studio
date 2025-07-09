import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';
import { VideoStudioService } from './services/video-studio.service';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { VideoTimelineComponent } from './components/video-timeline/video-timeline.component';
import { VideoPreviewComponent } from './components/video-preview/video-preview.component';
import { ExportSettings } from './interfaces/video-studio.interface';

@Component({
  selector: 'app-studio',
  standalone: false,
  imports: [
    CommonModule, 
    FormsModule,
    MediaLibraryComponent,
    VideoTimelineComponent,
    VideoPreviewComponent
  ],
  templateUrl: './studio.component.html',
  styleUrls: ['./studio.component.scss']
})
export class StudioComponent implements OnInit, OnDestroy {
  currentProjectName = 'Untitled Project';
  isPlaying = false;
  currentTime = 0;
  duration = 120;
  zoom = 1;
  selectedClipId: string | null = null;
  
  // History for undo/redo
  canUndo = false;
  canRedo = false;
  
  // Export dialog
  showExportDialog = false;
  isExporting = false;
  exportProgress = 0;
  exportSettings: ExportSettings = {
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    fps: 30
  };

  private destroy$ = new Subject<void>();
  private playbackInterval: any;
  private exportInterval: any;

  constructor(private videoStudioService: VideoStudioService) {}

  ngOnInit(): void {
    // Subscribe to service state
    this.videoStudioService.isPlaying$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isPlaying => {
        this.isPlaying = isPlaying;
        this.handlePlaybackChange();
      });

    this.videoStudioService.currentTime$
      .pipe(takeUntil(this.destroy$))
      .subscribe(currentTime => {
        this.currentTime = currentTime;
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

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
      }
    }
  }

  private handlePlaybackChange(): void {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }

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

  // Project management
  newProject(): void {
    if (confirm('Are you sure you want to create a new project? Unsaved changes will be lost.')) {
      this.videoStudioService.newProject();
      this.currentProjectName = 'Untitled Project';
      this.selectedClipId = null;
    }
  }

  saveProject(): void {
    // Implement save logic
    console.log('Saving project:', this.currentProjectName);
    // You could integrate with your backend here
  }

  // Edit operations
  undo(): void {
    // Implement undo logic
    console.log('Undo operation');
  }

  redo(): void {
    // Implement redo logic
    console.log('Redo operation');
  }

  cutClip(): void {
    if (this.selectedClipId) {
      console.log('Cut clip:', this.selectedClipId);
      // Implement cut logic
    }
  }

  copyClip(): void {
    if (this.selectedClipId) {
      console.log('Copy clip:', this.selectedClipId);
      // Implement copy logic
    }
  }

  deleteClip(): void {
    if (this.selectedClipId) {
      this.videoStudioService.removeClip(this.selectedClipId);
      this.selectedClipId = null;
    }
  }

  splitClip(): void {
    if (this.selectedClipId) {
      this.videoStudioService.splitClip(this.selectedClipId, this.currentTime);
    }
  }

  // View controls
  zoomIn(): void {
    this.videoStudioService.setZoom(Math.min(2, this.zoom + 0.1));
  }

  zoomOut(): void {
    this.videoStudioService.setZoom(Math.max(0.1, this.zoom - 0.1));
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
}