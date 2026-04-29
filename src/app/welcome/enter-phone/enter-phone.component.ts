// src/app/welcome/enter-phone/enter-phone.component.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

// Firebase imports
import {
  getAuth,
  RecaptchaVerifier
} from 'firebase/auth';

@Component({
  selector: 'app-enter-phone',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  template: `
    <ion-header>
      <ion-toolbar color="light">
        <ion-title>Enter your phone</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div id="recaptcha-container"></div>

      <form (ngSubmit)="sendCode()" #phoneForm="ngForm">
        <ion-item>
          <ion-label position="floating">Phone Number</ion-label>
          <ion-input
            type="tel"
            required
            [(ngModel)]="phone"
            name="phone"
            placeholder="+1 416 555 1212">
          </ion-input>
        </ion-item>

        <ion-button
          expand="block"
          type="submit"
          [disabled]="!phoneForm.form.valid || isSending"
          class="ion-margin-top"
        >
          <ng-container *ngIf="!isSending; else sendingTpl">
            Send code
          </ng-container>
          <ng-template #sendingTpl>
            Sending…
          </ng-template>
        </ion-button>
      </form>
    </ion-content>

    <!-- Back to Login footer -->
    <ion-footer>
      <ion-toolbar color="light">
        <ion-button
          fill="clear"
          size="small"
          (click)="router.navigateByUrl('/auth', { replaceUrl: true })"
        >
          ← Back to Login
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styleUrls: ['./enter-phone.component.scss']
})
export class EnterPhoneComponent implements OnInit {
  phone = '';
  isSending = false;

  constructor(
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    public router: Router,
    private authSvc: AuthService
  ) {}

  ngOnInit() {
    const auth = getAuth();
    // Initialize invisible reCAPTCHA
    // @ts-ignore
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
  }

  async sendCode() {
    if (this.isSending) return;
    this.isSending = true;

    // 1) Normalize to E.164
    let formatted = this.phone.trim().replace(/\s+/g, '');
    if (/^[2-9]\d{9}$/.test(formatted)) {
      formatted = '+1' + formatted;
    } else if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    console.log('Normalized phone →', formatted);

    const loader = await this.loadingCtrl.create({
      message: 'Sending SMS…',
      duration: 10000
    });
    await loader.present();

    try {
      // 2) Delegate to AuthService
      const verificationId = await this.authSvc.sendPhoneVerification(formatted);
      console.log('✅ SMS sent, id=', verificationId);

      // 3) Navigate to verification step
      await loader.dismiss();
      this.isSending = false;
      await this.router.navigateByUrl('/welcome/verify-phone', { replaceUrl: true });
    } catch (err: any) {
      await loader.dismiss();
      this.isSending = false;
      console.error('Error sending SMS:', err);
      (await this.toastCtrl.create({
        message: `Failed to send code: ${err.message || err}`,
        duration: 4000,
        color: 'danger'
      })).present();
    }
  }
}
