import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { VideoStudioService } from '../../services/video-studio.service';
import { TimelineClip } from '../../interfaces/video-studio.interface';

@Component({
  selector: 'app-video-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-preview.component.html',
  styleUrls: ['./video-preview.component.scss']
})
export class VideoPreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  clips: TimelineClip[] = [];
  currentTime = 0;
  duration = 120;
  isPlaying = false;
  volume = 75;
  isMuted = false;
  showControls = true;
  currentClip: TimelineClip | null = null;

  private destroy$ = new Subject<void>();
  private controlsTimeout: any;

  constructor(private videoStudioService: VideoStudioService) {}

  ngOnInit(): void {
    combineLatest([
      this.videoStudioService.clips$,
      this.videoStudioService.currentTime$,
      this.videoStudioService.duration$,
      this.videoStudioService.isPlaying$,
      this.videoStudioService.volume$
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([clips, currentTime, duration, isPlaying, volume]) => {
        this.clips = clips;
        this.currentTime = currentTime;
        this.duration = duration;
        this.isPlaying = isPlaying;
        this.volume = volume;
        this.updateCurrentClip();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  updateCurrentClip(): void {
    this.currentClip = this.clips.find(clip => 
      this.currentTime >= clip.startTime && this.currentTime <= clip.endTime
    ) || null;
  }

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

  seek(time: number): void {
    this.videoStudioService.seek(time);
  }

  onSeekBarChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.seek(parseFloat(target.value));
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    this.videoStudioService.setVolume(newVolume);
    this.isMuted = newVolume === 0;
  }

  toggleMute(): void {
    if (this.isMuted) {
      this.videoStudioService.setVolume(this.volume || 75);
      this.isMuted = false;
    } else {
      this.videoStudioService.setVolume(0);
      this.isMuted = true;
    }
  }

  skipBackward(): void {
    this.seek(Math.max(0, this.currentTime - 10));
  }

  skipForward(): void {
    this.seek(Math.min(this.duration, this.currentTime + 10));
  }

  goToStart(): void {
    this.seek(0);
  }

  toggleFullscreen(): void {
    const element = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      element.requestFullscreen();
    }
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
    return this.videoStudioService.formatTime(seconds);
  }

  get progressPercentage(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }
}