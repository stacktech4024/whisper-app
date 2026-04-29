import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

/** A row in pubsafedash_offenses.csv (trim this if your file has fewer fields) */
interface SaCsvRow {
  Report_ID: string;
  NIBRS_Code_Name: string;
  Service_Area: string;
  Report_Date: string;
  Latitude: string;   // may be empty
  Longitude: string;  // may be empty
  Zip_Code: string;   // may be empty
}

@Injectable({ providedIn: 'root' })
export class SaCsvService {
  private rows: SaCsvRow[] = [];
  private ready = new BehaviorSubject(false);
  readonly ready$ = this.ready.asObservable();

  private static readonly CSV_PATH = 'assets/pubsafedash_offenses.csv';

  constructor(private http: HttpClient) { this.init(); }

  /** Return up to `limit` rows for a given year & Service Area (or ‘all’) */
  query(year: number, serviceArea: string, limit = 1000): SaCsvRow[] {
    return this.rows
      .filter(r => {
        const yr = new Date(r.Report_Date).getFullYear();
        return yr === year &&
               (serviceArea === 'all' || r.Service_Area === serviceArea);
      })
      .slice(0, limit);
  }

  /* ---------- internal ---------- */
  private async init() {
    const csv = await firstValueFrom(
      this.http.get(SaCsvService.CSV_PATH, { responseType: 'text' })
    );
    this.rows = this.parse(csv);
    console.info(`[SA-CSV] loaded ${this.rows.length.toLocaleString()} rows`);
    this.ready.next(true);
  }

  private parse(csv: string): SaCsvRow[] {
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    const cols = header.split(',');                        // crude → good enough
    const idx = (name: string) => cols.indexOf(name);

    return lines.map(line => {
      const c = line.split(',');
      return {
        Report_ID:        c[idx('Report_ID')],
        NIBRS_Code_Name:  c[idx('NIBRS_Code_Name')],
        Service_Area:     c[idx('Service_Area')],
        Report_Date:      c[idx('Report_Date')],
        Latitude:         c[idx('Latitude')],
        Longitude:        c[idx('Longitude')],
        Zip_Code:         c[idx('Zip_Code')],
      } as SaCsvRow;
    });
  }
}
