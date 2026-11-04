// Polígonos desde un archivo (KML o KMZ de Google Earth y Mis mapas, GeoJSON de QGIS) o escritos
// a mano (grados decimales, una esquina por línea). Funciones puras: el mismo archivo está en
// sensor-app y en sensor-web (src/datos/importarPoligono.ts). Se prueban con jest y vitest.
//
// Solo se toma el borde exterior de cada polígono (los huecos no se guardan) y se devuelven las
// esquinas sin repetir la primera al final, como las usa el editor de dibujo. Coordenadas WGS84
// (las de KML y GeoJSON); no se convierten otras proyecciones.
import { unzipSync, strFromU8 } from "fflate";

import type { Punto } from "./geo";

export type PoligonoImportado = { nombre: string; puntos: Punto[] };
export type Importacion = { poligonos: PoligonoImportado[]; error: string | null };

const MAX_ESQUINAS = 2000;

function limpiar(puntos: Punto[]): Punto[] {
  const r: Punto[] = [];
  for (const p of puntos) {
    const ult = r.at(-1);
    if (ult && ult.latitude === p.latitude && ult.longitude === p.longitude) continue;
    r.push(p);
  }
  const a = r[0];
  const z = r.at(-1);
  if (r.length > 1 && a && z && a.latitude === z.latitude && a.longitude === z.longitude) r.pop();
  return r;
}

const valido = (p: Punto) =>
  Number.isFinite(p.latitude) &&
  Number.isFinite(p.longitude) &&
  Math.abs(p.latitude) <= 90 &&
  Math.abs(p.longitude) <= 180;

function nombrar(base: string, n: number, total: number): string {
  const b = base.trim() || "Polígono";
  return total > 1 ? `${b} (${n})` : b;
}

