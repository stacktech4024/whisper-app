// src/main.ts
import {
  enableProdMode,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { IonicStorageModule } from '@ionic/storage-angular';
import { provideHttpClient } from '@angular/common/http';

import { environment } from './environments/environment';

import { initializeApp, getApp } from 'firebase/app';
import { provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { initializeFirestore } from 'firebase/firestore';
import { provideFirestore } from '@angular/fire/firestore';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

console.log('Bootstrapping main.ts');

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes),
    provideZoneChangeDetection({ eventCoalescing: true }),

    importProvidersFrom(IonicStorageModule.forRoot()),

    // Firebase App initialization
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    // Firebase Auth
    provideAuth(() => getAuth()),

    // Firestore
    provideFirestore(() => {
      const app = getApp();
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    }),

    provideHttpClient(),
  ],
});
