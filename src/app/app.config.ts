import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp } from '@angular/fire/app';
import { getFirestore } from '@angular/fire/firestore';
import { getAuth } from '@angular/fire/auth';
import { getStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrModule, provideToastr } from 'ngx-toastr';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { FirebaseApp } from '@angular/fire/app';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Storage } from '@angular/fire/storage';

// Enregistrer le locale français
registerLocaleData(localeFr, 'fr');

// Initialiser Firebase
const app = initializeApp(environment.firebase);
const firestore = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr' },
    { provide: FirebaseApp, useValue: app },
    { provide: Firestore, useValue: firestore },
    { provide: Auth, useValue: auth },
    { provide: Storage, useValue: storage },
    provideRouter(routes),
    importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        progressBar: true,
        closeButton: true,
        tapToDismiss: true,
        newestOnTop: true,
        maxOpened: 5,
        autoDismiss: true,
        enableHtml: true,
        toastClass: 'ngx-toastr custom-toast',
        titleClass: 'toast-title',
        messageClass: 'toast-message',
        iconClasses: {
          error: 'toast-error',
          info: 'toast-info',
          success: 'toast-success',
          warning: 'toast-warning'
        }
      })
    ),
    provideAnimations(),
    provideToastr()
  ]
};
