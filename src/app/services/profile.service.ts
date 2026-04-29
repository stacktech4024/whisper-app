// src/app/services/profile.service.ts
import { Injectable } from '@angular/core';
import { auth, db } from '../firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  DocumentData
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { StorageService } from './storage.service';

export interface Profile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: string | null;
  birthYear?: number | null;
  trustedContacts?: string[] | null;
  avatarUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private storageSvc: StorageService) {}

  private usersDoc(uid: string) {
    return doc(db, 'users', uid);
  }

  /**
   * Emits the current user’s Profile.
   * On first sign-in, auto-creates a stub document so we never emit undefined.
   */
  getProfile(): Observable<Profile> {
    return new Observable(subscriber => {
      const unsubAuth = auth.onAuthStateChanged(
        async user => {
          if (!user) {
            subscriber.error(new Error('Not authenticated'));
            return;
          }

          const ref = this.usersDoc(user.uid);
          const unsubProfile = onSnapshot(
            ref,
            async snap => {
              if (snap.exists()) {
                subscriber.next({
                  uid: snap.id,
                  ...(snap.data() as Omit<Profile, 'uid'>)
                });
              } else {
                // create stub document
                const stub: Omit<Profile, 'uid'> = {
                  firstName: '',
                  lastName: '',
                  email: user.email || '',
                  phone: '',
                  gender: null,
                  birthYear: null,
                  trustedContacts: null,
                  avatarUrl: null
                };
                await setDoc(ref, stub, { merge: true });
                subscriber.next({ uid: user.uid, ...stub });
              }
            },
            err => subscriber.error(err)
          );

          subscriber.add(() => unsubProfile());
        },
        err => subscriber.error(err)
      );

      return () => unsubAuth();
    });
  }

  /** Merge the given partial profile into Firestore */
  async saveProfile(profile: Partial<Omit<Profile, 'uid'>>): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Must be logged in to save profile');

    // convert undefined → null so Firestore removes them
    Object.keys(profile).forEach(k => {
      if ((profile as any)[k] === undefined) {
        (profile as any)[k] = null;
      }
    });

    await setDoc(this.usersDoc(uid), profile as DocumentData, { merge: true });
  }

  /**
   * Uploads an avatar File via StorageService, then saves
   * the resulting URL into the user's Firestore doc.
   * Only image/* MIME types are allowed.
   */
  async uploadAvatar(file: File): Promise<string> {
    // 0) Validate it's an image
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Must be logged in to upload avatar');

    // 1) Upload to Cloudflare R2 via StorageService
    const url = await this.storageSvc.uploadAvatar(file, uid);

    // 2) Persist the public URL into Firestore
    await this.saveProfile({ avatarUrl: url });

    return url;
  }

  /** Delete the user's Firestore document only */
  async deleteProfile(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Must be logged in to delete profile');
    await deleteDoc(this.usersDoc(uid));
  }
}
