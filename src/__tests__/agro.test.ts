import { describe, expect, it } from "vitest";

import {
  aguaUtilPerfil,
  estadoHidrico,
  fraseSobreCC,
  frioPor,
  horas,
  inicioTemporadaFrio,
  lecturaDpv,
  num,
  referencias,
  resumenClima,
  resumenSuelo,
  tendencia,
  unidadesDisponibles,
  type Dia,
  type Electrodo,
} from "@/datos/agro";

// Calibración de producción de los almendros (franco, densidad 1,4).
const e: Electrodo = {
  index: 1,
  depth: 20,
  texture: "Franco",
  calibrated: true,
  pmp: { mv: 1200, hv: 2, hg: 1.4 },
  cc: { mv: 900, hv: 15, hg: 10.7 },
  sat: { mv: 700, hv: 38, hg: 27.1 },
};

describe("unidades", () => {
  it("prefiere volumétrica, después gravimétrica, siempre mV", () => {
    expect(unidadesDisponibles([{ e1_hv: 12, e1_hg: 8.6, e1_mv: 940 }])).toEqual(["hv", "hg", "mv"]);
    expect(unidadesDisponibles([{ e2_hg: 8 }])).toEqual(["hg", "mv"]);
    expect(unidadesDisponibles([{ e1_mv: 940, e1_hv: null }])).toEqual(["mv"]);
    expect(unidadesDisponibles([])).toEqual(["mv"]);
  });
  it("referencias por unidad", () => {
    expect(referencias(e, "hv")).toEqual({ pmp: 2, cc: 15, sat: 38 });
    expect(referencias(e, "mv")).toEqual({ pmp: 1200, cc: 900, sat: 700 });
    expect(referencias({ ...e, cc: null }, "hv")).toBeNull();
    expect(referencias(undefined, "hv")).toBeNull();
  });
});

describe("estado hídrico", () => {
  it("agua útil 0 % en PMP y 100 % en CC, en % y en mV (escala invertida)", () => {
    const hv = estadoHidrico(13.1, referencias(e, "hv")!)!;
    expect(hv.zona).toBe("disponible");
    expect(Math.round(hv.aguaUtil)).toBe(85);
    const mv = estadoHidrico(944, referencias(e, "mv")!)!;
    expect(mv.zona).toBe("disponible");
    expect(Math.round(mv.aguaUtil)).toBe(85);
  });
  it("zonas", () => {
    const r = referencias(e, "hv")!;
    expect(estadoHidrico(1, r)!.zona).toBe("estres");
    expect(estadoHidrico(20, r)!.zona).toBe("exceso");
    expect(estadoHidrico(40, r)!.zona).toBe("saturado");
    expect(estadoHidrico(1250, referencias(e, "mv")!)!.zona).toBe("estres");
    expect(estadoHidrico(null, r)).toBeNull();
  });
});

describe("tendencia a 6 h", () => {
  it("en mV bajar es mojarse", () => {
    expect(tendencia(930, 945, "mv")?.sentido).toBe("mojando");
    expect(tendencia(945, 930, "mv")?.sentido).toBe("secando");
    expect(tendencia(13.4, 13.0, "hv")?.sentido).toBe("mojando");
    expect(tendencia(13.1, 13.0, "hv")?.sentido).toBe("estable");
    expect(tendencia(13, null, "hv")).toBeNull();
  });
});

const dia = (d: string, x: Partial<Dia>): Dia => ({
  dia: d,
  family: "C01",
  n: 144,
  horas_datos: 24,
  tmin: null,
  tmax: null,
  tmed: null,
  hum_min: null,
  hum_max: null,
  hum_med: null,
  dpv_med: null,
  dpv_max: null,
  rocio_min: null,
  horas_frio: 0,
  horas_frio_0_72: 0,
  horas_helada: 0,
  horas_calor: 0,
  gdd: 0,
  ...x,
});

