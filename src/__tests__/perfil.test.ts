import { describe, expect, it } from "vitest";

import { aguaPerfil, ahoraSitio, capasSuelo, unidadDelSitio } from "@/datos/perfil";
import type { InfoSitio } from "@/datos/series";

const punto = (hv: number) => ({ hv, hg: null, mv: null });
const electrodo = (index: number, conCalibracion: boolean) => ({
  index,
  depth: index * 20,
  texture: "Franco",
  calibrated: conCalibracion,
  pmp: conCalibracion ? punto(10) : null,
  cc: conCalibracion ? punto(30) : null,
  sat: conCalibracion ? punto(45) : null,
  density: null,
  since: "2026-01-01T00:00:00Z",
});

function sitio(parcial: Partial<InfoSitio>): InfoSitio {
  return {
    id: "s1",
    name: "Lote 1",
    lat: null,
    lng: null,
    establishment_id: null,
    establishment_name: null,
    plot_name: null,
    device: null,
    electrodes: [],
    b01: null,
    c01: null,
    last_b01: null,
    prev_b01: null,
    last_c01: null,
    prev_c01: null,
    ...parcial,
  } as InfoSitio;
}

describe("perfil", () => {
  it("sin lectura de suelo no hay capas", () => {
    expect(capasSuelo(sitio({}))).toEqual([]);
  });

  it("elige humedad volumétrica cuando hay, y mV si no", () => {
    expect(unidadDelSitio(sitio({ last_b01: { t: "x", soil_temp: 20, e1_hv: 20, e1_mv: 900 } }))).toBe("hv");
    expect(unidadDelSitio(sitio({ last_b01: { t: "x", soil_temp: 20, e1_mv: 900 } }))).toBe("mv");
  });

  it("agua útil del perfil promedia solo las capas calibradas", () => {
    const info = sitio({
      electrodes: [electrodo(1, true), electrodo(2, true), electrodo(3, false)],
      last_b01: { t: "2026-10-01T12:00:00Z", soil_temp: 18, e1_hv: 20, e2_hv: 30, e3_hv: 25 },
    });
    const capas = capasSuelo(info);
    expect(capas.map((c) => c.profundidad)).toEqual([20, 40, 60]);
    expect(capas[0].aguaUtil).toBeCloseTo(50);
    expect(capas[1].aguaUtil).toBeCloseTo(100);
    expect(capas[2].aguaUtil).toBeNull();
    expect(aguaPerfil(capas)).toBeCloseTo(75);
  });

  it("en mV no calcula agua útil", () => {
    const info = sitio({ electrodes: [electrodo(1, true)], last_b01: { t: "x", soil_temp: 18, e1_mv: 900 } });
    const capas = capasSuelo(info);
    expect(capas[0].refs).toBeNull();
    expect(aguaPerfil(capas)).toBeNull();
  });

  it("ahoraSitio usa el aire si no hay suelo", () => {
    const info = sitio({ last_c01: { t: "2026-10-01T12:00:00Z", air_temp: 24.5, humidity: 40 } as InfoSitio["last_c01"] });
    expect(ahoraSitio(info)).toEqual({ agua: null, temp: 24.5, humedad: 40, t: "2026-10-01T12:00:00Z" });
  });
});
