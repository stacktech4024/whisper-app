import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { ContactsSheetComponent } from '../contacts-sheet/contacts-sheet.component';

interface Slide {
  src: string;
  title: string;
  html: string;
  alt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule, CommonModule, ContactsSheetComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomeComponent implements OnInit {
  slideOpts = {
    autoplay: { delay: 4000 },
    loop: true,
    pagination: { clickable: true },
    breakpoints: {
      // Phones < 480px: simple slide, tight spacing
      0:    { effect: 'slide', spaceBetween: 8, centeredSlides: true },
      480:  { effect: 'slide', spaceBetween: 12, centeredSlides: true },
      // 640px+: coverflow effect
      640: {
        effect: 'coverflow',
        coverflowEffect: { rotate: 0, depth: 120, modifier: 1.2, slideShadows: false },
        spaceBetween: 16,
        centeredSlides: true
      }
    }
  };

  slides: Slide[] = [];
  private readonly allSlides: Slide[] = [
    { src: 'assets/slides/undraw_statistics_z6y6.svg', title: 'Did you know?', html: '<strong>1 in 3</strong> women worldwide…', alt: 'Statistics illustration' },
    { src: 'assets/slides/undraw_articles_visl.svg',     title: "Amanda’s story", html: '“Knowing my friends…”', alt: 'Story illustration' },
    { src: 'assets/slides/undraw_mobile-interface_z1b3.svg', title: 'Instant Alerts', html: 'One tap sends your live location…', alt: 'Mobile interface illustration' },
  ];

  ngOnInit() {
    this.slides = this.shuffle([...this.allSlides]);
  }

  private shuffle<T>(arr: T[]): T[] {
    let m = arr.length;
    while (m) {
      const i = Math.floor(Math.random() * m--);
      [arr[m], arr[i]] = [arr[i], arr[m]];
    }
    return arr;
  }
}
