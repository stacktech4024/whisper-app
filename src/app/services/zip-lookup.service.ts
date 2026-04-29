import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject } from 'rxjs';

/** Tuple = [latitude, longitude] */
type LatLon = [number, number];

/**
 * One-time CSV → localStorage → in-memory Map.
 * Keeps only Texas ZIP codes to minimise memory.
 */
@Injectable({ providedIn: 'root' })
export class ZipLookupService {
  /** "75201" → [32.78, -96.80] */
  private cache = new Map<string, LatLon>();

  private ready = new BehaviorSubject(false);
  /** Await if you need the cache before calling `get()` */
  readonly ready$ = this.ready.asObservable();

  private static readonly LS_KEY = 'txZipCache';
  private static readonly CSV_URL = 'assets/uszips.csv';   // put the file in src/assets

  constructor(private http: HttpClient) { this.init(); }

  /* ---------- public ---------- */
  get(zip: string): LatLon | undefined { return this.cache.get(zip); }

  /* ---------- internal ---------- */
  private async init(): Promise<void> {
    /* 1️⃣  restore from localStorage if present */
    const saved = localStorage.getItem(ZipLookupService.LS_KEY);
    if (saved) {
      this.cache = new Map(JSON.parse(saved));
      this.ready.next(true);
      return;
    }

    /* 2️⃣  download & parse the CSV (≤ 1 MB) — happens once */
    try {
      const csv = await firstValueFrom(
        this.http.get(ZipLookupService.CSV_URL, { responseType: 'text' })
      );
      this.parseCsv(csv);
      localStorage.setItem(
        ZipLookupService.LS_KEY,
        JSON.stringify([...this.cache]),
      );
      console.info(`[ZipLookup] cached ${this.cache.size.toLocaleString()} TX ZIPs`);
    } catch (err) {
      console.error('[ZipLookup] failed to load uszips.csv', err);
    } finally {
      this.ready.next(true);
    }
  }

  /** Minimal, dependency-free CSV parser for the uszips file */
  private parseCsv(csv: string): void {
    const lines = csv.trim().split(/\r?\n/);
    if (!lines.length) return;

    const hdr  = lines[0].split(',');
    const iZip = hdr.indexOf('zip');
    const iLat = hdr.indexOf('lat');
    const iLon = hdr.indexOf('lng');
    const iSt  = hdr.indexOf('state_id');
    if (iZip * iLat * iLon * iSt < 0) {
      console.error('[ZipLookup] unexpected CSV headers'); return;
    }

    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      if (c[iSt] !== 'TX') continue;              // keep only Texas rows

      const zip = c[iZip];
      const lat = Number.parseFloat(c[iLat]);
      const lon = Number.parseFloat(c[iLon]);
      if (zip && Number.isFinite(lat) && Number.isFinite(lon)) {
        this.cache.set(zip, [lat, lon]);
      }
    }
  }
}
