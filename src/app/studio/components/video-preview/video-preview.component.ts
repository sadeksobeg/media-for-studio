import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { TimelineClip, Effect } from '../../interfaces/video-studio.interface';

@Component({
  selector: 'app-video-preview',
  templateUrl: './video-preview.component.html',
  styleUrls: ['./video-preview.component.scss']
})
export class VideoPreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  @Input() clips: TimelineClip[] = [];
  @Input() currentTime = 0;
  @Input() duration = 120;
  @Input() isPlaying = false;
  @Input() volume = 75;

  @Output() playToggle = new EventEmitter<void>();
  @Output() seek = new EventEmitter<number>();
  @Output() volumeChange = new EventEmitter<number>();
  @Output() fullscreen = new EventEmitter<void>();

  currentClip: TimelineClip | null = null;
  showControls = true;
  isMuted = false;

  private destroy$ = new Subject<void>();
  private controlsTimeout: any;

  ngOnInit(): void {
    this.updateCurrentClip();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  ngOnChanges(): void {
    this.updateCurrentClip();
  }

  updateCurrentClip(): void {
    this.currentClip = this.clips.find(clip => 
      this.currentTime >= clip.startTime && this.currentTime <= clip.endTime
    ) || null;
  }

  togglePlayPause(): void {
    this.playToggle.emit();
  }

  onSeekBarChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.seek.emit(parseFloat(target.value));
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    this.volumeChange.emit(newVolume);
    this.isMuted = newVolume === 0;
  }

  toggleMute(): void {
    if (this.isMuted) {
      this.volumeChange.emit(this.volume || 75);
      this.isMuted = false;
    } else {
      this.volumeChange.emit(0);
      this.isMuted = true;
    }
  }

  skipBackward(): void {
    this.seek.emit(Math.max(0, this.currentTime - 10));
  }

  skipForward(): void {
    this.seek.emit(Math.min(this.duration, this.currentTime + 10));
  }

  goToStart(): void {
    this.seek.emit(0);
  }

  toggleFullscreen(): void {
    this.fullscreen.emit();
  }

  onMouseMove(): void {
    this.showControls = true;
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    
    if (this.isPlaying) {
      this.controlsTimeout = setTimeout(() => {
        this.showControls = false;
      }, 3000);
    }
  }

  onMouseLeave(): void {
    if (this.isPlaying) {
      this.controlsTimeout = setTimeout(() => {
        this.showControls = false;
      }, 1000);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getVideoFilters(): string {
    if (!this.currentClip) return '';

    const filters: string[] = [];
    
    this.currentClip.effects.forEach(effect => {
      if (effect.type === 'filter') {
        const params = effect.parameters;
        
        if (params.brightness !== undefined) {
          filters.push(`brightness(${1 + params.brightness / 100})`);
        }
        if (params.contrast !== undefined) {
          filters.push(`contrast(${1 + params.contrast / 100})`);
        }
        if (params.saturation !== undefined) {
          filters.push(`saturate(${1 + params.saturation / 100})`);
        }
        if (params.blur !== undefined) {
          filters.push(`blur(${params.blur}px)`);
        }
        if (params.colorFilter) {
          switch (params.colorFilter) {
            case 'sepia':
              filters.push('sepia(100%)');
              break;
            case 'grayscale':
              filters.push('grayscale(100%)');
              break;
            case 'vintage':
              filters.push('sepia(50%) contrast(1.2) brightness(0.9)');
              break;
            case 'cool':
              filters.push('hue-rotate(180deg)');
              break;
            case 'warm':
              filters.push('hue-rotate(30deg) saturate(1.2)');
              break;
            case 'high-contrast':
              filters.push('contrast(150%)');
              break;
          }
        }
      }
    });

    return filters.join(' ');
  }

  getTextOverlays(): Effect[] {
    if (!this.currentClip) return [];
    return this.currentClip.effects.filter(effect => effect.type === 'text');
  }

  getWaveformHeight(index: number): number {
    // Simulate audio waveform with random heights
    const baseHeight = 20 + (Math.sin(this.currentTime + index) * 30);
    return Math.max(10, Math.min(90, baseHeight));
  }

  get progressPercentage(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }
}