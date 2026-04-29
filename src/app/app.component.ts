// src/app/app.component.ts
import {
  Component,
  OnInit,
  NgZone,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  MenuController,
  Platform,
  ToastController,
} from '@ionic/angular';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { authState, Auth } from '@angular/fire/auth';
import { filter } from 'rxjs/operators';
import { Geolocation } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';

import { MenuComponent } from './components/menu/menu.component';
import { ProfileService, Profile } from './services/profile.service';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [IonicModule, CommonModule, RouterModule, MenuComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent implements OnInit {
  showMenu = false;
  isProtectedRoute = false;

  /** Bound in your header */
  firstName = '';
  locationDisplay = 'Locating…';

  private readonly protectedPrefixes = ['/home', '/locations', '/profile'];

  constructor(
    public menu: MenuController,
    private platform: Platform,
    private auth: Auth,
    private profileSvc: ProfileService,
    private http: HttpClient,
    private router: Router,
    private toast: ToastController,
    private ngZone: NgZone
  ) {}

  /* -------------------------------------------------------------
     Life-cycle
   ------------------------------------------------------------- */
  ngOnInit(): void {
    // Wait until Cordova / Capacitor is ready, then wire everything.
    this.platform.ready().then(() => {
      this.watchAuth();
      this.watchRouteChanges();
    });
  }

  /* -------------------------------------------------------------
     Auth / profile handling
   ------------------------------------------------------------- */
  private watchAuth(): void {
    authState(this.auth).subscribe((user) =>
      // Ensure updates happen inside Angular’s zone so change-detection runs.
      this.ngZone.run(() => {
        this.showMenu = !!user;

        if (!user) {
          return;
        }

        /* 1️⃣  show Firebase displayName immediately */
        this.firstName = user.displayName ?? 'Guest';

        /* 2️⃣  overwrite with Firestore profile when it arrives */
        this.profileSvc.getProfile().subscribe((profile?: Profile) => {
          if (profile?.firstName) {
            this.firstName = profile.firstName;
          }
        });

        /* 3️⃣  fetch & reverse-geocode device location */
        this.refreshLocation();
      })
    );
  }

  /* -------------------------------------------------------------
     Router guard for hiding the menu bar on /auth routes, etc.
   ------------------------------------------------------------- */
  private watchRouteChanges(): void {
    this.router.events
      .pipe(filter((evt) => evt instanceof NavigationEnd))
      .subscribe((evt: NavigationEnd) => {
        this.isProtectedRoute = this.protectedPrefixes.some((p) =>
          evt.urlAfterRedirects.startsWith(p)
        );
      });
  }

  /* -------------------------------------------------------------
     Location utilities
   ------------------------------------------------------------- */
  /** Only show “City, Province/State” */
  async refreshLocation(): Promise<void> {
    try {
      const pos = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = pos.coords;

      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const data: any = await this.http.get(url).toPromise();

      const addr = data.address;
      const city = addr.city ?? addr.town ?? addr.village ?? '';
      const province = addr.state ?? addr.county ?? '';

      this.ngZone.run(() => {
        this.locationDisplay = [city, province].filter(Boolean).join(', ');
      });
    } catch (err) {
      console.error('Location error', err);
      this.ngZone.run(() => (this.locationDisplay = 'Unknown'));
    }
  }

  /* -------------------------------------------------------------
     Menu actions
   ------------------------------------------------------------- */
  async logout(): Promise<void> {
    await this.menu.close();
    await this.auth.signOut();
    this.router.navigate(['/auth'], { replaceUrl: true });
  }

  goToProfile(): void {
    this.menu.close().then(() => this.router.navigate(['/profile']));
  }
}
