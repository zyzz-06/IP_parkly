import { Injectable } from '@angular/core';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoResult extends GeoPoint {
  label: string;
}

export interface ParkingSpot extends GeoPoint {
  id: string;
  title: string;
  pricePerHour: number;
  totalPrice: number;
  distanceM: number;
}

/** Testna (mock) mesta – zamik od iskane točke v stopinjah in cena na uro. */
const MOCK_SPOTS = [
  { title: 'Dvorišče ob hiši', dLat: 0.0032, dLng: -0.0041, pricePerHour: 1.5 },
  { title: 'Garaža v bloku', dLat: -0.0027, dLng: 0.0046, pricePerHour: 2.2 },
  { title: 'Pokrito mesto v centru', dLat: 0.0012, dLng: 0.0063, pricePerHour: 3.0 },
] as const;

@Injectable({ providedIn: 'root' })
export class ParkingService {
  /** Poišče koordinate kraja prek OpenStreetMap Nominatim. */
  async geocode(query: string): Promise<GeoResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('accept-language', 'sl');
    url.searchParams.set('q', query);

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Geokodiranje ni uspelo (${response.status})`);
    }

    const data = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    if (data.length === 0) {
      return null;
    }
    return { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name };
  }

  /**
   * MVP: vrne 3 izmišljena prosta mesta okoli iskane točke.
   * TODO: zamenjati s klicem backend API-ja (GET /parking-spots?lat&lng&from&to).
   */
  findNearby(center: GeoPoint, from: Date, to: Date): ParkingSpot[] {
    const hours = (to.getTime() - from.getTime()) / 3_600_000;

    return MOCK_SPOTS.map((spot, index) => {
      const point = { lat: center.lat + spot.dLat, lng: center.lng + spot.dLng };
      return {
        id: `mock-${index + 1}`,
        title: spot.title,
        ...point,
        pricePerHour: spot.pricePerHour,
        totalPrice: Math.round(spot.pricePerHour * hours * 100) / 100,
        distanceM: Math.round(distanceInMeters(center, point) / 10) * 10,
      };
    }).sort((a, b) => a.distanceM - b.distanceM);
  }
}

/** Haversinova razdalja med dvema točkama v metrih. */
function distanceInMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
