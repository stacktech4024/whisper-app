import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { AuthPage } from './auth/auth.page';
import { SignupPage } from './signup/signup.page';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { authGuard, autoLoginGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  {
    path: 'welcome',
    loadComponent: () =>
      import('./welcome/welcome.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'welcome/enter-phone',
    loadComponent: () =>
      import('./welcome/enter-phone/enter-phone.component').then(m => m.EnterPhoneComponent)
  },
  {
    path: 'welcome/verify-phone',
    loadComponent: () =>
      import('./welcome/verify-phone/verify-phone.component').then(m => m.VerifyPhoneComponent)
  },
  { path: 'auth',           component: AuthPage,              canActivate: [autoLoginGuard] },
  { path: 'signup',         component: SignupPage,            canActivate: [autoLoginGuard] },
  { path: 'forgot-password',component: ForgotPasswordComponent, canActivate: [autoLoginGuard] },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'locations',
    loadComponent: () => import('./locations/locations.component').then(m => m.LocationsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'welcome' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
