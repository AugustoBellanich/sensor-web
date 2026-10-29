import { describe, expect, it } from "vitest";

import { cortes, ESCALA_BATERIA, ESCALA_CAJA, ESCALA_DPV, ESCALA_WIFI, escalaSuelo, fraseSuelo, ubicar } from "@/datos/medidor";

describe("medidor por zonas", () => {
  it("DPV: zona, posición y cuánto se pasa", () => {
    const u = ubicar(1.45, ESCALA_DPV);
    expect(u.zona.nombre).toBe("Alto");
    expect(u.posicion).toBeCloseTo(1.45 / 3);
    expect(u.frase).toBe("0,25 kPa sobre Adecuado");
    expect(ubicar(0.3, ESCALA_DPV).frase).toBe("0,10 kPa por debajo de Adecuado");
  });

  it("dentro de lo bueno solo avisa cerca del borde", () => {
    expect(ubicar(0.8, ESCALA_DPV).frase).toBe("");
    expect(ubicar(1.1, ESCALA_DPV).frase).toBe("a 0,10 kPa de Alto");
    expect(ubicar(27, ESCALA_BATERIA).frase).toBe("a 2 % de Baja");
    expect(ubicar(80, ESCALA_BATERIA).frase).toBe("");
  });

  it("fuera de la escala: marca en el borde", () => {
    const u = ubicar(4.5, ESCALA_DPV);
    expect(u.fuera).toBe("arriba");
    expect(u.posicion).toBe(1);
    expect(u.zona.nombre).toBe("Muy alto");
    expect(ubicar(-120, ESCALA_WIFI).fuera).toBe("abajo");
  });

  it("batería y carcasa", () => {
    expect(ubicar(8, ESCALA_BATERIA).frase).toBe("17 % por debajo de Bien");
    expect(ubicar(47, ESCALA_CAJA).zona.nombre).toBe("Daña la batería");
    expect(ubicar(-82, ESCALA_WIFI).zona.nombre).toBe("Muy débil");
  });

  it("suelo con PMP, CC y SAT: zonas y cortes con nombre", () => {
    const e = escalaSuelo({ pmp: 12, cc: 28, sat: 40 });
    expect(ubicar(21.4, e).zona.nombre).toBe("Agua útil");
    expect(ubicar(10, e).zona.nombre).toBe("Estrés");
    expect(ubicar(10, e).frase).toBe("2,0 % por debajo de Agua útil");
    expect(ubicar(33, e).zona.nombre).toBe("Sobre CC");
    expect(cortes(e).map((c) => c.texto)).toEqual(["PMP", "CC", "SAT"]);
  });

  it("suelo: CC al 80 % del dibujo y SAT en el borde", () => {
    const e = escalaSuelo({ pmp: 12, cc: 28, sat: 40 });
    const c = cortes(e);
    expect(c.map((x) => x.posicion)).toEqual([0.08, 0.8, 1]);
    expect(ubicar(28, e).posicion).toBeCloseTo(0.8);
    expect(ubicar(20, e).posicion).toBeCloseTo(0.08 + 0.5 * 0.72);
    expect(ubicar(40, e).posicion).toBeCloseTo(1);
  });

  it("suelo: si pasa SAT, la escala se estira y SAT deja el borde", () => {
    const e = escalaSuelo({ pmp: 12, cc: 28, sat: 40 }, 44);
    expect(e.zonas.map((z) => z.nombre)).toEqual(["Estrés", "Agua útil", "Sobre CC", "Saturado"]);
    expect(cortes(e).map((x) => x.texto)).toEqual(["PMP", "CC", "SAT"]);
    expect(ubicar(44, e).zona.nombre).toBe("Saturado");
    expect(ubicar(44, e).posicion).toBeLessThan(1);
    expect(ubicar(40, e).posicion).toBeCloseTo(0.86);
  });

  it("suelo: una frase por estado", () => {
    const r = { pmp: 12, cc: 28, sat: 40 };
    expect(fraseSuelo(26.4, r)).toBe("Agua útil al 90 %");
    expect(fraseSuelo(29.1, r)).toBe("Sobre capacidad de campo (+1,1 %)");
    expect(fraseSuelo(10, r)).toBe("Estrés hídrico (2,0 % debajo de PMP)");
    expect(fraseSuelo(43, r)).toBe("Saturado (+3,0 % sobre SAT)");
  });

  it("cortes sin nombre: el número", () => {
    expect(cortes(ESCALA_DPV).map((c) => c.texto)).toEqual(["0,4", "1,2", "2"]);
  });
});