describe("clima", () => {
  it("temporada de frío desde el 1 de mayo", () => {
    expect(inicioTemporadaFrio("2026-10-04")).toBe("2026-05-01");
    expect(inicioTemporadaFrio("2027-03-10")).toBe("2026-05-01");
    expect(inicioTemporadaFrio("2026-05-01")).toBe("2026-05-01");
  });
  it("resumen del período", () => {
    const r = resumenClima([
      dia("2026-07-01", { tmin: -1, tmax: 15, horas_frio: 10, horas_helada: 2, gdd: 0, dpv_med: 0.5 }),
      dia("2026-07-02", { tmin: 2, tmax: 20, horas_frio: 6, gdd: 1, dpv_med: 0.7 }),
      dia("2026-07-02", { family: "B01", tmin: 8, tmax: 9 }),
    ]);
    expect(r).toMatchObject({ dias: 2, frio: 16, helada: 2, gdd: 1, diasHeladaMeteo: 1, diasHeladaAgro: 2, tmin: -1, tmax: 20 });
    expect(r.dpvMed).toBeCloseTo(0.6);
  });
  it("frío por semana (desde el lunes) y por mes", () => {
    const dias = [
      dia("2026-06-28", { horas_frio: 5 }), // domingo
      dia("2026-06-29", { horas_frio: 3 }), // lunes
      dia("2026-07-01", { horas_frio: 4 }),
    ];
    expect(frioPor(dias, "semana").map((g) => [g.etiqueta, g.horas])).toEqual([
      ["22/06", 5],
      ["29/06", 7],
    ]);
    expect(frioPor(dias, "mes").map((g) => [g.etiqueta, g.horas])).toEqual([
      ["jun", 8],
      ["jul", 4],
    ]);
  });
  it("lectura del DPV", () => {
    expect(lecturaDpv(0.2)?.texto).toMatch(/Muy bajo/);
    expect(lecturaDpv(0.9)?.texto).toMatch(/Adecuado/);
    expect(lecturaDpv(1.5)?.texto).toMatch(/Alto/);
    expect(lecturaDpv(3)?.texto).toMatch(/Muy alto/);
    expect(lecturaDpv(null)).toBeNull();
  });
  it("suelo: reciente de 3 días y amplitud", () => {
    const r = resumenSuelo([
      dia("2026-10-01", { family: "B01", tmed: 18, tmin: 17, tmax: 19 }),
      dia("2026-10-02", { family: "B01", tmed: 19, tmin: 18, tmax: 20 }),
      dia("2026-10-03", { family: "B01", tmed: 20, tmin: 19, tmax: 22 }),
      dia("2026-10-04", { family: "B01", tmed: 21, tmin: 20, tmax: 22 }),
    ]);
    expect(r.reciente).toBe(20);
    expect(r.amplitud).toBeCloseTo(9 / 4);
  });
  it("formatos", () => {
    expect(horas(5.5)).toBe("5 h 30 min");
    expect(horas(0.25)).toBe("15 min");
    expect(horas(0)).toBe("0 h");
    expect(horas(2.999)).toBe("3 h");
    expect(num(13.14)).toBe("13,1");
    expect(num(null)).toBe("—");
  });
});

describe("aguaUtilPerfil (D-84)", () => {
  const r = { pmp: 10, cc: 30, sat: 45 };
  it("acota cada capa a 0–100 % antes de sumar", () => {
    // 4 %, 52 % y una capa saturada: antes daba 88 %, ahora 52 %.
    const capas = [
      { valor: 10.8, refs: r, profundidad: 20 },
      { valor: 20.4, refs: r, profundidad: 40 },
      { valor: 47, refs: r, profundidad: 60 },
    ];
    const res = aguaUtilPerfil(capas);
    expect(res.pct).toBeCloseTo((4 + 52 + 100) / 3, 5);
    expect(res.sobreCC.map((c) => c.profundidad)).toEqual([60]);
  });
  it("una capa bajo PMP aporta 0, no negativo", () => {
    expect(aguaUtilPerfil([{ valor: 5, refs: r }, { valor: 30, refs: r }]).pct).toBeCloseTo(50, 5);
  });
  it("pesa cada capa por su capacidad (CC − PMP)", () => {
    const arenosa = { pmp: 5, cc: 15, sat: 35 }; // capacidad 10
    const franca = { pmp: 10, cc: 40, sat: 50 }; // capacidad 30
    // arenosa llena (100 %), franca vacía (0 %): 10 de 40 = 25 %
    expect(aguaUtilPerfil([{ valor: 15, refs: arenosa }, { valor: 10, refs: franca }]).pct).toBeCloseTo(25, 5);
  });
  it("sirve con escalas que bajan (mV)", () => {
    const mv = { pmp: 1200, cc: 800, sat: 600 };
    expect(aguaUtilPerfil([{ valor: 1000, refs: mv }]).pct).toBeCloseTo(50, 5);
  });
  it("sin capas calibradas no hay número", () => {
    expect(aguaUtilPerfil([{ valor: 20, refs: null }]).pct).toBeNull();
  });
  it("frase de capas sobre CC", () => {
    expect(fraseSobreCC([])).toBeNull();
    expect(fraseSobreCC([{ valor: 40, refs: r, profundidad: 60 }])).toBe("1 capa sobre CC (60 cm)");
    expect(fraseSobreCC([{ valor: 40, refs: r, profundidad: 20 }, { valor: 40, refs: r, profundidad: 60 }])).toBe("2 capas sobre CC (20 y 60 cm)");
    expect(fraseSobreCC([{ valor: 40, refs: r }])).toBe("1 capa sobre CC");
  });
});
