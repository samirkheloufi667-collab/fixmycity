import { boundingBox, haversineMeters, parseBbox } from './geo';

describe('haversineMeters', () => {
  it('mesure environ 111 km pour un degré de latitude', () => {
    const d = haversineMeters({ latitude: 48, longitude: 2 }, { latitude: 49, longitude: 2 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('retrouve une distance connue : Tour Eiffel → Notre-Dame ≈ 4,1 km', () => {
    const d = haversineMeters({ latitude: 48.8584, longitude: 2.2945 }, { latitude: 48.853, longitude: 2.3499 });
    expect(d).toBeGreaterThan(4_000);
    expect(d).toBeLessThan(4_200);
  });

  it('vaut zéro pour un même point', () => {
    expect(haversineMeters({ latitude: 48.8, longitude: 2.3 }, { latitude: 48.8, longitude: 2.3 })).toBe(0);
  });
});

describe('boundingBox', () => {
  it('contient tout le cercle demandé', () => {
    const center = { latitude: 48.8123, longitude: 2.3605 };
    const box = boundingBox(center, 75);
    expect(haversineMeters(center, { latitude: box.maxLat, longitude: center.longitude })).toBeCloseTo(75, 0);
    expect(haversineMeters(center, { latitude: center.latitude, longitude: box.maxLng })).toBeCloseTo(75, 0);
  });
});

describe('parseBbox', () => {
  it('lit le format de Leaflet', () => {
    expect(parseBbox('2.35,48.80,2.37,48.82')).toEqual({ minLng: 2.35, minLat: 48.8, maxLng: 2.37, maxLat: 48.82 });
  });

  it.each(['', '1,2,3', 'a,b,c,d', '2.37,48.80,2.35,48.82', '0,-91,1,0'])('refuse « %s »', (raw) => {
    expect(parseBbox(raw)).toBeNull();
  });
});
