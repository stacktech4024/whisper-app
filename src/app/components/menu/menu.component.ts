// src/app/components/menu/menu.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonicModule
  ],
})
export class MenuComponent {
  active: 'locations' | 'contacts' | 'sos' | 'alerts' = 'locations';

  constructor(private router: Router) {}

  select(tab: 'locations' | 'contacts' | 'sos' | 'alerts') {
    this.active = tab;

    switch (tab) {
      case 'locations':
        this.router.navigate(['/locations']);
        break;
      case 'contacts':
        // TODO: open Contacts page or pop-up
        break;
      case 'sos':
        // TODO: trigger SOS flow
        break;
      case 'alerts':
        // TODO: open Alerts page or pop-up
        break;
    }
  }
}
