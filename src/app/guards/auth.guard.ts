// src/app/guards/auth.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, CanActivateFn } from '@angular/router';
import { onAuthStateChanged, User } from 'firebase/auth';

import { auth } from '../firebase';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): Promise<boolean> {
    return new Promise(resolve => {
      onAuthStateChanged(auth, (user: User | null) => {
        if (user && user.phoneNumber) {
          // Already got an SMS-verified phone number on this account
          resolve(true);
        } else if (user) {
          // Signed in, but no phoneNumber yet → force verification
          this.router.navigateByUrl('/welcome/enter-phone', { replaceUrl: true });
          resolve(false);
        } else {
          // Not signed in at all → send to login
          this.router.navigateByUrl('/auth', { replaceUrl: true });
          resolve(false);
        }
      });
    });
  }
}

@Injectable({ providedIn: 'root' })
export class AutoLoginGuard implements CanActivate {
  constructor(
    private router: Router,
    private authSvc: AuthService
  ) {}

  canActivate(): Promise<boolean> {
    return new Promise(resolve => {
      onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          if (user.phoneNumber) {
            // fully onboarded: skip auth & signup, go to home
            this.router.navigateByUrl('/home', { replaceUrl: true });
            resolve(false);
          } else {
            // signed in but no phone yet → allow user to re-enter credentials
            // so they can finish the phone flow manually via the login form
            resolve(true);
          }
        } else {
          // not signed in at all → allow them to login/signup
          resolve(true);
        }
      });
    });
  }
}


// function‐based wrappers for routes
export const authGuard: CanActivateFn = () => inject(AuthGuard).canActivate();
export const autoLoginGuard: CanActivateFn = () => inject(AutoLoginGuard).canActivate();
