// src/app/welcome/welcome.component.ts
import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome',
  standalone: true,
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
  imports: [IonicModule, CommonModule],
})
export class WelcomeComponent implements AfterViewInit {
  @ViewChild('onboarding', { static: false })
  onboarding!: ElementRef<HTMLDivElement>;

  currentSlide = 0;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    if (this.onboarding?.nativeElement) {
      this.onboarding.nativeElement.addEventListener('scroll', this.onScroll.bind(this));
    } else {
      console.warn('⚠️ onboarding element not found in view');
    }
  }

  onScroll(): void {
    const el = this.onboarding.nativeElement;
    const scroll = el.scrollLeft;
    const width = el.clientWidth;
    this.currentSlide = Math.round(scroll / width);
  }

  scrollNext(): void {
    const el = this.onboarding.nativeElement;
    const current = this.currentSlide;
    const next = (current + 1) * el.clientWidth;
    el.scrollTo({ left: next, behavior: 'smooth' });
  }

  /** Navigate to Sign Up */
  goNext(): void {
    this.router.navigateByUrl('/signup');
  }

  /** Navigate to Login */
  goLogin(): void {
    this.router.navigateByUrl('/auth');
  }
}
