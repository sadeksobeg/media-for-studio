import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { StudioRoutingModule } from './studio-routing.module';
import { StudioComponent } from './studio.component';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { VideoTimelineComponent } from './components/video-timeline/video-timeline.component';
import { VideoPreviewComponent } from './components/video-preview/video-preview.component';
import { VideoStudioService } from './services/video-studio.service';

@NgModule({
  declarations: [
    StudioComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    StudioRoutingModule,
    DragDropModule,
    MediaLibraryComponent,
    VideoTimelineComponent,
    VideoPreviewComponent
  ],
  providers: [
    VideoStudioService
  ],
  exports: [
    StudioComponent
  ]
})
export class StudioModule { }