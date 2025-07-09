import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MediaItem, TimelineClip, Track, VideoProject, ExportSettings } from '../interfaces/video-studio.interface';

@Injectable({
  providedIn: 'root'
})
export class VideoStudioService {
  private mediaItemsSubject = new BehaviorSubject<MediaItem[]>([]);
  private clipsSubject = new BehaviorSubject<TimelineClip[]>([]);
  private tracksSubject = new BehaviorSubject<Track[]>([
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
  ]);

  private currentTimeSubject = new BehaviorSubject<number>(0);
  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  private durationSubject = new BehaviorSubject<number>(120);
  private volumeSubject = new BehaviorSubject<number>(75);
  private zoomSubject = new BehaviorSubject<number>(1);

  // Observables
  mediaItems$ = this.mediaItemsSubject.asObservable();
  clips$ = this.clipsSubject.asObservable();
  tracks$ = this.tracksSubject.asObservable();
  currentTime$ = this.currentTimeSubject.asObservable();
  isPlaying$ = this.isPlayingSubject.asObservable();
  duration$ = this.durationSubject.asObservable();
  volume$ = this.volumeSubject.asObservable();
  zoom$ = this.zoomSubject.asObservable();

  // Getters
  get mediaItems(): MediaItem[] {
    return this.mediaItemsSubject.value;
  }

  get clips(): TimelineClip[] {
    return this.clipsSubject.value;
  }

  get tracks(): Track[] {
    return this.tracksSubject.value;
  }

  get currentTime(): number {
    return this.currentTimeSubject.value;
  }

  get isPlaying(): boolean {
    return this.isPlayingSubject.value;
  }

  get duration(): number {
    return this.durationSubject.value;
  }

  get volume(): number {
    return this.volumeSubject.value;
  }

  get zoom(): number {
    return this.zoomSubject.value;
  }

  // Media management
  addMediaItem(media: MediaItem): void {
    const currentItems = this.mediaItemsSubject.value;
    this.mediaItemsSubject.next([...currentItems, media]);
  }

  removeMediaItem(id: string): void {
    const currentItems = this.mediaItemsSubject.value;
    this.mediaItemsSubject.next(currentItems.filter(item => item.id !== id));
    
    // Remove clips using this media
    const currentClips = this.clipsSubject.value;
    this.clipsSubject.next(currentClips.filter(clip => clip.mediaId !== id));
  }

  // Clip management
  addClip(clip: TimelineClip): void {
    const currentClips = this.clipsSubject.value;
    this.clipsSubject.next([...currentClips, clip]);
    this.updateDuration();
  }

  updateClip(updatedClip: TimelineClip): void {
    const currentClips = this.clipsSubject.value;
    this.clipsSubject.next(
      currentClips.map(clip => clip.id === updatedClip.id ? updatedClip : clip)
    );
    this.updateDuration();
  }

  removeClip(clipId: string): void {
    const currentClips = this.clipsSubject.value;
    this.clipsSubject.next(currentClips.filter(clip => clip.id !== clipId));
    this.updateDuration();
  }

  setClips(clips: TimelineClip[]): void {
    this.clipsSubject.next(clips);
    this.updateDuration();
  }

  splitClip(clipId: string, time: number): void {
    const currentClips = this.clipsSubject.value;
    const clip = currentClips.find(c => c.id === clipId);
    
    if (!clip || time <= clip.startTime || time >= clip.endTime) return;

    const firstClip: TimelineClip = {
      ...clip,
      id: this.generateId(),
      endTime: time,
      duration: time - clip.startTime,
      trimEnd: clip.trimEnd + (clip.endTime - time)
    };

    const secondClip: TimelineClip = {
      ...clip,
      id: this.generateId(),
      startTime: time,
      duration: clip.endTime - time,
      trimStart: clip.trimStart + (time - clip.startTime)
    };

    this.clipsSubject.next(
      currentClips.filter(c => c.id !== clipId).concat([firstClip, secondClip])
    );
    this.updateDuration();
  }

  // Track management
  addTrack(track: Track): void {
    const currentTracks = this.tracksSubject.value;
    this.tracksSubject.next([...currentTracks, track]);
  }

  updateTrack(updatedTrack: Track): void {
    const currentTracks = this.tracksSubject.value;
    this.tracksSubject.next(
      currentTracks.map(track => track.id === updatedTrack.id ? updatedTrack : track)
    );
  }