function entidades(t: string): string {
  return t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** "lon,lat[,alt] lon,lat…" de un <coordinates> de KML. */
function coordenadasKml(t: string): Punto[] {
  return t
    .trim()
    .split(/\s+/)
    .map((par) => par.split(","))
    .filter((c) => c.length >= 2)
    .map((c) => ({ latitude: Number(c[1]), longitude: Number(c[0]) }));
}

/** KML: cada <Polygon> (también dentro de MultiGeometry), con el <name> de su Placemark. */
export function poligonosKml(kml: string): PoligonoImportado[] {
  const sinComentarios = kml.replace(/<!--[\s\S]*?-->/g, "");
  const r: PoligonoImportado[] = [];
  const marcas = sinComentarios.match(/<(?:\w+:)?Placemark\b[\s\S]*?<\/(?:\w+:)?Placemark>/g) ?? [];
  marcas.forEach((m, i) => {
    const nombre = entidades(/<(?:\w+:)?name>([\s\S]*?)<\/(?:\w+:)?name>/.exec(m)?.[1] ?? "") || `Polígono ${i + 1}`;
    const poligonos = m.match(/<(?:\w+:)?Polygon\b[\s\S]*?<\/(?:\w+:)?Polygon>/g) ?? [];
    poligonos.forEach((pg, j) => {
      const exterior = /<(?:\w+:)?outerBoundaryIs>[\s\S]*?<(?:\w+:)?coordinates>([\s\S]*?)<\/(?:\w+:)?coordinates>/.exec(pg);
      if (!exterior) return;
      const puntos = limpiar(coordenadasKml(exterior[1]));
      r.push({ nombre: nombrar(nombre, j + 1, poligonos.length), puntos });
    });
  });
  return r;
}

type Geometria = { type?: string; coordinates?: unknown; geometries?: Geometria[] };
type Elemento = { type?: string; geometry?: Geometria; properties?: Record<string, unknown> | null; features?: Elemento[] } & Geometria;

function anilloGeoJson(anillo: unknown): Punto[] {
  if (!Array.isArray(anillo)) return [];
  return limpiar(
    anillo
      .filter((c): c is number[] => Array.isArray(c) && c.length >= 2)
      .map((c) => ({ latitude: Number(c[1]), longitude: Number(c[0]) })),
  );
}

function nombreDe(props: Record<string, unknown> | null | undefined, i: number): string {
  for (const k of ["name", "Name", "NAME", "nombre", "Nombre", "NOMBRE", "lote", "Lote", "LOTE"]) {
    const v = props?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return `Polígono ${i + 1}`;
}

/** GeoJSON: Polygon y MultiPolygon, sueltos, en Feature o en FeatureCollection. */
export function poligonosGeoJson(texto: string): PoligonoImportado[] {
  const raiz = JSON.parse(texto) as Elemento;
  const elementos: Elemento[] =
    raiz.type === "FeatureCollection" ? (raiz.features ?? []) : raiz.type === "Feature" ? [raiz] : [{ geometry: raiz }];
  const r: PoligonoImportado[] = [];
  elementos.forEach((e, i) => {
    const nombre = nombreDe(e.properties, i);
    const geometrias = (g: Geometria | undefined): Geometria[] =>
      !g ? [] : g.type === "GeometryCollection" ? (g.geometries ?? []).flatMap(geometrias) : [g];
    const anillos: unknown[] = [];
    for (const g of geometrias(e.geometry)) {
      if (g.type === "Polygon" && Array.isArray(g.coordinates)) anillos.push(g.coordinates[0]);
      if (g.type === "MultiPolygon" && Array.isArray(g.coordinates))
        for (const p of g.coordinates) if (Array.isArray(p)) anillos.push(p[0]);
    }
    anillos.forEach((a, j) => r.push({ nombre: nombrar(nombre, j + 1, anillos.length), puntos: anilloGeoJson(a) }));
  });
  return r;
}

/** El primer .kml de un KMZ (zip). */
export function kmlDeKmz(bytes: Uint8Array): string | null {
  const archivos = unzipSync(bytes, { filter: (f) => f.name.toLowerCase().endsWith(".kml") });
  const nombres = Object.keys(archivos).sort((a, b) => (a.toLowerCase() === "doc.kml" ? -1 : b.toLowerCase() === "doc.kml" ? 1 : 0));
  const primero = nombres[0];
  return primero ? strFromU8(archivos[primero]) : null;
}

function revisar(poligonos: PoligonoImportado[]): Importacion {
  const utiles = poligonos.filter((p) => p.puntos.length >= 3 && p.puntos.every(valido));
  if (!poligonos.length) return { poligonos: [], error: "El archivo no tiene polígonos (solo se leen áreas, no puntos ni líneas)." };
  if (!utiles.length)
    return { poligonos: [], error: "Los polígonos del archivo no tienen al menos tres esquinas válidas (latitud y longitud en grados)." };
  const grandes = utiles.filter((p) => p.puntos.length > MAX_ESQUINAS);
  if (grandes.length === utiles.length)
    return { poligonos: [], error: `Los polígonos tienen más de ${MAX_ESQUINAS} esquinas: simplificalos antes (por ejemplo, en QGIS).` };
  return { poligonos: utiles.filter((p) => p.puntos.length <= MAX_ESQUINAS), error: null };
}

/**
 * Lee un archivo por su nombre: .kml, .kmz, .geojson o .json. Devuelve los polígonos con al menos
 * tres esquinas, o un error en palabras.
 */
export function importarArchivo(nombre: string, bytes: Uint8Array): Importacion {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  try {
    if (ext === "kmz") {
      const kml = kmlDeKmz(bytes);
      if (!kml) return { poligonos: [], error: "El KMZ no tiene un archivo KML adentro." };
      return revisar(poligonosKml(kml));
    }
    const texto = strFromU8(bytes);
    if (ext === "kml") return revisar(poligonosKml(texto));
    if (ext === "geojson" || ext === "json") return revisar(poligonosGeoJson(texto));
    return { poligonos: [], error: "Formato no reconocido: se leen archivos .kml, .kmz, .geojson o .json." };
  } catch {
    return { poligonos: [], error: "No se pudo leer el archivo: puede estar dañado o no ser del formato que dice su nombre." };
  }
}

export type CoordenadasEscritas = { puntos: Punto[]; error: string | null };

/**
 * Esquinas escritas a mano en grados decimales, una por línea: "latitud, longitud" (como las copia
 * Google Maps: -28.4696, -65.7795). También acepta separarlas con espacio o punto y coma. Las líneas
 * vacías no cuentan. Si la primera esquina se repite al final, se saca.
 */
export function leerCoordenadas(texto: string): CoordenadasEscritas {
  const puntos: Punto[] = [];
  const lineas = texto.split(/\r?\n/);
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]!.trim();
    if (!l) continue;
    const partes = l.split(/\s*[;,\t]\s*|\s+/).filter(Boolean);
    const nums = partes.map(Number);
    if (partes.length !== 2 || nums.some((n) => !Number.isFinite(n)))
      return { puntos: [], error: `Línea ${i + 1}: escribí latitud y longitud en grados decimales, separadas por coma (ej.: -28.4696, -65.7795).` };
    const [lat, lng] = nums as [number, number];
    if (Math.abs(lat) > 90)
      return { puntos: [], error: `Línea ${i + 1}: la latitud va de -90 a 90. ¿Están invertidas? Primero va la latitud y después la longitud.` };
    if (Math.abs(lng) > 180) return { puntos: [], error: `Línea ${i + 1}: la longitud va de -180 a 180.` };
    puntos.push({ latitude: lat, longitude: lng });
  }
  const limpios = limpiar(puntos);
  if (limpios.length < 3) return { puntos: [], error: "Hacen falta al menos tres esquinas, una por línea." };
  return { puntos: limpios, error: null };
}
