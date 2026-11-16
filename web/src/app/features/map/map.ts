import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { AuthService } from '../../core/auth.service';
import { GeoResult, ParkingService, ParkingSpot } from '../../core/parking.service';
import { addMinutes, roundToQuarter, toLocalInput } from '../../core/time';

const LJUBLJANA: L.LatLngTuple = [46.0569, 14.5058];

@Component({
  selector: 'app-map',
  imports: [FormsModule],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapPage implements OnDestroy {
  private readonly parking = inject(ParkingService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  private readonly mapElement = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private readonly placeInput = viewChild<ElementRef<HTMLInputElement>>('placeInput');

  protected readonly searchOpen = signal(false);
  protected readonly place = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<ParkingSpot[]>([]);
  protected readonly selectedId = signal<string | null>(null);

  private map?: L.Map;
  private readonly resultLayer = L.layerGroup();
  private readonly markers = new Map<string, L.Marker>();

  constructor() {
    const start = roundToQuarter(new Date(), 'up');
    this.from.set(toLocalInput(start));
    this.to.set(toLocalInput(addMinutes(start, 120)));

    afterNextRender(() => this.initMap());
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
    setTimeout(() => this.placeInput()?.nativeElement.focus());
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.error.set(null);
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  /** Klic ob Enter / gumbu "Išči". */
  protected async search(): Promise<void> {
    const query = this.place().trim();
    if (!query) {
      this.error.set('Vpiši kraj ali naslov.');
      return;
    }

    const from = roundToQuarter(new Date(this.from()));
    const to = roundToQuarter(new Date(this.to()));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      this.error.set('Izberi čas od in do.');
      return;
    }
    if (to <= from) {
      this.error.set('Čas "do" mora biti za časom "od".');
      return;
    }
    // Prikaži zaokrožene (15-min) vrednosti nazaj v polja.
    this.from.set(toLocalInput(from));
    this.to.set(toLocalInput(to));

    this.error.set(null);
    this.loading.set(true);
    try {
      const location = await this.parking.geocode(query);
      if (!location) {
        this.error.set(`Kraja "${query}" ni mogoče najti.`);
        return;
      }
      const spots = this.parking.findNearby(location, from, to);
      this.results.set(spots);
      this.selectedId.set(null);
      this.drawResults(location, spots);
    } catch {
      this.error.set('Iskanje ni uspelo. Preveri internetno povezavo.');
    } finally {
      this.loading.set(false);
    }
  }

  protected select(id: string): void {
    this.selectedId.set(id);
    for (const [key, marker] of this.markers) {
      marker.getElement()?.classList.toggle('selected', key === id);
    }
    const marker = this.markers.get(id);
    if (marker && this.map) {
      this.map.panTo(marker.getLatLng());
    }
  }

  protected eur(value: number): string {
    return value.toLocaleString('sl-SI', { style: 'currency', currency: 'EUR' });
  }

  private initMap(): void {
    this.map = L.map(this.mapElement().nativeElement, { zoomControl: false }).setView(LJUBLJANA, 13);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.resultLayer.addTo(this.map);
  }

  private drawResults(location: GeoResult, spots: ParkingSpot[]): void {
    if (!this.map) {
      return;
    }
    this.resultLayer.clearLayers();
    this.markers.clear();

    // Iskana točka
    L.circleMarker([location.lat, location.lng], {
      radius: 8,
      weight: 3,
      color: '#1d4ed8',
      fillColor: '#60a5fa',
      fillOpacity: 1,
    })
      .bindTooltip(location.label.split(',')[0])
      .addTo(this.resultLayer);

    // 3 zadetki s cenami
    for (const spot of spots) {
      const marker = L.marker([spot.lat, spot.lng], {
        title: spot.title,
        icon: L.divIcon({
          className: 'price-marker-wrap',
          html: `<div class="price-marker">${this.eur(spot.pricePerHour)}/h</div>`,
          iconSize: [84, 32],
          iconAnchor: [42, 32],
        }),
      })
        .on('click', () => this.select(spot.id))
        .addTo(this.resultLayer);
      this.markers.set(spot.id, marker);
    }

    const bounds = L.latLngBounds([
      [location.lat, location.lng],
      ...spots.map((s): L.LatLngTuple => [s.lat, s.lng]),
    ]);
    this.map.flyToBounds(bounds, {
      paddingTopLeft: [40, 240],
      paddingBottomRight: [40, 220],
      maxZoom: 16,
      duration: 1.2,
    });
  }
}
