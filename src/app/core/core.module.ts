import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { StoreService } from './services/store.service';
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { ToastService } from './services/toast.service';
import { MatDialogModule } from '@angular/material/dialog';
import { ImageCropperModule } from 'ngx-image-cropper';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    MatDialogModule,
    ImageCropperModule,
    SharedModule
  ],
  providers: [
    AuthService,
    StoreService,
    ProductService,
    CartService,
    ToastService
  ],
  exports: [
    MatDialogModule,
    ImageCropperModule
  ]
})

export class CoreModule {
  // Empêche l'importation multiple du module Core
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule est déjà chargé. Importez-le uniquement dans AppModule.');
    }
  }
}
