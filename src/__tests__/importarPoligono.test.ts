import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { importarArchivo, leerCoordenadas, poligonosGeoJson, poligonosKml } from "@/datos/importarPoligono";

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Finca</name>
<Placemark><name>Lote &amp; norte</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
-65.78,-28.46,0 -65.77,-28.46,0 -65.77,-28.47,0 -65.78,-28.46,0
</coordinates></LinearRing></outerBoundaryIs><innerBoundaryIs><LinearRing><coordinates>
-65.775,-28.462,0 -65.774,-28.462,0 -65.774,-28.463,0 -65.775,-28.462,0
</coordinates></LinearRing></innerBoundaryIs></Polygon></Placemark>
<Placemark><name><![CDATA[Pozo]]></name><Point><coordinates>-65.7,-28.4,0</coordinates></Point></Placemark>
<Placemark><name>Dos partes</name><MultiGeometry>
<Polygon><outerBoundaryIs><LinearRing><coordinates>-65.70,-28.40 -65.69,-28.40 -65.69,-28.41</coordinates></LinearRing></outerBoundaryIs></Polygon>
<Polygon><outerBoundaryIs><LinearRing><coordinates>-65.60,-28.40 -65.59,-28.40 -65.59,-28.41</coordinates></LinearRing></outerBoundaryIs></Polygon>
</MultiGeometry></Placemark>
</Document></kml>`;

describe("poligonosKml", () => {
  it("toma el borde exterior, con el nombre del Placemark y sin repetir la primera esquina", () => {
    const p = poligonosKml(KML);
    expect(p.map((x) => x.nombre)).toEqual(["Lote & norte", "Dos partes (1)", "Dos partes (2)"]);
    expect(p[0]!.puntos).toEqual([
      { latitude: -28.46, longitude: -65.78 },
      { latitude: -28.46, longitude: -65.77 },
      { latitude: -28.47, longitude: -65.77 },
    ]);
  });
});

describe("poligonosGeoJson", () => {
  it("Feature, MultiPolygon y nombre desde properties", () => {
    const gj = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { nombre: "Lote 3" }, geometry: { type: "Polygon", coordinates: [[[-65, -28], [-64.9, -28], [-64.9, -28.1], [-65, -28]]] } },
        { type: "Feature", properties: null, geometry: { type: "MultiPolygon", coordinates: [[[[-65, -28], [-64, -28], [-64, -29]]], [[[-63, -28], [-62, -28], [-62, -29]]]] } },
        { type: "Feature", properties: { name: "Camino" }, geometry: { type: "LineString", coordinates: [[-65, -28], [-64, -28]] } },
      ],
    };
    const p = poligonosGeoJson(JSON.stringify(gj));
    expect(p.map((x) => x.nombre)).toEqual(["Lote 3", "Polígono 2 (1)", "Polígono 2 (2)"]);
    expect(p[0]!.puntos).toHaveLength(3);
  });
  it("una geometría suelta", () => {
    const p = poligonosGeoJson(JSON.stringify({ type: "Polygon", coordinates: [[[-65, -28], [-64, -28], [-64, -29], [-65, -28]]] }));
    expect(p).toHaveLength(1);
    expect(p[0]!.puntos[2]).toEqual({ latitude: -29, longitude: -64 });
  });
});

describe("importarArchivo", () => {
  it("KML por extensión, sin el punto ni polígonos chicos", () => {
    const r = importarArchivo("finca.KML", strToU8(KML));
    expect(r.error).toBeNull();
    expect(r.poligonos).toHaveLength(3);
  });
  it("KMZ: lee el doc.kml del zip", () => {
    const kmz = zipSync({ "files/foto.jpg": new Uint8Array([1, 2]), "doc.kml": strToU8(KML) });
    const r = importarArchivo("finca.kmz", kmz);
    expect(r.error).toBeNull();
    expect(r.poligonos[0]!.nombre).toBe("Lote & norte");
  });
  it("errores en palabras", () => {
    expect(importarArchivo("a.shp", new Uint8Array()).error).toMatch(/Formato no reconocido/);
    expect(importarArchivo("a.geojson", strToU8("{no es json")).error).toMatch(/No se pudo leer/);
    expect(importarArchivo("a.kml", strToU8("<kml><Placemark><Point><coordinates>1,2</coordinates></Point></Placemark></kml>")).error).toMatch(
      /no tiene polígonos/,
    );
    expect(importarArchivo("a.kmz", zipSync({ "x.txt": strToU8("hola") })).error).toMatch(/no tiene un archivo KML/);
  });
  it("coordenadas fuera de rango no cuentan", () => {
    const gj = { type: "Polygon", coordinates: [[[-650, -28], [-64, -28], [-64, -29]]] };
    expect(importarArchivo("a.json", strToU8(JSON.stringify(gj))).error).toMatch(/tres esquinas válidas/);
  });
});

describe("leerCoordenadas", () => {
  it("una esquina por línea, como las copia Google Maps", () => {
    const r = leerCoordenadas("-28.4696, -65.7795\n\n-28.4700 -65.7790\n-28.4710;-65.7801\n-28.4696, -65.7795\n");
    expect(r.error).toBeNull();
    expect(r.puntos).toEqual([
      { latitude: -28.4696, longitude: -65.7795 },
      { latitude: -28.47, longitude: -65.779 },
      { latitude: -28.471, longitude: -65.7801 },
    ]);
  });
  it("avisa la línea con problema", () => {
    expect(leerCoordenadas("-28.4, -65.7\n-28.4 -65.7 3").error).toMatch(/Línea 2/);
    expect(leerCoordenadas("-165.7, -28.4\n-28.4, -65.7\n-28.5, -65.8").error).toMatch(/invertidas/);
    expect(leerCoordenadas("-28.4, -65.7\n-28.5, -65.8").error).toMatch(/tres esquinas/);
  });
});
