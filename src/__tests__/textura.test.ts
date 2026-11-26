import { describe, expect, it } from "vitest";

import {
  claseDeLista,
  claseUSDA,
  colorCapa,
  colorMunsell,
  composicion,
  fracciones,
} from "@/datos/textura";
import { humedadDeSondas } from "@/datos/sondas";

const f = (arena: number, limo: number, arcilla: number) =>
  claseUSDA({ arena, limo, arcilla });

describe("claseUSDA", () => {
  it("clasifica un punto de cada clase", () => {
    expect(f(92, 5, 3)).toBe("Arenoso");
    expect(f(82, 12, 6)).toBe("Arenoso franco");
    expect(f(65, 25, 10)).toBe("Franco arenoso");
    expect(f(41, 40, 19)).toBe("Franco");
    expect(f(20, 65, 15)).toBe("Franco limoso");
    expect(f(7, 87, 6)).toBe("Limoso");
    expect(f(60, 13, 27)).toBe("Franco arcillo arenoso");
    expect(f(32, 34, 34)).toBe("Franco arcilloso");
    expect(f(10, 56, 34)).toBe("Franco arcillo limoso");
    expect(f(52, 6, 42)).toBe("Arcillo arenoso");
    expect(f(7, 46, 47)).toBe("Arcillo limoso");
    expect(f(20, 20, 60)).toBe("Arcilloso");
  });

  it("respeta los bordes del triángulo", () => {
    expect(f(40, 40, 20)).toBe("Franco");
    expect(f(30, 30, 40)).toBe("Arcilloso");
    expect(f(45, 15, 40)).toBe("Arcilloso");
    expect(f(46, 14, 40)).toBe("Arcillo arenoso");
    expect(f(21, 49, 30)).toBe("Franco arcilloso");
    expect(f(20, 50, 30)).toBe("Franco arcillo limoso");
  });
});

describe("fracciones", () => {
  it("completa la que falta", () => {
    expect(fracciones(40, null, 20)).toEqual({ arena: 40, limo: 40, arcilla: 20 });
  });
  it("normaliza si suman cerca de 100 y rechaza si no", () => {
    expect(fracciones(41, 41, 20)?.arena).toBeCloseTo(40.2, 1);
    expect(fracciones(50, 50, 20)).toBeNull();
    expect(fracciones(40, null, null)).toBeNull();
  });
});

describe("claseDeLista y composicion", () => {
  it("reconoce la clase escrita de otra forma", () => {
    expect(claseDeLista("franco-arcilloso")).toBe("Franco arcilloso");
    expect(claseDeLista("ARENOSO FRANCO")).toBe("Arenoso franco");
    expect(claseDeLista("loam")).toBeNull();
  });
  it("sin porcentajes usa el centro de la clase", () => {
    expect(
      composicion({ sand_pct: null, silt_pct: null, clay_pct: null, texture_class: "Arcilloso" }),
    ).toEqual({ arena: 20, limo: 20, arcilla: 60 });
  });
});

describe("color", () => {
  it("lee el Munsell escrito de varias formas", () => {
    expect(colorMunsell("10YR 4/3")).toMatch(/^#[0-9a-f]{6}$/);
    expect(colorMunsell("7,5yr5/4")).toBe(colorMunsell("7.5YR 5/4"));
    expect(colorMunsell("N 3/")).toMatch(/^#/);
    expect(colorMunsell("marrón")).toBeNull();
  });
  it("sin Munsell da un color genérico, distinto por capa y por textura", () => {
    const vacia = {
      munsell_moist: null,
      munsell_dry: null,
      sand_pct: null,
      silt_pct: null,
      clay_pct: null,
      texture_class: null,
    };
    const a = colorCapa(vacia, 0);
    expect(a.medido).toBe(false);
    expect(colorCapa(vacia, 1).color).not.toBe(a.color);
    expect(colorCapa({ ...vacia, texture_class: "Arenoso" }, 0).color).not.toBe(
      colorCapa({ ...vacia, texture_class: "Arcilloso" }, 0).color,
    );
    expect(colorCapa({ ...vacia, munsell_dry: "10YR 6/3" }, 0).medido).toBe(true);
  });
});

describe("humedadDeSondas", () => {
  const t = "2026-11-26T20:00:00Z";
  const ahora = Date.parse(t) + 3600 * 1000;
  it("usa % vol, si no % grav, y solo si es de las últimas 24 h", () => {
    const h = humedadDeSondas({ t, e1_hv: 24.3, e2_hg: 18, e3_hv: null }, ahora);
    expect(h[1]).toEqual({ valor: 24.3, unidad: "% vol", t });
    expect(h[2]?.unidad).toBe("% grav");
    expect(h[3]).toBeUndefined();
    expect(humedadDeSondas({ t, e1_hv: 24 }, ahora + 48 * 3600 * 1000)).toEqual({});
    expect(humedadDeSondas(null)).toEqual({});
  });
});