  removeTrack(trackId: string): void {
    const currentTracks = this.tracksSubject.value;
    this.tracksSubject.next(currentTracks.filter(track => track.id !== trackId));
    
    // Remove clips on this track
    const currentClips = this.clipsSubject.value;
    this.clipsSubject.next(currentClips.filter(clip => clip.trackId !== trackId));
    this.updateDuration();
  }

  setTracks(tracks: Track[]): void {
    this.tracksSubject.next(tracks);
  }

  // Playback controls
  play(): void {
    this.isPlayingSubject.next(true);
  }

  pause(): void {
    this.isPlayingSubject.next(false);
  }

  stop(): void {
    this.isPlayingSubject.next(false);
    this.currentTimeSubject.next(0);
  }

  seek(time: number): void {
    this.currentTimeSubject.next(Math.max(0, Math.min(time, this.duration)));
  }

  setVolume(volume: number): void {
    this.volumeSubject.next(Math.max(0, Math.min(volume, 100)));
  }

  setZoom(zoom: number): void {
    this.zoomSubject.next(Math.max(0.1, Math.min(zoom, 2)));
  }

  setDuration(duration: number): void {
    this.durationSubject.next(Math.max(1, duration));
  }

  private updateDuration(): void {
    const clips = this.clipsSubject.value;
    if (clips.length === 0) {
      this.setDuration(120); // Default duration
      return;
    }

    const maxEndTime = Math.max(...clips.map(clip => clip.endTime));
    this.setDuration(Math.max(maxEndTime, 120));
  }

  // Video effects and filters
  applyEffect(clipId: string, effect: any): void {
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      const updatedClip = {
        ...clip,
        effects: [...clip.effects, effect]
      };
      this.updateClip(updatedClip);
    }
  }

  removeEffect(clipId: string, effectId: string): void {
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      const updatedClip = {
        ...clip,
        effects: clip.effects.filter(e => e.id !== effectId)
      };
      this.updateClip(updatedClip);
    }
  }

  // Utility methods
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  // Project management
  newProject(): void {
    this.clipsSubject.next([]);
    this.mediaItemsSubject.next([]);
    this.currentTimeSubject.next(0);
    this.durationSubject.next(120);
    this.isPlayingSubject.next(false);
    this.volumeSubject.next(75);
    this.zoomSubject.next(1);
  }

  exportProject(settings: ExportSettings): Observable<any> {
    // This would integrate with your backend export service
    console.log('Exporting project with settings:', settings);
    return new Observable(observer => {
      // Simulate export process
      setTimeout(() => {
        observer.next({ success: true, url: 'exported-video.mp4' });
        observer.complete();
      }, 3000);
    });
  }

  // Advanced video processing methods
  adjustBrightness(clipId: string, value: number): void {
    this.applyEffect(clipId, {
      id: this.generateId(),
      name: 'Brightness',
      type: 'filter',
      parameters: { brightness: value }
    });
  }

  adjustContrast(clipId: string, value: number): void {
    this.applyEffect(clipId, {
      id: this.generateId(),
      name: 'Contrast',
      type: 'filter',
      parameters: { contrast: value }
    });
  }

  adjustSaturation(clipId: string, value: number): void {
    this.applyEffect(clipId, {
      id: this.generateId(),
      name: 'Saturation',
      type: 'filter',
      parameters: { saturation: value }
    });
  }

  applyBlur(clipId: string, value: number): void {
    this.applyEffect(clipId, {
      id: this.generateId(),
      name: 'Blur',
      type: 'filter',
      parameters: { blur: value }
    });
  }

  applyColorFilter(clipId: string, filterType: string): void {
    this.applyEffect(clipId, {
      id: this.generateId(),
      name: filterType,
      type: 'filter',
      parameters: { colorFilter: filterType }
    });
  }

  addTransition(fromClipId: string, toClipId: string, transitionType: string, duration: number): void {
    const transition = {
      id: this.generateId(),
      name: `${transitionType} Transition`,
      type: 'transition',
      parameters: {
        transitionType,
        duration,
        fromClipId,
        toClipId
      }
    };

    // Apply transition to both clips
    this.applyEffect(fromClipId, transition);
    this.applyEffect(toClipId, transition);
  }
}