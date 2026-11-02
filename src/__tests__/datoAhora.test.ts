import { describe, expect, it, vi } from "vitest";

vi.mock("@/datos/supabase", () => ({ supabase: {} }));

import { etiquetaDato, nombresCapas, type DatoAhora } from "@/datos/datoAhora";

const AHORA = Date.parse("2026-11-02T18:00:00Z");
const base: DatoAhora = {
  site_id: "s",
  device_id: "B01-X",
  device_type: "B01",
  reading_at: "2026-11-02T17:40:00Z",
  air_temp: null,
  humidity: null,
  soil_temp: 21.46,
  e1_hv: 23.6,
  e2_hv: 31.2,
  e3_hv: null,
  e1_depth: 20,
  e2_depth: 40,
  e3_depth: null,
};

describe("etiquetaDato", () => {
  it("muestra la variable elegida", () => {
    expect(etiquetaDato(base, "temp_suelo", "1", AHORA)).toBe("21,5°");
    expect(etiquetaDato(base, "hum_suelo", "2", AHORA)).toBe("31 %");
    const aire = { ...base, device_type: "C01", air_temp: 27.64, humidity: 51.8, soil_temp: null };
    expect(etiquetaDato(aire, "temp_aire", "1", AHORA)).toBe("27,6°");
    expect(etiquetaDato(aire, "hum_aire", "1", AHORA)).toBe("52 %");
  });
  it("nada si el sitio no mide eso, sin calibrar o sin elegir", () => {
    expect(etiquetaDato(base, "temp_aire", "1", AHORA)).toBeNull();
    expect(etiquetaDato(base, "hum_suelo", "3", AHORA)).toBeNull();
    expect(etiquetaDato(base, "ninguno", "1", AHORA)).toBeNull();
    expect(etiquetaDato(undefined, "temp_suelo", "1", AHORA)).toBeNull();
  });
  it("nada si la lectura tiene más de 2 h", () => {
    expect(etiquetaDato({ ...base, reading_at: "2026-11-02T15:59:00Z" }, "temp_suelo", "1", AHORA)).toBeNull();
    expect(etiquetaDato({ ...base, reading_at: "2026-11-02T16:01:00Z" }, "temp_suelo", "1", AHORA)).toBe("21,5°");
  });
});

describe("nombresCapas", () => {
  it("usa la profundidad más común o arriba, medio y abajo", () => {
    const otro = { ...base, e1_depth: 15 };
    expect(nombresCapas([base, base, otro])).toEqual({ "1": "20 cm", "2": "40 cm", "3": "Abajo" });
    expect(nombresCapas([])).toEqual({ "1": "Arriba", "2": "Medio", "3": "Abajo" });
  });
});
