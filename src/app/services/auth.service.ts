// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  ConfirmationResult,
  updateProfile as fbUpdateProfile,
  UserCredential
} from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Holds the Firebase ConfirmationResult after SMS is sent */
  private confirmationResult: ConfirmationResult | null = null;

  /** The last phone number string (E.164) sent to */
  public lastPhoneNumber = '';

  /** Email/password sign-up */
  signUp(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  /** Email/password login */
  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /** Send password reset */
  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(auth, email);
  }

  /** Sign out */
  signOut(): Promise<void> {
    return fbSignOut(auth);
  }

  /** Delete account */
  async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await user.delete();
    await fbSignOut(auth);
  }

  /**
   * 1) Send SMS verification and remember verificationId
   */
  async sendPhoneVerification(phone: string): Promise<void> {
    this.confirmationResult = null;
    this.lastPhoneNumber = phone;

    const verifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      { size: 'invisible' }
    );
    this.confirmationResult = await signInWithPhoneNumber(
      auth,
      phone,
      verifier
    );
  }

  /**
   * 2) Link the SMS credential to the current user
   */
  async verifyPhoneCode(code: string): Promise<void> {
    if (!this.confirmationResult) {
      throw new Error('No phone verification in progress');
    }
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const credential = PhoneAuthProvider.credential(
      this.confirmationResult.verificationId,
      code
    );
    await linkWithCredential(user, credential);
  }

  /**
   * Update Firebase Auth displayName/photoURL
   */
  async updateProfile(
    displayName: string | null,
    photoURL?: string
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Build only the fields we actually want to send
    const updatePayload: Record<string, unknown> = {};
    if (displayName !== null) {
      updatePayload['displayName'] = displayName;
    }
    if (typeof photoURL === 'string') {
      updatePayload['photoURL'] = photoURL;
    }

    // Call the Auth API with just those keys
    await fbUpdateProfile(user, updatePayload);
  }
}
