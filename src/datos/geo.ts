// Copiado de sensor-app/src/datos/geo.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Cuentas de mapa sin dependencias (se prueban con jest). Coordenadas como las usa
// react-native-maps: { latitude, longitude }. GeoJSON usa [lng, lat].

export type Punto = { latitude: number; longitude: number };
export type PoligonoGeoJson = { type: "Polygon"; coordinates: number[][][] };

const RADIO_TIERRA_M = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;

/** Puntos del borde (sin repetir el primero al final) → GeoJSON cerrado. */
export function aGeoJson(puntos: Punto[]): PoligonoGeoJson {
  const anillo = puntos.map((p) => [
    redondear(p.longitude),
    redondear(p.latitude),
  ]);
  if (anillo.length) anillo.push([...anillo[0]]);
  return { type: "Polygon", coordinates: [anillo] };
}

/** GeoJSON → puntos del borde exterior, sin el punto de cierre. */
export function desdeGeoJson(g: PoligonoGeoJson | null | undefined): Punto[] {
  const anillo = g?.coordinates?.[0] ?? [];
  const puntos = anillo.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));
  if (puntos.length > 1) {
    const a = puntos[0];
    const z = puntos[puntos.length - 1];
    if (a.latitude === z.latitude && a.longitude === z.longitude) puntos.pop();
  }
  return puntos;
}

const redondear = (x: number) => Math.round(x * 1e7) / 1e7;

/** Superficie en hectáreas (fórmula esférica; error menor al 0,5 % para lotes agrícolas). */
export function areaHa(puntos: Punto[]): number {
  if (puntos.length < 3) return 0;
  let suma = 0;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % puntos.length];
    suma +=
      rad(b.longitude - a.longitude) *
      (2 + Math.sin(rad(a.latitude)) + Math.sin(rad(b.latitude)));
  }
  return Math.abs((suma * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2) / 10000;
}

/** ¿El punto está dentro del polígono? (rayo; suficiente para lotes) */
export function dentro(p: Punto, poligono: Punto[]): boolean {
  let adentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i];
    const b = poligono[j];
    const cruza =
      a.latitude > p.latitude !== b.latitude > p.latitude &&
      p.longitude <
        ((b.longitude - a.longitude) * (p.latitude - a.latitude)) /
          (b.latitude - a.latitude) +
          a.longitude;
    if (cruza) adentro = !adentro;
  }
  return adentro;
}

/** ¿Dos lados no vecinos se cruzan? (la base lo rechaza: se avisa antes de guardar) */
export function seCruza(puntos: Punto[]): boolean {
  const n = puntos.length;
  if (n < 4) return false;
  const orient = (p: Punto, q: Punto, r: Punto) =>
    Math.sign(
      (q.longitude - p.longitude) * (r.latitude - p.latitude) -
        (q.latitude - p.latitude) * (r.longitude - p.longitude),
    );
  for (let i = 0; i < n; i++) {
    const a1 = puntos[i];
    const a2 = puntos[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue; // lados vecinos
      const b1 = puntos[j];
      const b2 = puntos[(j + 1) % n];
      if (
        orient(a1, a2, b1) * orient(a1, a2, b2) < 0 &&
        orient(b1, b2, a1) * orient(b1, b2, a2) < 0
      )
        return true;
    }
  }
  return false;
}

/** Centro aproximado (promedio de vértices): para poner el nombre del lote. */
export function centro(puntos: Punto[]): Punto | null {
  if (!puntos.length) return null;
  const s = puntos.reduce(
    (acc, p) => ({
      latitude: acc.latitude + p.latitude,
      longitude: acc.longitude + p.longitude,
    }),
    {
      latitude: 0,
      longitude: 0,
    },
  );
  return {
    latitude: s.latitude / puntos.length,
    longitude: s.longitude / puntos.length,
  };
}

/** Superficie para mostrar: "0,85 ha", "12,3 ha", "1.250 ha". */
export function textoHa(ha: number | null | undefined): string {
  if (ha == null) return "—";
  const decimales = ha < 10 ? 2 : ha < 100 ? 1 : 0;
  return `${ha.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} ha`;
}

// Vista inicial si no hay nada que mostrar: EEA Catamarca.
export const CATAMARCA: Punto = { latitude: -28.4696, longitude: -65.7795 };

// ---------------------------------------------------------------------------------------
// Agrupar marcas cercanas en pantalla (para que no se encimen cuando el mapa está lejos)

export type Vista = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type Grupo<T> = { centro: Punto; items: T[] };

/**
 * Agrupa los puntos que en pantalla quedarían a menos de `distanciaPx`. `anchoPx`/`altoPx` es
 * el tamaño del mapa. Codicioso y sin dependencias: alcanza para decenas de sitios por campo.
 */
export function agruparCercanos<T extends { punto: Punto }>(
  items: T[],
  vista: Vista,
  anchoPx: number,
  altoPx: number,
  distanciaPx = 34,
): Grupo<T>[] {
  const pxLng = anchoPx / vista.longitudeDelta;
  const pxLat = altoPx / vista.latitudeDelta;
  const grupos: Grupo<T>[] = [];
  for (const it of items) {
    const g = grupos.find(
      (x) =>
        Math.hypot(
          (x.centro.longitude - it.punto.longitude) * pxLng,
          (x.centro.latitude - it.punto.latitude) * pxLat,
        ) < distanciaPx,
    );
    if (g) {
      g.items.push(it);
      const n = g.items.length;
      g.centro = {
        latitude:
          g.centro.latitude + (it.punto.latitude - g.centro.latitude) / n,
        longitude:
          g.centro.longitude + (it.punto.longitude - g.centro.longitude) / n,
      };
    } else {
      grupos.push({ centro: { ...it.punto }, items: [it] });
    }
  }
  return grupos;
}

/** Ancho en píxeles que ocupa un polígono en la vista actual (para decidir si va el nombre). */
export function anchoEnPantalla(
  puntos: Punto[],
  vista: Vista,
  anchoPx: number,
): number {
  if (puntos.length < 2) return 0;
  const lngs = puntos.map((p) => p.longitude);
  return (
    ((Math.max(...lngs) - Math.min(...lngs)) / vista.longitudeDelta) * anchoPx
  );
}
