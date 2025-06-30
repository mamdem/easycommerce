import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { ImageCropperModule } from 'ngx-image-cropper';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { ImageCropperModalComponent } from './components/image-cropper-modal/image-cropper-modal.component';
import { ProductCardComponent } from './components/product-card/product-card.component';

@NgModule({
  declarations: [
    ImageCropperModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    ImageCropperModule,
    ConfirmDialogComponent,
    ProductCardComponent
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    ImageCropperModule,
    ImageCropperModalComponent,
    ConfirmDialogComponent,
    ProductCardComponent
  ]
})
export class SharedModule { } 