// src/app/signup/signup.page.ts - DEBUGGED
import { Component } from '@angular/core';
import {
  IonicModule,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
})
export class SignupPage {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;

  constructor(
    private authSvc: AuthService,
    private profileSvc: ProfileService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {}

  async signUp() {
    console.log('=== SIGNUP STARTED ===');
    if (this.isLoading) return console.log('Already creating account…');

    // 1) Validation
    if (!this.firstName.trim() || !this.lastName.trim()) {
      console.log('Validation failed: Missing name');
      (await this.toastCtrl.create({
        message: 'Enter both first and last name',
        duration: 2000,
        color: 'warning'
      })).present();
      return;
    }
    if (this.password !== this.confirmPassword) {
      console.log('Validation failed: Passwords don’t match');
      (await this.toastCtrl.create({
        message: 'Passwords must match',
        duration: 2000,
        color: 'warning'
      })).present();
      return;
    }

    this.isLoading = true;
    const loader = await this.loadingCtrl.create({ 
      message: 'Creating account…',
      duration: 10000
    });
    await loader.present();

    try {
      // 2) Create auth user
      console.log('Step 1: Creating auth user...');
      const cred = await this.authSvc.signUp(this.email.trim(), this.password);
      console.log('✅ Auth user created:', cred.user.uid);

      // 3) Set display name
      console.log('Step 2: Updating user profile...');
      await this.authSvc.updateProfile(
        `${this.firstName.trim()} ${this.lastName.trim()}`
      );
      console.log('✅ DisplayName set');

      // 4) Save Firestore profile
      console.log('Step 3: Saving Firestore profile...');
      await this.profileSvc.saveProfile({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        phone: ''  // leave blank for now
      });
      console.log('✅ Firestore profile saved');

      // 5) Brief pause to let writes propagate
      await new Promise(r => setTimeout(r, 500));

      // 6) Go to phone entry
      console.log('Step 4: Routing to enter-phone…');
      await this.router.navigateByUrl('/welcome/enter-phone', { replaceUrl: true });
      console.log('✅ Now on ENTER PHONE page');

    } catch (err: any) {
      console.error('❌ SIGNUP ERROR:', err);
      (await this.toastCtrl.create({
        message: `Signup failed: ${err.message || 'Unknown error'}`,
        duration: 5000,
        color: 'danger'
      })).present();
    } finally {
      await loader.dismiss();
      this.isLoading = false;
      console.log('=== SIGNUP FINISHED ===');
    }
  }

  navigateToLogin() {
    this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
