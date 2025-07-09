import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { TimelineClip, Track } from '../../interfaces/video-studio.interface';

@Component({
  selector: 'app-video-timeline',
  templateUrl: './video-timeline.component.html',
  styleUrls: ['./video-timeline.component.scss']
})
export class VideoTimelineComponent implements OnInit, OnDestroy {
  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;

  @Input() clips: TimelineClip[] = [];
  @Input() tracks: Track[] = [];
  @Input() currentTime = 0;
  @Input() duration = 120;
  @Input() zoom = 1;
  @Input() selectedClipId: string | null = null;

  @Output() clipSelected = new EventEmitter<string>();
  @Output() clipUpdated = new EventEmitter<TimelineClip>();
  @Output() clipDeleted = new EventEmitter<string>();
  @Output() clipSplit = new EventEmitter<{ clipId: string; time: number }>();
  @Output() trackAdded = new EventEmitter<Track>();
  @Output() trackUpdated = new EventEmitter<Track>();
  @Output() trackDeleted = new EventEmitter<string>();
  @Output() timelineSeek = new EventEmitter<number>();
  @Output() zoomChanged = new EventEmitter<number>();

  private destroy$ = new Subject<void>();
  private isDragging = false;
  private isResizing = false;
  private dragStartX = 0;
  private dragStartTime = 0;
  private resizeHandle: 'left' | 'right' | null = null;
  private draggedClip: TimelineClip | null = null;

  ngOnInit(): void {
    this.setupMouseEvents();
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
    if (this.isDragging || this.isResizing) return;
    
    if (!this.timelineContainer) return;
    
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = x / this.pixelsPerSecond;
    this.timelineSeek.emit(this.clamp(time, 0, this.duration));
  }

  selectClip(clipId: string): void {
    this.clipSelected.emit(clipId);
  }

  deleteClip(clipId: string): void {
    this.clipDeleted.emit(clipId);
  }

  splitClip(clipId: string): void {
    this.clipSplit.emit({ clipId, time: this.currentTime });
  }

  toggleTrackMute(track: Track): void {
    this.trackUpdated.emit({ ...track, muted: !track.muted });
  }

  toggleTrackVisibility(track: Track): void {
    this.trackUpdated.emit({ ...track, visible: !track.visible });
  }

  toggleTrackLock(track: Track): void {
    this.trackUpdated.emit({ ...track, locked: !track.locked });
  }

  addVideoTrack(): void {
    const videoTracks = this.tracks.filter(t => t.type === 'video');
    this.trackAdded.emit({
      id: this.generateId(),
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
    this.trackAdded.emit({
      id: this.generateId(),
      name: `Audio ${audioTracks.length + 1}`,
      type: 'audio',
      height: 60,
      muted: false,
      locked: false,
      visible: true
    });
  }

  onZoomChange(zoom: number): void {
    this.zoomChanged.emit(zoom);
  }

  onZoomSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.zoomChanged.emit(parseFloat(target.value));
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
    const colors = {
      video: '#3b82f6',
      audio: '#10b981',
      image: '#8b5cf6'
    };
    return colors[clip.type] || '#6b7280';
  }

  startDrag(event: MouseEvent, clip: TimelineClip): void {
    if (this.isResizing) return;
    
    event.preventDefault();
    this.isDragging = true;
    this.draggedClip = clip;
    this.dragStartX = event.clientX;
    this.dragStartTime = clip.startTime;
    
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  startResize(event: MouseEvent, clip: TimelineClip, handle: 'left' | 'right'): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeHandle = handle;
    this.draggedClip = clip;
    this.dragStartX = event.clientX;
    
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private setupMouseEvents(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.draggedClip) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaTime = deltaX / this.pixelsPerSecond;

    if (this.isDragging) {
      const newStartTime = Math.max(0, this.dragStartTime + deltaTime);
      const snappedStartTime = Math.round(newStartTime * 4) / 4; // Snap to quarter seconds

      const updatedClip: TimelineClip = {
        ...this.draggedClip,
        startTime: snappedStartTime,
        endTime: snappedStartTime + this.draggedClip.duration
      };

      this.clipUpdated.emit(updatedClip);
    } else if (this.isResizing && this.resizeHandle) {
      let updatedClip: TimelineClip;

      if (this.resizeHandle === 'left') {
        const newStartTime = Math.max(0, this.draggedClip.startTime + deltaTime);
        const newDuration = this.draggedClip.endTime - newStartTime;
        
        if (newDuration > 0.1) { // Minimum duration
          updatedClip = {
            ...this.draggedClip,
            startTime: newStartTime,
            duration: newDuration,
            trimStart: this.draggedClip.trimStart + deltaTime
          };
          this.clipUpdated.emit(updatedClip);
        }
      } else {
        const newEndTime = Math.max(this.draggedClip.startTime + 0.1, this.draggedClip.endTime + deltaTime);
        const newDuration = newEndTime - this.draggedClip.startTime;
        
        updatedClip = {
          ...this.draggedClip,
          endTime: newEndTime,
          duration: newDuration,
          trimEnd: Math.max(0, this.draggedClip.trimEnd - deltaTime)
        };
        this.clipUpdated.emit(updatedClip);
      }
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.draggedClip = null;
    
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getWaveformHeight(index: number): number {
    return 20 + Math.random() * 60;
  }

  getClipWaveformHeight(index: number): number {
    return 20 + Math.random() * 60;
  }

  trackByTrackId(index: number, track: Track): string {
    return track.id;
  }

  trackByClipId(index: number, clip: TimelineClip): string {
    return clip.id;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Expose Math for template
  Math = Math;
}