// src/app/contacts-sheet/sheet-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Centralised store for the Contacts sheet.
 * • `breakpoint` – 0 (bar) | 0.45 (half) | 1 (full)
 * • `selectedContactUids` – used later in share workflow
 */
@Injectable({ providedIn: 'root' })
export class SheetStateService {
  /** Current breakpoint as a value from 0-1 */
  readonly breakpoint$ = new BehaviorSubject<number>(0);

  /** UIDs selected in the avatar row / modal */
  readonly selectedContactUids$ = new BehaviorSubject<string[]>([]);

  // Convenience setters
  setBreakpoint(bp: 0 | 0.45 | 1) {
    this.breakpoint$.next(bp);
  }
}
