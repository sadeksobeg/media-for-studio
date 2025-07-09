import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, DragDropModule } from '@angular/cdk/drag-drop';
import { VideoStudioService } from '../../services/video-studio.service';
import { TimelineClip, Track } from '../../interfaces/video-studio.interface';

@Component({
  selector: 'app-video-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './video-timeline.component.html',
  styleUrls: ['./video-timeline.component.scss']
})
export class VideoTimelineComponent implements OnInit, OnDestroy {
  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;

  clips: TimelineClip[] = [];
  tracks: Track[] = [];
  currentTime = 0;
  duration = 120;
  zoom = 1;
  selectedClipId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private videoStudioService: VideoStudioService) {}

  ngOnInit(): void {
    combineLatest([
      this.videoStudioService.clips$,
      this.videoStudioService.tracks$,
      this.videoStudioService.currentTime$,
      this.videoStudioService.duration$,
      this.videoStudioService.zoom$
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([clips, tracks, currentTime, duration, zoom]) => {
        this.clips = clips;
        this.tracks = tracks;
        this.currentTime = currentTime;
        this.duration = duration;
        this.zoom = zoom;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pixelsPerSecond(): number {
    return this.zoom * 10;
  }

  get timelineWidth(): number {
    return this.duration * this.pixelsPerSecond;
  }

  get timeMarkers(): number[] {
    const markers = [];
    const markerInterval = Math.max(1, Math.floor(10 / this.zoom));
    for (let i = 0; i <= this.duration; i += markerInterval) {
      markers.push(i);
    }
    return markers;
  }

  getClipsForTrack(trackId: string): TimelineClip[] {
    return this.clips.filter(clip => clip.trackId === trackId)
                    .sort((a, b) => a.startTime - b.startTime);
  }

  onTimelineClick(event: MouseEvent): void {
    if (!this.timelineContainer) return;
    
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / this.pixelsPerSecond;
    this.videoStudioService.seek(this.videoStudioService.clamp(time, 0, this.duration));
  }

  onClipDrop(event: CdkDragDrop<TimelineClip[]>): void {
    if (event.previousContainer === event.container) {
      // Reordering within same track - not implemented yet
      return;
    }

    // Moving clip to different track
    const clip = event.previousContainer.data[event.previousIndex];
    const targetTrackId = event.container.id;
    
    const updatedClip: TimelineClip = {
      ...clip,
      trackId: targetTrackId
    };

    this.videoStudioService.updateClip(updatedClip);
  }

  selectClip(clipId: string): void {
    this.selectedClipId = clipId;
  }

  deleteClip(clipId: string): void {
    this.videoStudioService.removeClip(clipId);
    if (this.selectedClipId === clipId) {
      this.selectedClipId = null;
    }
  }

  splitClip(clipId: string): void {
    this.videoStudioService.splitClip(clipId, this.currentTime);
  }

  toggleTrackMute(track: Track): void {
    this.videoStudioService.updateTrack({
      ...track,
      muted: !track.muted
    });
  }

  toggleTrackVisibility(track: Track): void {
    this.videoStudioService.updateTrack({
      ...track,
      visible: !track.visible
    });
  }

  toggleTrackLock(track: Track): void {
    this.videoStudioService.updateTrack({
      ...track,
      locked: !track.locked
    });
  }

  addVideoTrack(): void {
    const videoTracks = this.tracks.filter(t => t.type === 'video');
    this.videoStudioService.addTrack({
      id: this.videoStudioService.generateId(),
      name: `Video ${videoTracks.length + 1}`,
      type: 'video',
      height: 80,
      muted: false,
      locked: false,
      visible: true
    });
  }

  addAudioTrack(): void {
    const audioTracks = this.tracks.filter(t => t.type === 'audio');
    this.videoStudioService.addTrack({
      id: this.videoStudioService.generateId(),
      name: `Audio ${audioTracks.length + 1}`,
      type: 'audio',
      height: 60,
      muted: false,
      locked: false,
      visible: true
    });
  }

  onZoomChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.videoStudioService.setZoom(parseFloat(target.value));
  }

  getClipStyle(clip: TimelineClip): any {
    return {
      left: `${clip.startTime * this.pixelsPerSecond}px`,
      width: `${clip.duration * this.pixelsPerSecond}px`,
      height: '60px',
      position: 'absolute',
      top: '8px'
    };
  }

  getClipColor(clip: TimelineClip): string {
    switch (clip.type) {
      case 'video':
        return '#3b82f6'; // blue
      case 'audio':
        return '#10b981'; // green
      case 'image':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  }

  formatTime(seconds: number): string {
    return this.videoStudioService.formatTime(seconds);
  }
}