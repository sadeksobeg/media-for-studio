import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TimelineClip, Effect } from '../../interfaces/video-studio.interface';

interface ColorFilter {
  name: string;
  type: string;
}

interface Transition {
  name: string;
  type: string;
  icon: string;
}

@Component({
  selector: 'app-effects-panel',
  templateUrl: './effects-panel.component.html',
  styleUrls: ['./effects-panel.component.scss']
})
export class EffectsPanelComponent {
  @Input() selectedClip: TimelineClip | null = null;
  @Output() effectApplied = new EventEmitter<{ clipId: string; effect: Effect }>();
  @Output() effectRemoved = new EventEmitter<{ clipId: string; effectId: string }>();
  @Output() panelClosed = new EventEmitter<void>();

  colorFilters: ColorFilter[] = [
    { name: 'Sepia', type: 'sepia' },
    { name: 'Grayscale', type: 'grayscale' },
    { name: 'Vintage', type: 'vintage' },
    { name: 'Cool', type: 'cool' },
    { name: 'Warm', type: 'warm' },
    { name: 'High Contrast', type: 'high-contrast' }
  ];

  transitions: Transition[] = [
    { name: 'Fade', type: 'fade', icon: 'fas fa-adjust' },
    { name: 'Slide Left', type: 'slide-left', icon: 'fas fa-arrow-left' },
    { name: 'Slide Right', type: 'slide-right', icon: 'fas fa-arrow-right' },
    { name: 'Wipe', type: 'wipe', icon: 'fas fa-window-minimize' },
    { name: 'Dissolve', type: 'dissolve', icon: 'fas fa-circle-notch' },
    { name: 'Zoom', type: 'zoom', icon: 'fas fa-search-plus' }
  ];

  closePanel(): void {
    this.panelClosed.emit();
  }

  getEffectValue(effectType: string): number {
    if (!this.selectedClip) return 0;
    
    const effect = this.selectedClip.effects.find(e => 
      e.type === 'filter' && e.parameters[effectType] !== undefined
    );
    
    return effect ? effect.parameters[effectType] : 0;
  }

  onBrightnessChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.applyFilterEffect('brightness', value);
  }

  onContrastChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.applyFilterEffect('contrast', value);
  }

  onSaturationChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.applyFilterEffect('saturation', value);
  }

  onBlurChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.applyFilterEffect('blur', value);
  }

  private applyFilterEffect(filterType: string, value: number): void {
    if (!this.selectedClip) return;

    // Remove existing effect of the same type
    this.removeExistingEffect(filterType);

    // Apply new effect if value is not default
    if (value !== 0) {
      const effect: Effect = {
        id: this.generateId(),
        name: this.capitalizeFirst(filterType),
        type: 'filter',
        parameters: { [filterType]: value }
      };

      this.effectApplied.emit({ clipId: this.selectedClip.id, effect });
    }
  }

  hasColorFilter(filterType: string): boolean {
    if (!this.selectedClip) return false;
    
    return this.selectedClip.effects.some(e => 
      e.type === 'filter' && e.parameters.colorFilter === filterType
    );
  }

  toggleColorFilter(filterType: string): void {
    if (!this.selectedClip) return;

    if (this.hasColorFilter(filterType)) {
      // Remove the filter
      const effect = this.selectedClip.effects.find(e => 
        e.type === 'filter' && e.parameters.colorFilter === filterType
      );
      if (effect) {
        this.effectRemoved.emit({ clipId: this.selectedClip.id, effectId: effect.id });
      }
    } else {
      // Remove any existing color filter first
      const existingColorFilter = this.selectedClip.effects.find(e => 
        e.type === 'filter' && e.parameters.colorFilter
      );
      if (existingColorFilter) {
        this.effectRemoved.emit({ clipId: this.selectedClip.id, effectId: existingColorFilter.id });
      }

      // Apply new color filter
      const effect: Effect = {
        id: this.generateId(),
        name: `${this.capitalizeFirst(filterType)} Filter`,
        type: 'filter',
        parameters: { colorFilter: filterType }
      };

      this.effectApplied.emit({ clipId: this.selectedClip.id, effect });
    }
  }

  getFilterPreviewStyle(filterType: string): any {
    const baseStyle = {
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)'
    };

    switch (filterType) {
      case 'sepia':
        return { ...baseStyle, filter: 'sepia(100%)' };
      case 'grayscale':
        return { ...baseStyle, filter: 'grayscale(100%)' };
      case 'vintage':
        return { ...baseStyle, filter: 'sepia(50%) contrast(1.2) brightness(0.9)' };
      case 'cool':
        return { ...baseStyle, filter: 'hue-rotate(180deg)' };
      case 'warm':
        return { ...baseStyle, filter: 'hue-rotate(30deg) saturate(1.2)' };
      case 'high-contrast':
        return { ...baseStyle, filter: 'contrast(150%)' };
      default:
        return baseStyle;
    }
  }

  applyTransition(transitionType: string): void {
    if (!this.selectedClip) return;

    const effect: Effect = {
      id: this.generateId(),
      name: `${this.capitalizeFirst(transitionType)} Transition`,
      type: 'transition',
      parameters: { 
        transitionType,
        duration: 1.0,
        direction: this.getTransitionDirection(transitionType)
      }
    };

    this.effectApplied.emit({ clipId: this.selectedClip.id, effect });
  }

  removeEffect(effectId: string): void {
    if (!this.selectedClip) return;
    this.effectRemoved.emit({ clipId: this.selectedClip.id, effectId });
  }

  private removeExistingEffect(effectType: string): void {
    if (!this.selectedClip) return;

    const existingEffect = this.selectedClip.effects.find(e => 
      e.type === 'filter' && e.parameters[effectType] !== undefined
    );

    if (existingEffect) {
      this.effectRemoved.emit({ clipId: this.selectedClip.id, effectId: existingEffect.id });
    }
  }

  private getTransitionDirection(transitionType: string): string | undefined {
    switch (transitionType) {
      case 'slide-left':
        return 'left';
      case 'slide-right':
        return 'right';
      case 'slide-up':
        return 'up';
      case 'slide-down':
        return 'down';
      default:
        return undefined;
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}