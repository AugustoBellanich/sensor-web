// Copiado de sensor-app/src/__tests__/archivo.test.ts (jest → vitest).
import { describe, expect, it, vi } from "vitest";

import { resumenLote, resumenSitio, type ContenidoSitio } from "@/datos/archivo";

// Solo se prueban las funciones puras: el cliente de la base no hace falta (vi.mock se eleva).
vi.mock("@/datos/supabase", () => ({ supabase: {} }));

const vacio: ContenidoSitio = {
  readings: 0,
  first_at: null,
  last_at: null,
  calibration_points: 0,
  soil_records: 0,
  assignments: 0,
  device: null,
  has_data: false,
};

describe("resumenSitio", () => {
  it("vacío: nada para mostrar", () => {
    expect(resumenSitio(vacio)).toEqual([]);
  });
  it("con datos: lecturas desde el día en Argentina, calibración, suelo y equipo", () => {
    expect(
      resumenSitio({
        ...vacio,
        readings: 1234,
        first_at: "2026-09-22T01:30:00+00:00", // 21/09 22:30 en Argentina
        calibration_points: 3,
        soil_records: 1,
        assignments: 2,
        device: "B01-24D586",
        has_data: true,
      }),
    ).toEqual(["1.234 lecturas desde el 21/09/2026", "3 puntos de calibración", "1 dato de suelo", "B01-24D586 instalado (queda libre)"]);
  });
  it("sin equipo instalado pero con historial", () => {
    expect(resumenSitio({ ...vacio, assignments: 1, has_data: true })).toEqual(["1 equipo en su historial"]);
  });
});

describe("resumenLote", () => {
  it("sitios, lecturas, actividades y perímetros", () => {
    expect(resumenLote({ sites: 2, archived_sites: 0, activities: 1, shapes: 3, readings: 10, has_data: true })).toEqual([
      "2 sitios (se archivan con el lote)",
      "10 lecturas",
      "1 actividad",
      "3 perímetros en el historial",
    ]);
  });
  it("un solo perímetro no cuenta como historial", () => {
    expect(resumenLote({ sites: 0, archived_sites: 0, activities: 0, shapes: 1, readings: 0, has_data: false })).toEqual([]);
  });
});
