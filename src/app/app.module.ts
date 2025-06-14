import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { HttpClientModule } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { ImageCropperModule } from 'ngx-image-cropper';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ImageCropperModalComponent } from './shared/components/image-cropper-modal/image-cropper-modal.component';
import { SharedModule } from './shared/shared.module';

// Firebase imports
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { environment } from '../environments/environment';
import { StoreCreationModule } from './pages/store-creation/store-creation.module';
import { StoreModule } from './pages/store/store.module';

// Importation des composants standalone, si nécessaire
// Exemple: import { HomeComponent } from './pages/home/home.component';

@NgModule({
  declarations: [
    AppComponent,
    ImageCropperModalComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CoreModule,
    HttpClientModule,
    StoreCreationModule,
    StoreModule,
    ImageCropperModule,
    MatDialogModule,
    SharedModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireStorageModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true
    })
  ],
  providers: [
    provideAnimations()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { } 