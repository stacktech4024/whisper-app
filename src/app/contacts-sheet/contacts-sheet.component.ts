import {
  Component,
  ViewChild,
  AfterViewInit,
  HostListener,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  IonModal,
} from '@ionic/angular';

/* ⬇ type now lives in @ionic/core */
import { ModalBreakpointChangeEventDetail } from '@ionic/core';

import { SheetStateService } from './sheet-state.service';

@Component({
  standalone: true,
  selector: 'app-contacts-sheet',
  templateUrl: './contacts-sheet.component.html',
  styleUrls: ['./contacts-sheet.component.scss'],
  imports: [CommonModule, IonicModule],
})
export class ContactsSheetComponent implements AfterViewInit {
  @ViewChild(IonModal) modal!: IonModal;

  collapsedVisible = signal(true);
  breakpoints: number[] = [0, 0.45, 1];
  readonly HALF: 0.45 = 0.45;

  /* ⬇ make the service public so the template can read it */
  constructor(public sheetState: SheetStateService) {}

  ngAfterViewInit(): void {
    this.modal.ionBreakpointDidChange.subscribe(
      (ev: CustomEvent<ModalBreakpointChangeEventDetail>) => {
        const bp = ev.detail.breakpoint as 0 | 0.45 | 1;
        this.sheetState.setBreakpoint(bp);
        this.collapsedVisible.set(bp === 0);
      },
    );
  }

  openHalf(): void {
    this.modal.present().then(() => this.modal.setCurrentBreakpoint(this.HALF));
  }
  openFull(): void {
    this.modal.present().then(() => this.modal.setCurrentBreakpoint(1));
  }
  collapse(): void {
    this.modal.setCurrentBreakpoint(0);
  }

  /* ESC collapses sheet */
  @HostListener('window:keydown.escape')
  onEsc(): void {
    if (!this.collapsedVisible()) {
      this.collapse();
    }
  }
}
