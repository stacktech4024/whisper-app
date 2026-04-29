import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, shareReplay } from 'rxjs';

/** Tuple = [lat, lon] */
type LatLon = [number, number];

/**
 * Loads `assets/travis-bg.json` once at app-start,
 * then serves quick look-ups: GEOID → centroid.
 */
@Injectable({ providedIn: 'root' })
export class BlockGroupLookupService {
  /** GEOID → [lat, lon] */
  private readonly cache = new Map<string, LatLon>();

  constructor(http: HttpClient) {
    // fire once; cache forever
    firstValueFrom(
      http
        .get<{ [bg: string]: LatLon }>('assets/travis-bg.json')
        .pipe(shareReplay(1)),
    ).then(data => {
      Object.entries(data).forEach(([k, v]) => this.cache.set(k, v));
      console.info(
        `[BG-Lookup] loaded ${this.cache.size.toLocaleString()} Travis County block-group centroids`,
      );
    }).catch(err => {
      console.error('[BG-Lookup] failed to load travis-bg.json', err);
    });
  }

  /** Returns `[lat, lon]` or `undefined` if the GEOID isn’t in the file */
  get(bg: string): LatLon | undefined {
    return this.cache.get(bg);
  }
}
