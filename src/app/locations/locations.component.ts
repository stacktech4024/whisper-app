/* eslint-disable @typescript-eslint/member-ordering */
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { IonicModule, MenuController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, filter, retry } from 'rxjs';
import * as L from 'leaflet';
import { AuthService } from '../services/auth.service';
import { CacheService } from '../services/cache.service';
import { ZipLookupService } from '../services/zip-lookup.service';
import { BlockGroupLookupService } from '../services/block-group-lookup.service';
import { SaCsvService } from '../services/sa-csv.service';


/* ──────── Interfaces ──────── */
interface Feature {
  attributes: { NEIGHBOURHOOD_140: string };
}
interface TorontoFeature {
  attributes: {
    MCI_CATEGORY?: string;
    OFFENCE?: string;
    OCC_DATE?: string | number;
    INDEX_?: number;
    NEIGHBOURHOOD_140?: string;
  };
  geometry: { y: number; x: number };
}
interface ChicagoIncident {
  id: string;
  primary_type: string;
  date: string;
  latitude: string;
  longitude: string;
  community_area: string;
}
interface AtlantaFeature {
  attributes: {
    report_number: string;
    OffID: string;
    report_Date: number;
    offense_start_date: number;
    offense_end_date: number;
    location: string;
    location_type: string;
    nibrs_code: string;
    nibrs_code_name: string;
    NhoodName: string;
  };
  geometry: { x: number; y: number };
}
interface Incident {
  id: string;
  category: string;
  display_category: string;
  date: string;
  lat: number;
  lon: number;
  distance: number;
  formattedDate: string;
  neighbourhood?: string;
  community_area?: string;
}
interface NeighbourhoodOption {
  value: string;
  label: string;
}

interface ZipResponse {
  records: Array<{
    zip_code: string;
    latitude: string;
    longitude: string;
  }>;
}

