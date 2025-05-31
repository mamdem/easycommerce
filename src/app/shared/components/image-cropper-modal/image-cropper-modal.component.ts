import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageCroppedEvent } from 'ngx-image-cropper';

export interface ImageCropperDialogData {
  imageFile: File;
  aspectRatio: number;
  resizeToWidth: number;
  resizeToHeight: number;
  maintainAspectRatio: boolean;
  title: string;
}

@Component({
  selector: 'app-image-cropper-modal',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <image-cropper
        [imageFile]="data.imageFile"
        [maintainAspectRatio]="data.maintainAspectRatio"
        [aspectRatio]="data.aspectRatio"
        [resizeToWidth]="data.resizeToWidth"
        [resizeToHeight]="data.resizeToHeight"
        format="png"
        (imageCropped)="imageCropped($event)"
        (loadImageFailed)="loadImageFailed()"
      ></image-cropper>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-raised-button color="primary" (click)="onSave()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 800px;
    }
    mat-dialog-content {
      max-height: 70vh;
    }
    image-cropper {
      max-height: 60vh;
    }
  `]
})
export class ImageCropperModalComponent {
  croppedImage: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<ImageCropperModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageCropperDialogData
  ) {}

  imageCropped(event: ImageCroppedEvent) {
    if (event.base64) {
      this.croppedImage = event.base64;
    }
  }

  loadImageFailed() {
    console.error('Failed to load image');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.croppedImage) {
      // Convertir base64 en File
      fetch(this.croppedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], this.data.imageFile.name, {
            type: 'image/png'
          });
          this.dialogRef.close(file);
        });
    }
  }
} 