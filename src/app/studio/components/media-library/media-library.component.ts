import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { VideoStudioService } from '../../services/video-studio.service';
import { MediaService } from '../../../proxy/medias/media.service';
import { MediaItem } from '../../interfaces/video-studio.interface';
import { MediaDto } from '../../../proxy/medias/models';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  mediaItems: MediaItem[] = [];
  searchTerm = '';
  viewMode: 'grid' | 'list' = 'grid';
  selectedMedia: MediaItem | null = null;
  isDragOver = false;
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private videoStudioService: VideoStudioService,
    private mediaService: MediaService
  ) {}

  ngOnInit(): void {
    this.videoStudioService.mediaItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.mediaItems = items;
      });

    this.loadExistingMedia();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredMedia(): MediaItem[] {
    return this.mediaItems.filter(item =>
      item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  loadExistingMedia(): void {
    this.isLoading = true;
    this.mediaService.getList({ maxResultCount: 100, skipCount: 0, sorting: '' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.items) {
            response.items.forEach(mediaDto => {
              const mediaItem: MediaItem = {
                id: mediaDto.id!,
                name: mediaDto.title || 'Untitled',
                type: this.getMediaType(mediaDto.video || ''),
                duration: 30, // Default duration, should be extracted from actual media
                thumbnail: mediaDto.video || 'assets/images/placeholders/100x50.png',
                url: mediaDto.video || '',
                size: 0, // Should be extracted from metadata
                createdAt: new Date()
              };
              this.videoStudioService.addMediaItem(mediaItem);
            });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading media:', error);
          this.isLoading = false;
        }
      });
  }

  onFileUpload(files: FileList | null): void {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (this.isValidMediaFile(file)) {
        this.uploadFile(file);
      }
    });
  }

  uploadFile(file: File): void {
    const url = URL.createObjectURL(file);
    const mediaItem: MediaItem = {
      id: this.videoStudioService.generateId(),
      name: file.name,
      type: this.getFileType(file),
      duration: 30, // Placeholder, should be extracted from actual file
      thumbnail: url,
      url,
      size: file.size,
      createdAt: new Date()
    };

    // Add to local state immediately for better UX
    this.videoStudioService.addMediaItem(mediaItem);

    // Upload to backend
    const createMediaDto = {
      title: file.name,
      description: '',
      video: '',
      metaData: JSON.stringify({ fileSize: file.size }),
      projectId: 'default-project', // Should be current project ID
      sourceLanguage: 'en',
      destinationLanguage: 'en',
      countryDialect: ''
    };

    this.mediaService.create(createMediaDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mediaDto) => {
          const formData = new FormData();
          formData.append('video', file, file.name);

          this.mediaService.uploadVideo(mediaDto.id!, formData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (uploadResponse) => {
                console.log('File uploaded successfully:', uploadResponse);
                // Update the media item with the backend URL
                const updatedItem: MediaItem = {
                  ...mediaItem,
                  id: mediaDto.id!,
                  url: uploadResponse.video || url,
                  thumbnail: uploadResponse.video || url
                };
                this.videoStudioService.removeMediaItem(mediaItem.id);
                this.videoStudioService.addMediaItem(updatedItem);
              },
              error: (error) => {
                console.error('Upload failed:', error);
                // Remove from local state on upload failure
                this.videoStudioService.removeMediaItem(mediaItem.id);
              }
            });
        },
        error: (error) => {
          console.error('Failed to create media metadata:', error);
          this.videoStudioService.removeMediaItem(mediaItem.id);
        }
      });
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    this.onFileUpload(event.dataTransfer?.files || null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  selectMedia(media: MediaItem): void {
    this.videoStudioService.addClip({
      id: this.videoStudioService.generateId(),
      mediaId: media.id,
      trackId: 'video-1', // Default to first video track
      startTime: this.videoStudioService.currentTime,
      endTime: this.videoStudioService.currentTime + media.duration,
      duration: media.duration,
      trimStart: 0,
      trimEnd: 0,
      name: media.name,
      type: media.type,
      thumbnail: media.thumbnail,
      volume: 100,
      muted: false,
      effects: []
    });
  }

  previewMedia(media: MediaItem): void {
    this.selectedMedia = media;
  }

  deleteMedia(media: MediaItem): void {
    if (confirm('Are you sure you want to delete this media?')) {
      this.mediaService.delete(media.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.videoStudioService.removeMediaItem(media.id);
          },
          error: (error) => {
            console.error('Failed to delete media:', error);
          }
        });
    }
  }

  closePreview(): void {
    this.selectedMedia = null;
  }

  private isValidMediaFile(file: File): boolean {
    return file.type.startsWith('video/') || 
           file.type.startsWith('audio/') || 
           file.type.startsWith('image/');
  }

  private getFileType(file: File): 'video' | 'audio' | 'image' {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image';
  }

  private getMediaType(url: string): 'video' | 'audio' | 'image' {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['mp4', 'avi', 'mov', 'webm'].includes(extension || '')) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) return 'audio';
    return 'image';
  }
}