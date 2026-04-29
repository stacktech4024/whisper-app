// src/app/forgot-password/forgot-password.component.ts
import { Component } from '@angular/core';
import {
  IonicModule,
  ToastController,
  LoadingController,
  NavController
} from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  email = '';

  constructor(
    private authSvc: AuthService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController
  ) {}

  async sendReset() {
    const loader = await this.loadingCtrl.create({
      message: 'Sending reset email…',
      spinner: 'crescent',
    });
    await loader.present();

    try {
      await this.authSvc.resetPassword(this.email.trim());
      (await this.toastCtrl.create({
        message: 'Check your inbox for reset instructions.',
        duration: 3000,
        color: 'success',
      })).present();
    } catch (err: any) {
      (await this.toastCtrl.create({
        message: err.message || 'Failed to send reset email.',
        duration: 2000,
        color: 'danger',
      })).present();
    } finally {
      await loader.dismiss();
    }
  }

  goLogin() {
    this.navCtrl.navigateRoot('/auth', { animated: true });
  }
}
