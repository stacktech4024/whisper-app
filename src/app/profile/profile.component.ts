import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import {
  IonicModule,
  AlertController,
  ToastController,
  LoadingController,
  NavController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, Profile } from '../services/profile.service';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  profile!: Profile;
  temp!: Partial<Profile>;
  isEditing = false;
  private profileSub!: Subscription;

  constructor(
    private profileSvc: ProfileService,
    private authSvc: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.profileSub = this.profileSvc.getProfile().subscribe({
      next: p => {
        this.profile = p;
      },
      error: () => this.navCtrl.navigateRoot('/auth')
    });
  }

  ngOnDestroy() {
    this.profileSub?.unsubscribe();
  }

  toggleEdit() {
    this.temp = {
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      phone: this.profile.phone,
      avatarUrl: this.profile.avatarUrl,
    };
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  async saveProfile() {
    const loader = await this.loadingCtrl.create({ message: 'Saving…' });
    await loader.present();
    try {
      await this.profileSvc.saveProfile(this.temp);
      Object.assign(this.profile, this.temp);
      this.isEditing = false;
      const toast = await this.toastCtrl.create({
        message: 'Profile updated.',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    } finally {
      await loader.dismiss();
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      const toast = await this.toastCtrl.create({
        message: 'Please select an image file.',
        duration: 2000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Uploading…' });
    await loader.present();
    try {
      const url = await this.profileSvc.uploadAvatar(file);
      this.profile.avatarUrl = url;
      const toast = await this.toastCtrl.create({
        message: 'Avatar updated.',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    } finally {
      await loader.dismiss();
    }
  }

  async confirmDelete() {
    const alert = await this.alertCtrl.create({
      header: 'Delete Account?',
      message: 'This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteAccount(),
        },
      ],
    });
    await alert.present();
  }

  async deleteAccount() {
    const loader = await this.loadingCtrl.create({ message: 'Deleting…' });
    await loader.present();

    this.profileSub?.unsubscribe();

    try {
      await this.profileSvc.deleteProfile();
      await this.authSvc.deleteAccount();
      const toast = await this.toastCtrl.create({
        message: 'Account deleted.',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
      this.navCtrl.navigateRoot('/auth');
    } catch (err: any) {
      const fail = await this.alertCtrl.create({
        header: 'Deletion Failed',
        message: err.message || 'Could not delete account.',
        buttons: ['OK'],
      });
      await fail.present();
    } finally {
      await loader.dismiss();
    }
  }

  logout() {
    this.profileSub?.unsubscribe();
    this.authSvc.signOut();
    this.navCtrl.navigateRoot('/auth');
  }
}
