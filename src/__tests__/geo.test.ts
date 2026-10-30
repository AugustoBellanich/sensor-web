// Copiado de sensor-app/src/__tests__/geo.test.ts (sin las pruebas de fechas).
import { describe, expect, it } from "vitest";

import {
  aGeoJson,
  agruparCercanos,
  anchoEnPantalla,
  areaHa,
  dentro,
  desdeGeoJson,
  seCruza,
  textoHa,
} from "@/datos/geo";

// ~1 ha cerca de Catamarca (mismo cuadrado que las pruebas de la base: ~0,977 ha)
const cuadrado = [
  { latitude: -28.47, longitude: -65.78 },
  { latitude: -28.47, longitude: -65.779 },
  { latitude: -28.4691, longitude: -65.779 },
  { latitude: -28.4691, longitude: -65.78 },
];

describe("geo", () => {
  it("superficie", () => {
    expect(areaHa(cuadrado)).toBeGreaterThan(0.96);
    expect(areaHa(cuadrado)).toBeLessThan(0.99);
    expect(areaHa(cuadrado.slice(0, 2))).toBe(0);
  });
  it("GeoJSON ida y vuelta, cerrado", () => {
    const g = aGeoJson(cuadrado);
    expect(g.coordinates[0]).toHaveLength(5);
    expect(g.coordinates[0][0]).toEqual(g.coordinates[0][4]);
    expect(g.coordinates[0][0]).toEqual([-65.78, -28.47]);
    expect(desdeGeoJson(g)).toEqual(cuadrado);
  });
  it("punto dentro o fuera", () => {
    expect(dentro({ latitude: -28.4695, longitude: -65.7795 }, cuadrado)).toBe(
      true,
    );
    expect(dentro({ latitude: -28.46, longitude: -65.7795 }, cuadrado)).toBe(
      false,
    );
  });
  it("detecta bordes cruzados (moño)", () => {
    expect(seCruza(cuadrado)).toBe(false);
    expect(seCruza([cuadrado[0], cuadrado[2], cuadrado[1], cuadrado[3]])).toBe(
      true,
    );
  });
  it("texto de superficie", () => {
    expect(textoHa(0.977)).toMatch(/0,98 ha/);
    expect(textoHa(null)).toBe("—");
  });
});

describe("agrupar en pantalla", () => {
  const items = [
    { id: "a", punto: { latitude: -28.47, longitude: -65.78 } },
    { id: "b", punto: { latitude: -28.4701, longitude: -65.7801 } }, // ~10 m de a
    { id: "c", punto: { latitude: -28.46, longitude: -65.77 } }, // ~1,4 km
  ];
  it("lejos: los cercanos se juntan", () => {
    const vista = {
      latitude: -28.47,
      longitude: -65.78,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    const g = agruparCercanos(items, vista, 400, 400);
    expect(g).toHaveLength(2);
    expect(g[0].items.map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("cerca: cada uno en su lugar", () => {
    const vista = {
      latitude: -28.47,
      longitude: -65.78,
      latitudeDelta: 0.0005,
      longitudeDelta: 0.0005,
    };
    expect(agruparCercanos(items, vista, 400, 400)).toHaveLength(3);
  });
  it("ancho en pantalla", () => {
    const vista = {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    const lote = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0.001 },
      { latitude: 0.001, longitude: 0 },
    ];
    expect(anchoEnPantalla(lote, vista, 400)).toBeCloseTo(40);
  });
});