/* ──────── Map markers ──────── */
const crimeIcons: { [k: string]: L.Icon } = {
  Assault: L.icon({
    iconUrl:
      'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  'Break and Enter': L.icon({
    iconUrl:
      'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  Theft: L.icon({
    iconUrl:
      'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  Other: L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

const customIcon: L.Icon = L.icon({
  iconUrl:
    'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -38],
  shadowSize: [48, 48],
});

/* ──────── Component ──────── */
@Component({
  selector: 'app-locations',
  standalone: true,
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule],
})
export class LocationsComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Which timestamp column each city uses in its Socrata dataset */
  private static readonly dateFieldPerCity: Record<string, string> = {
    'fort worth': 'incident_datetime',
    austin: 'occ_date_time',
    // houston: 'report_date_time',
  };

  /* ---- Map & data ---- */
  map: L.Map | null = null;
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  loading = true;

  /* ---- UI filters ---- */
  selectedFilter = 'all';
  filterOptions = ['all', 'Assault', 'Break and Enter', 'Theft', 'Other'];

  selectedYear = 2024;
  availableYears = Array.from({ length: 12 }, (_, i) => 2014 + i);

  selectedCity: 'toronto' | 'chicago' | 'atlanta' | 'texas' = 'toronto';
  selectedNeighbourhood = 'all';
  neighbourhoodOptions: NeighbourhoodOption[] = [];

  /* ---- static lookup ---- */
  private cityNeighbourhoods: { [k: string]: NeighbourhoodOption[] } = {};
  private cityCenters: { [k: string]: [number, number] } = {
    toronto: [43.6532, -79.3832],
    chicago: [41.8781, -87.6298],
    atlanta: [33.7488, -84.3877],
    texas: [31.9686, -99.9018], // Approx centre of Texas
    dallas: [32.7767, -96.7970],
    austin: [30.2672, -97.7431],
    fortworth: [32.7555, -97.3308],
    sanantonio: [29.4241, -98.4936],
  };

  /* ---- user coords ---- */
  userLat = 43.6532;
  userLon = -79.3832;

  /* ---- Crime code mappings for Atlanta ---- */
  private assaultCodes = ['13A', '09A', '11A'];
  private breakEnterCodes = ['220'];
  private theftCodes = ['23A', '23B', '23C', '23D', '23E', '23F', '23G', '23H', '240', '120'];



/** Approximate SAPD “Service Area” centroids */
private static readonly saCentroid: Record<string, [number, number]> = {
  CENTRAL:    [29.4260, -98.4890],
  NORTH:      [29.5730, -98.4950],
  SOUTH:      [29.3330, -98.4950],
  EAST:       [29.4240, -98.4100],
  WEST:       [29.4260, -98.5600],
  PRUE:       [29.5570, -98.6570],
  NORTHEAST:  [29.5520, -98.3750],
  NORTHWEST:  [29.5590, -98.6060],
  SOUTHEAST:  [29.3530, -98.4220],
  SOUTHWEST:  [29.3530, -98.6150],
};

/* ---- DI ---- */
private http     = inject(HttpClient);
private menu     = inject(MenuController);
private authSvc  = inject(AuthService);
private cache    = inject(CacheService);
private zipSvc   = inject(ZipLookupService);
private bgLookup = inject(BlockGroupLookupService);   // block-group centroids
private saCsv    = inject(SaCsvService);              // SAPD CSV loader


  /* ========== Lifecycle ========== */
  async ngOnInit() {
    await this.cache.clear();
    await this.fetchNeighbourhoods('toronto');
    await this.fetchNeighbourhoods('chicago');
    await this.fetchNeighbourhoods('atlanta');
    this.updateNeighbourhoodOptions();
    this.updateLocationAndMap();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initializeMap(this.userLat, this.userLon));
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
  }

  /* ========== Neighbourhood lists ========== */
  private async fetchNeighbourhoods(city: string) {
    const key = `${city}_neigh`;
    let arr = await this.cache.get(key);

    if (!arr) {
      try {
        if (city === 'toronto') {
          const url =
            'https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/' +
            'Major_Crime_Indicators_Open_Data/FeatureServer/0/query' +
            '?where=1=1&outFields=NEIGHBOURHOOD_140&returnDistinctValues=true' +
            '&returnGeometry=false&f=json';

          const res = await firstValueFrom(this.http.get<any>(url));
          const uniq = [
            ...new Set(
              (res?.features || []).map(
                (f: Feature) => f.attributes.NEIGHBOURHOOD_140
              )
            ),
          ].sort();

          arr = uniq.map((n) => ({ value: n, label: n }));
        } else if (city === 'chicago') {
          const url =
            'https://data.cityofchicago.org/resource/igwz-8jzy.json?$select=area_numbe,community&$order=community';
          const data = await firstValueFrom(this.http.get<any[]>(url));
          arr = data.map((d) => ({
            value: String(d.area_numbe),
            label: d.community,
          }));
        } else if (city === 'atlanta') {
          const url =
            'https://services3.arcgis.com/Et5Qfajgiyosiw4d/arcgis/rest/services/CrimeDataExport_2_view/FeatureServer/1/query' +
            '?where=1=1&outFields=NhoodName&returnDistinctValues=true' +
            '&returnGeometry=false&f=json';

          const res = await firstValueFrom(this.http.get<any>(url));
          const uniq = [
            ...new Set(
              (res?.features || []).map((f: any) => f.attributes.NhoodName)
            ),
          ].sort();

          arr = uniq.map((n) => ({ value: n, label: n }));
        }

        if (!arr.length) {
          console.warn(`No neighborhoods found for ${city}`);
        }

        await this.cache.set(key, arr);
      } catch (error) {
        console.error(`Error fetching neighborhoods for ${city}:`, error);
        arr = [];
      }
    }

    this.cityNeighbourhoods[city] = arr;
  }

  private updateNeighbourhoodOptions() {
    if (this.selectedCity === 'texas') {
      this.neighbourhoodOptions = [
        { value: 'all', label: 'All' },
        { value: 'dallas', label: 'Dallas' },
        { value: 'austin', label: 'Austin' },
        { value: 'fortworth', label: 'Fort Worth' },
        { value: 'sanantonio', label: 'San Antonio' },
      ];
    } else {
      this.neighbourhoodOptions = [
        { value: 'all', label: 'All' },
        ...(this.cityNeighbourhoods[this.selectedCity] || []),
      ];
    }
    this.selectedNeighbourhood = 'all';
  }

  /* ========== User actions ========== */
  async onCityChange(city: 'toronto' | 'chicago' | 'atlanta' | 'texas') {
    this.selectedCity = city;
    [this.userLat, this.userLon] = this.cityCenters[city];
    if (this.map) {
      const zoom = city === 'texas' ? 6 : 11;
      this.map.setView([this.userLat, this.userLon], zoom);
    }

    if (city !== 'texas' && !this.cityNeighbourhoods[city]?.length) {
      await this.fetchNeighbourhoods(city);
    }

    this.updateNeighbourhoodOptions();
    this.updateLocationAndMap();
  }

  onNeighbourhoodChange(value: string) {
    this.selectedNeighbourhood = value;
    if (this.selectedCity === 'texas' && value !== 'all') {
      [this.userLat, this.userLon] = this.cityCenters[value];
      if (this.map) {
        this.map.setView([this.userLat, this.userLon], 11);
      }
    } else if (value !== 'all' && this.incidents.length && this.map) {
      const match = this.incidents.find(i =>
        this.selectedCity === 'chicago'
          ? i.community_area === value
          : i.neighbourhood === value
      );
      if (match) {
        this.map.setView([match.lat, match.lon], 13);
      }
    }
    this.updateLocationAndMap();
  }

  onYearChange(y: number) {
    this.selectedYear = y;
    this.updateLocationAndMap();
  }

  onFilterChange(f: string) {
    this.selectedFilter = f;
    this.applyFilter();
  }

  useDeviceLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      this.userLat = pos.coords.latitude;
      this.userLon = pos.coords.longitude;
      this.map?.setView([this.userLat, this.userLon], 13);
      this.updateLocationAndMap();
    });
  }

  toggleMenu() {
    this.menu.toggle();
  }

  /* ========== Fetch data ========== */
  private async updateLocationAndMap() {
    this.loading = true;
    await this.fetchIncidents();
  }

  private async fetchIncidents() {
    await firstValueFrom(this.zipSvc.ready$.pipe(filter(Boolean)));

    const cacheKey = `${this.selectedCity}-${this.selectedYear}-${this.selectedNeighbourhood}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.incidents = cached;
      this.afterFetch();
      return;
    }

    try {
      if (this.selectedCity === 'texas') {
        const sub = this.selectedNeighbourhood === 'all'
          ? ['dallas', 'austin', 'fortworth', 'sanantonio']
          : [this.selectedNeighbourhood];

        const results = await Promise.all(
          sub.map(c => this.fetchIncidentsForCity(c, 'all'))
        );
        this.incidents = results.flat();
      } else {
        this.incidents = await this.fetchIncidentsForCity(
          this.selectedCity,
          this.selectedNeighbourhood,
        );
      }
      await this.cache.set(cacheKey, this.incidents);
    } catch (err) {
      console.error('[Incidents] top-level fetch failed', err);
      this.incidents = [];
    }

    this.afterFetch();
  }


  private async fetchIncidentsForCity(city: string, neighbourhood: string): Promise<Incident[]> {
    try {
      switch (city.toLowerCase()) {
        case 'toronto':
          return await this.fetchTorontoIncidents(this.selectedYear, neighbourhood);
        case 'chicago':
          return await this.fetchChicagoIncidents(this.selectedYear, neighbourhood);
        case 'atlanta':
          return await this.fetchAtlantaIncidents(this.selectedYear, neighbourhood);
        case 'dallas':
          return await this.fetchDallasIncidents(this.selectedYear, neighbourhood);
        case 'austin':
          return await this.fetchAustinIncidents(this.selectedYear, neighbourhood);
        case 'fortworth':
          return await this.fetchFortWorthIncidents(this.selectedYear, neighbourhood);
        case 'sanantonio':
          return await this.fetchSanAntonioIncidents(this.selectedYear, neighbourhood);
        default:
          console.warn(`City "${city}" is not supported.`);
          return [];
      }
    } catch (error) {
      console.error(`Error fetching incidents for city "${city}":`, error);
      alert(`Failed to load incidents for ${city}. Please try again later.`);
      return [];
    }
  }

  private async fetchTorontoIncidents(
    year: number,
    neighbourhood: string
  ): Promise<Incident[]> {
    let where = `REPORT_YEAR='${year}'`;
    if (neighbourhood !== 'all') {
      where += ` AND NEIGHBOURHOOD_140='${neighbourhood}'`;
    }
    const url =
      'https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/' +
      `Major_Crime_Indicators_Open_Data/FeatureServer/0/query?where=${encodeURIComponent(
        where
      )}&outFields=*&outSR=4326&f=json`;
    const res: any = await firstValueFrom(this.http.get(url).pipe(retry(2)));
    return (res?.features || []).map((f: TorontoFeature) => {
      const a = f.attributes;
      const g = f.geometry;
      const disp =
        a.MCI_CATEGORY === 'Assault'
          ? 'Assault'
          : a.MCI_CATEGORY === 'Break and Enter'
          ? 'Break and Enter'
          : ['Auto Theft', 'Robbery', 'Theft Over'].includes(a.MCI_CATEGORY || '')
          ? 'Theft'
          : 'Other';
      return {
        id: String(a.INDEX_),
        category: a.MCI_CATEGORY || a.OFFENCE || 'Unknown',
        display_category: disp,
        date: a.OCC_DATE as any,
        lat: g.y,
        lon: g.x,
        distance: this.dist(this.userLat, this.userLon, g.y, g.x),
        formattedDate: this.fmt(a.OCC_DATE),
        neighbourhood: a.NEIGHBOURHOOD_140,
      } as Incident;
    });
  }

  private async fetchChicagoIncidents(
    year: number,
    neighbourhood: string
  ): Promise<Incident[]> {
    let where = `year = ${year}`;
    if (neighbourhood !== 'all') {
      where += ` AND community_area = '${neighbourhood}'`;
    }
    const url =
      `https://data.cityofchicago.org/resource/ijzp-q8t2.json?` +
      `$where=${encodeURIComponent(where)}&$limit=1000`;
    const data = await firstValueFrom(this.http.get<ChicagoIncident[]>(url).pipe(retry(2)));
    return data.map((d): Incident => {
      const disp =
        ['ASSAULT', 'BATTERY'].includes(d.primary_type)
          ? 'Assault'
          : d.primary_type === 'BURGLARY'
          ? 'Break and Enter'
          : ['THEFT', 'MOTOR VEHICLE THEFT', 'ROBBERY'].includes(d.primary_type)
          ? 'Theft'
          : 'Other';
      const lat = parseFloat(d.latitude);
      const lon = parseFloat(d.longitude);
      return {
        id: d.id,
        category: d.primary_type,
        display_category: disp,
        date: d.date,
        lat: isNaN(lat) ? this.userLat : lat,
        lon: isNaN(lon) ? this.userLon : lon,
        distance: this.dist(
          this.userLat,
          this.userLon,
          isNaN(lat) ? this.userLat : lat,
          isNaN(lon) ? this.userLon : lon
        ),
        formattedDate: this.fmt(d.date),
        community_area: d.community_area,
      };
    });
  }

  private async fetchAtlantaIncidents(
    year: number,
    neighbourhood: string
  ): Promise<Incident[]> {
    let where = `report_Date >= DATE '${year}-01-01' AND report_Date < DATE '${year + 1}-01-01'`;
    if (neighbourhood !== 'all') {
      where += ` AND NhoodName = '${neighbourhood}'`;
    }
    const url =
      'https://services3.arcgis.com/Et5Qfajgiyosiw4d/arcgis/rest/services/' +
      `CrimeDataExport_2_view/FeatureServer/1/query?where=${encodeURIComponent(
        where
      )}&outFields=*&outSR=4326&f=json`;
    const res: any = await firstValueFrom(this.http.get(url).pipe(retry(2)));
    return (res?.features || []).map((f: AtlantaFeature) => {
      const a = f.attributes;
      const g = f.geometry;
      const disp = this.assaultCodes.includes(a.nibrs_code)
        ? 'Assault'
        : this.breakEnterCodes.includes(a.nibrs_code)
        ? 'Break and Enter'
        : this.theftCodes.includes(a.nibrs_code)
        ? 'Theft'
        : 'Other';
      return {
        id: a.report_number,
        category: a.nibrs_code_name,
        display_category: disp,
        date: a.offense_start_date as any,
        lat: g.y,
        lon: g.x,
        distance: this.dist(this.userLat, this.userLon, g.y, g.x),
        formattedDate: this.fmt(a.offense_start_date),
        neighbourhood: a.NhoodName,
      } as Incident;
    });
  }


  /* ───────────── Dallas (fixed) ───────────── */
  private async fetchDallasIncidents(
    year: number,
    neighbourhood: string,
  ): Promise<Incident[]> {

    /* the police-incident feed was moved from **qv6i-rri7** ➜ **yn72-daik**   */
    let where = `year1 = ${year}`;
    if (neighbourhood !== 'all') {
      const safe = neighbourhood.replace(/'/g, "''");
      where += ` AND analysis_neighbourhood = '${safe}'`;
    }

    const url =
      'https://www.dallasopendata.com/resource/yn72-daik.json?' +
      `$where=${encodeURIComponent(where)}&$limit=1000`;

    const rows = await firstValueFrom(this.http.get<any[]>(url).pipe(retry(2)));

    return rows
      .map(r => {
        /* ① preferred: geoJSON column → [lon, lat]           */
        let lat = Number.NaN, lon = Number.NaN;
        if (Array.isArray(r.geocoded_column?.coordinates)) {
          [lon, lat] = r.geocoded_column.coordinates;
        }
        /* ② fallback: explicit latitude / longitude fields  */
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          lat = parseFloat(r.latitude);
          lon = parseFloat(r.longitude);
        }
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

        return {
          id:               r.incidentnum ?? r.incident_number,
          category:         r.nibrs_crime_category ?? 'Unknown',
          display_category: this.mapCategory(r.nibrs_crime_category ?? 'Unknown'),
          date:             r.date1 ?? r.date_of_occurrence,
          lat, lon,
          distance:         this.dist(this.userLat, this.userLon, lat, lon),
          formattedDate:    this.fmt(r.date1 ?? r.date_of_occurrence),
          neighbourhood:    r.analysis_neighbourhood,
        } as Incident;
      })
      .filter(Boolean) as Incident[];
  }


  /* ───────────── Austin (production) ───────────── */
  private async fetchAustinIncidents(
    year: number,
    neighbourhood: string,
  ): Promise<Incident[]> {

    /* 1️⃣  choose the correct Socrata view for the year */
    const viewId =
      { 2024: 'hbc5-hmey', 2023: 'tj6j-eiga', 2022: '74im-wh8j' }[year] ??
      'fdj4-gpfu';

    /* 2️⃣  optional council-district filter */
    let where = '';
    if (neighbourhood !== 'all') {
      const esc = neighbourhood.replace(/'/g, "''");
      where = `$where=council_district='${esc}'&`;
    }

    /* 3️⃣  fetch the newest 1 000 rows */
    const url =
      `https://data.austintexas.gov/resource/${viewId}.json?` +
      `${where}$order=rep_date DESC&$limit=1000`;

    const rows = await firstValueFrom(
      this.http.get<any[]>(url).pipe(retry(2)),
    );

    return rows
      /* 4️⃣  YEAR filter (prefers occurrence date) */
      .filter(r => {
        /** try OCC date ➜ REP date ➜ explicit year ➜ incident ID */
        let yr = r.occ_date ? new Date(r.occ_date).getFullYear() : NaN;

        if (isNaN(yr) && r.occ_date_time) {
          const m = r.occ_date_time.match(/(\d{4})/);
          if (m) yr = +m[1];
        }
        if (isNaN(yr) && r.rep_date) {
          yr = new Date(r.rep_date).getFullYear();
        }
        if (isNaN(yr) && r.rep_date_time) {
          const m = r.rep_date_time.match(/(\d{4})/);
          if (m) yr = +m[1];
        }
        if (isNaN(yr) && r.year1) yr = +r.year1;

        if (isNaN(yr)) {
          const m = String(
            r.incident_report_number ?? r.incident_number ?? '',
          ).match(/^(\d{4}|\d{2})/);
          if (m) yr = m[1].length === 4 ? +m[1] : 2000 + +m[1];
        }

        return yr === year;
      })

      /* 5️⃣  COORDINATE harvest (multi-fallback) */
      .map(r => {
        let lat = parseFloat(r.latitude);
        let lon = parseFloat(r.longitude);

        /* GeoJSON point */
        if ((isNaN(lat) || isNaN(lon)) && r.location?.coordinates) {
          [lon, lat] = r.location.coordinates as [number, number];
        }

        /* 2024-22 views: location_1.latitude / longitude */
        if ((isNaN(lat) || isNaN(lon)) && (r as any).location_1?.latitude) {
          lat = parseFloat((r as any).location_1.latitude);
          lon = parseFloat((r as any).location_1.longitude);
        }

        /* Older rows: location.latitude / longitude */
        if ((isNaN(lat) || isNaN(lon)) &&
            r.location?.latitude && r.location?.longitude) {
          lat = parseFloat(r.location.latitude);
          lon = parseFloat(r.location.longitude);
        }

        /* Block-group centroid (prepend TX FIPS if needed) */
        if ((isNaN(lat) || isNaN(lon)) && r.census_block_group) {
          let geoid = String(r.census_block_group);
          if (geoid.length === 10) geoid = '48' + geoid;
          const cg = this.bgLookup.get(geoid);
          if (cg) [lat, lon] = cg;
        }

        /* ZIP-code centroid (state-wide) */
        if ((isNaN(lat) || isNaN(lon)) && r.zip_code) {
          const zp = this.zipSvc.get(String(r.zip_code));
          if (zp) [lat, lon] = zp;
        }

        /* still no coords → skip row */
        if (isNaN(lat) || isNaN(lon)) return null;

        /* 6️⃣  shape into our Incident model */
        return {
          id:               r.incident_report_number ?? r.incident_number,
          category:         r.crime_type,
          display_category: this.mapCategory(r.crime_type),
          date:             r.occ_date_time ?? r.rep_date_time ??
                          r.occ_date      ?? r.rep_date,
          formattedDate:    this.fmt(r.occ_date_time ?? r.rep_date_time ??
                                    r.occ_date      ?? r.rep_date),
          lat, lon,
          distance:         this.dist(this.userLat, this.userLon, lat, lon),
          neighbourhood:    r.council_district,
        } as Incident;
      })
      .filter(Boolean) as Incident[];
  }


  /* ───────────── Fort Worth (tiny tweak) ───────────── */
  private async fetchFortWorthIncidents(
    year: number,
    neighbourhood: string,
  ): Promise<Incident[]> {

    let where = `reported_date >= '${year}-01-01' AND reported_date < '${year + 1}-01-01'`;
    if (neighbourhood !== 'all') where += ` AND beat = '${neighbourhood}'`;

    const url =
      `https://data.fortworthtexas.gov/resource/k6ic-7kp7.json?` +
      `$where=${encodeURIComponent(where)}&$limit=1000`;

    const rows = await firstValueFrom(this.http.get<any[]>(url).pipe(retry(2)));

    return rows
      .map(r => {
        /* ① preferred: location_1 (lat/lon strings) */
        let lat = parseFloat(r.location_1?.latitude  ?? '');
        let lon = parseFloat(r.location_1?.longitude ?? '');

        /* ② GeoJSON fallback (newer rows) */
        if ((isNaN(lat) || isNaN(lon)) && r.location_1?.coordinates) {
          [lon, lat] = r.location_1.coordinates as [number, number];
        }

        if (isNaN(lat) || isNaN(lon)) return null;   // still bad → skip

        return {
          id              : r.case_no,
          category        : r.offense_desc ?? r.offense,
          display_category: this.mapCategory(r.offense_desc ?? r.offense),
          date            : r.reported_date,
          formattedDate   : this.fmt(r.reported_date),
          lat, lon,
          distance        : this.dist(this.userLat, this.userLon, lat, lon),
          neighbourhood   : r.beat,
        } as Incident;
      })
      .filter(Boolean) as Incident[];
  }


  /* ───────────── San Antonio (local-CSV) ───────────── */
  private async fetchSanAntonioIncidents(
    year: number,
    neighbourhood: string,            // SAPD Service_Area
  ): Promise<Incident[]> {

    /* 1️⃣  wait until the CSV rows are ready */
    await firstValueFrom(this.saCsv.ready$.pipe(filter(Boolean)));

    /* 2️⃣  pull up to 1 000 rows that match year + neighbourhood filter */
    const rows = this.saCsv.query(year, neighbourhood, 1000);

    /* 3️⃣  shape every CSV row → Incident -------------------------------- */
    return rows.map(r => {
      /* ---- latitude / longitude with several fallbacks ---------------- */
      let lat = parseFloat(r.Latitude  ?? '');
      let lon = parseFloat(r.Longitude ?? '');

      /* (a) Service-area centroid */
      /* (a) Service-Area centroid */
      if ((isNaN(lat) || isNaN(lon)) && r.Service_Area) {
        const key = String(r.Service_Area).trim().toUpperCase();
        const sa  = LocationsComponent.saCentroid?.[key];   // safe access
        if (sa) [lat, lon] = sa;
      }


      /* (b) ZIP-code centroid */
      if ((isNaN(lat) || isNaN(lon)) && r.Zip_Code) {
        const zp = this.zipSvc.get(String(r.Zip_Code));
        if (zp) [lat, lon] = zp;
      }

      /* (c) final emergency – downtown San Antonio */
      if (isNaN(lat) || isNaN(lon)) {
        [lat, lon] = this.cityCenters['sanantonio'];   // never NaN
      }

      /* ---- shape into our Incident model ------------------------------ */
      return {
        id:               r.Report_ID,
        category:         r.NIBRS_Code_Name,
        display_category: this.mapCategory(r.NIBRS_Code_Name),
        date:             r.Report_Date,
        formattedDate:    this.fmt(r.Report_Date),
        lat, lon,
        distance:         this.dist(this.userLat, this.userLon, lat, lon),
        neighbourhood:    r.Service_Area,
      } as Incident;
    });
  }



  /* ========== Post-fetch housekeeping ========== */
  private afterFetch(): void {
    console.log('Incidents fetched:', this.incidents.length);

    /* 1️⃣  apply filter & update list */
    this.applyFilter();

    /* 2️⃣  choose a sensible map view */
    if (this.filteredIncidents.length && this.map) {
      const { lat, lon } = this.filteredIncidents[0];
      this.map.setView([lat, lon], 13);
    } else if (this.map) {
      /* fall back to city-centre */
      const [lat, lon] = this.cityCenters[this.selectedCity];
      this.map.setView([lat, lon], 11);
    }

    /* 3️⃣  redraw pins */
    this.loading = false;
    this.updateMap();
  }

  /* ========== Category → display bucket ========== */
  private mapCategory(cat: string): string {
    const c = cat?.toLowerCase() ?? '';
    if (c.includes('assault') || c.includes('battery'))               return 'Assault';
    if (c.includes('burglary') || c.includes('break') || c.includes('enter'))
                                                                   return 'Break and Enter';
    if (c.includes('theft') || c.includes('larceny') || c.includes('robbery'))
                                                                   return 'Theft';
    return 'Other';
  }

  /* ========== Filtering & map ========== */
  private applyFilter(): void {
    console.log('Applying filter:', this.selectedFilter, 'Incidents:', this.incidents.length);
    this.filteredIncidents =
      this.selectedFilter === 'all'
        ? [...this.incidents]
        : this.incidents.filter((i) => i.display_category === this.selectedFilter);
    console.log('Filtered incidents:', this.filteredIncidents.length);
    if (this.filteredIncidents.length && this.map) {
      const first = this.filteredIncidents[0];
      this.map.setView([first.lat, first.lon], 13);
    }

    this.updateMap();
  }

  private initializeMap(lat: number, lon: number) {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
    this.map = L.map('map').setView([lat, lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.updateMap();
  }

  private updateMap() {
    if (!this.map) return;

    this.map.eachLayer((l) => {
      if (l instanceof L.Marker) this.map!.removeLayer(l);
    });

    L.marker([this.userLat, this.userLon], { icon: customIcon })
      .addTo(this.map)
      .bindPopup('📍 You are here');

    let markersAdded = 0;
    this.filteredIncidents.forEach((inc) => {
      if (inc.lat && inc.lon && !isNaN(inc.lat) && !isNaN(inc.lon)) {
        const icon = crimeIcons[inc.display_category] || crimeIcons['Other'];
        L.marker([inc.lat, inc.lon], { icon })
          .addTo(this.map!)
          .bindPopup(
            `<strong>${inc.category}</strong><br>${inc.formattedDate}<br>${inc.distance.toFixed(
              2
            )} km`
          );
        markersAdded++;
      } else {
        console.warn('Invalid coordinates for incident:', inc.id, inc.lat, inc.lon);
      }
    });
    console.log(`Added ${markersAdded} markers to the map`);
  }

  /* ========== Helpers ========== */
  private fmt(value: any): string {
    const d = typeof value === 'number' ? new Date(value) : new Date(value);
    return isNaN(d.getTime())
      ? 'N/A'
      : d.toLocaleDateString('en-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Toronto',
        });
  }

  private dist(a: number, b: number, c: number, d: number): number {
    const R = 6371;
    const dLat = ((c - a) * Math.PI) / 180;
    const dLon = ((d - b) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a * Math.PI) / 180) *
        Math.cos((c * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  iconUrl(cat: string): string {
    switch (cat) {
      case 'Assault':
        return 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
      case 'Break and Enter':
        return 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
      case 'Theft':
        return 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
      default:
        return 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
    }
  }
}