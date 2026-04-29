// src/app/auth/auth.page.ts
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, MenuController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-auth',
  imports: [IonicModule, FormsModule, CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements OnInit {
  email = '';
  password = '';
  showForgot = false;

  constructor(
    private authSvc: AuthService,
    private profileSvc: ProfileService,
    private router: Router,
    private menu: MenuController
  ) {}

  ngOnInit() {
    this.menu.enable(false);
  }

  async login() {
    this.showForgot = false;
    try {
      // 1) Sign in with email/password
      await this.authSvc.login(this.email.trim(), this.password);

      // 2) Re-enable the menu
      this.menu.enable(true);

      // 3) Fetch their Firestore profile once
      const profile = await this.profileSvc
        .getProfile()
        .pipe(take(1))
        .toPromise();

      // 4) Route based on whether they already have a phone
      if (profile?.phone) {
        // user has a phone on record → send them home
        await this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        // no phone yet → enter the phone flow
        await this.router.navigateByUrl(
          '/welcome/enter-phone',
          { replaceUrl: true }
        );
      }
    } catch (err) {
      // on error, show forgot link
      this.showForgot = true;
    }
  }

  navigateToSignup() {
    this.router.navigateByUrl('/signup');
  }

  goForgot() {
    this.router.navigateByUrl('/forgot-password');
  }
}
