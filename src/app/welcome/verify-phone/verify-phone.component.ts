// src/app/welcome/verify-phone/verify-phone.component.ts
import { Component } from '@angular/core';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-verify-phone',
  standalone: true,
  imports: [
    IonicModule,
    FormsModule,
    CommonModule,
    RouterModule    // ← add this so routerLink works
  ],
  template: `
    <ion-header>
      <ion-toolbar color="light">
        <ion-title>Verify your phone</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form (ngSubmit)="verifyCode()" #codeForm="ngForm">
        <ion-item>
          <ion-label position="floating">Verification Code</ion-label>
          <ion-input
            type="text"
            required
            maxlength="6"
            [(ngModel)]="code"
            name="code"
            placeholder="123456"
          ></ion-input>
        </ion-item>

        <ion-button
          expand="block"
          type="submit"
          [disabled]="!codeForm.form.valid || isVerifying"
          class="ion-margin-top"
        >
          <ng-container *ngIf="!isVerifying; else verifyingTpl">
            Verify
          </ng-container>
          <ng-template #verifyingTpl>Verifying…</ng-template>
        </ion-button>
      </form>
    </ion-content>

    <ion-footer slot="fixed">
      <ion-toolbar color="light">
        <ion-button
          fill="clear"
          size="small"
          routerLink="/welcome"
          routerDirection="root"
        >
          ← Back to Welcome
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styleUrls: ['./verify-phone.component.scss']
})
export class VerifyPhoneComponent {
  code = '';
  isVerifying = false;

  constructor(
    private authSvc: AuthService,
    private profileSvc: ProfileService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    public router: Router
  ) {}

  async verifyCode() {
    if (this.isVerifying) return;
    this.isVerifying = true;

    const loader = await this.loadingCtrl.create({
      message: 'Verifying code…',
      duration: 10000
    });
    await loader.present();

    try {
      // 1) Confirm the SMS code in Firebase Auth
      await this.authSvc.verifyPhoneCode(this.code.trim());

      // 2) Persist the phone number into Firestore
      await this.profileSvc.saveProfile({
        phone: this.authSvc.lastPhoneNumber
      });

      // 3) Navigate to /home
      await loader.dismiss();
      this.isVerifying = false;
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (err: any) {
      await loader.dismiss();
      this.isVerifying = false;
      console.error('Verification/link failed:', err);
      (await this.toastCtrl.create({
        message: `Error: ${err.message || 'Unknown'}`,
        duration: 4000,
        color: 'danger'
      })).present();
    }
  }
}
