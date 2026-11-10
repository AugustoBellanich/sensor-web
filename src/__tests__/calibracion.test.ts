// Copiado de sensor-app/src/__tests__/calibracion.test.ts.
import { describe, expect, it, vi } from "vitest";

import {
  clavePunto,
  estadoDeMarcas,
  fechaHoraArg,
  idDePedido,
  leerHora,
  leerNumero,
  momentoArg,
  textoAjusteDensidad,
  type DatosPunto,
} from "@/datos/calibracion";

// Solo se prueban las funciones puras: el cliente de la base no hace falta (vi.mock se eleva).
vi.mock("@/datos/supabase", () => ({ supabase: {}, URL_BASE: "https://x.supabase.co" }));

describe("leerHora", () => {
  it("acepta HH:MM y H:MM, normaliza", () => {
    expect(leerHora("09:30")).toBe("09:30");
    expect(leerHora("7:05")).toBe("07:05");
    expect(leerHora(" 23.59 ")).toBe("23:59");
  });
  it("rechaza horas inválidas", () => {
    expect(leerHora("24:00")).toBeNull();
    expect(leerHora("12:60")).toBeNull();
    expect(leerHora("7:5")).toBeNull();
    expect(leerHora("")).toBeNull();
  });
});

describe("momentoArg", () => {
  it("arma el instante en hora argentina", () => {
    const m = momentoArg("2026-10-05", "09:30");
    expect(m).toBe("2026-10-05T09:30:00-03:00");
    expect(new Date(m).toISOString()).toBe("2026-10-05T12:30:00.000Z");
  });
});

describe("fechaHoraArg", () => {
  it("muestra en hora argentina", () => {
    expect(fechaHoraArg("2026-09-12T12:30:00Z")).toBe("12/09/2026 09:30");
    expect(fechaHoraArg("2026-01-01T01:15:00Z")).toBe("31/12/2025 22:15");
  });
});

describe("leerNumero", () => {
  it("coma o punto", () => {
    expect(leerNumero("18,4")).toBe(18.4);
    expect(leerNumero("1.35")).toBe(1.35);
  });
  it("vacío o inválido", () => {
    expect(leerNumero("  ")).toBeNull();
    expect(leerNumero("abc")).toBeNull();
  });
});

describe("estadoDeMarcas", () => {
  it("toma la marca del electrodo pedido", () => {
    const f = ["e1_provisional", "e2_extrapolado", "e3_fuera_de_rango"];
    expect(estadoDeMarcas(f, 1)).toBe("provisional");
    expect(estadoDeMarcas(f, 2)).toBe("extrapolado");
    expect(estadoDeMarcas(f, 3)).toBe("fuera_de_rango");
  });
  it("sin marca o sin lista", () => {
    expect(estadoDeMarcas(["e2_sin_calibracion"], 1)).toBeNull();
    expect(estadoDeMarcas(["e2_sin_calibracion"], 2)).toBe("sin_calibracion");
    expect(estadoDeMarcas(null, 1)).toBeNull();
  });
  it("extrapolado lejos se distingue del extrapolado cerca (D-104)", () => {
    expect(estadoDeMarcas(["e1_extrapolado_lejos"], 1)).toBe("extrapolado_lejos");
    expect(estadoDeMarcas(["e1_extrapolado"], 1)).toBe("extrapolado");
  });
  it("la marca vieja fuera_de_calibracion cuenta como extrapolado", () => {
    expect(estadoDeMarcas(["e1_fuera_de_calibracion"], 1)).toBe("extrapolado");
  });
});

describe("textoAjusteDensidad (D-105)", () => {
  const base = { pmp: 12, cc: 27.6, sat: 47.2, sat_origen: "densidad" as const, om_supuesta: false };
  it("sin densidad no dice nada", () => {
    expect(textoAjusteDensidad({ ...base, df: null })).toBeNull();
  });
  it("explica el ajuste", () => {
    const t = textoAjusteDensidad({ ...base, densidad: 1.4, densidad_normal: 1.43, df: 0.98, cc_normal: 27.8 });
    expect(t).toBe("CC ajustada por densidad: 1,40 g/cm³, normal para esa textura 1,43 (factor 0,98); sin ajuste sería 27,8 %.");
  });
  it("avisa si el factor quedó acotado", () => {
    expect(textoAjusteDensidad({ ...base, densidad: 2, densidad_normal: 1.43, df: 1.3, cc_normal: 27.8 })).toContain("acotado");
  });
});

describe("pedido de un punto (D-109)", () => {
  const base: DatosPunto = { sitio: "s", electrodo: 1, momento: "2026-11-10T10:00:00-03:00", humedad: 15, tipo: "hv", mv: { valor: 986, origen: "manual" } };
  it("la clave cambia con lo que define el punto, no con el método o las notas", () => {
    expect(clavePunto(base)).toBe(clavePunto({ ...base }));
    expect(clavePunto(base)).not.toBe(clavePunto({ ...base, humedad: 16 }));
    expect(clavePunto(base)).not.toBe(clavePunto({ ...base, mv: { valor: 987, origen: "manual" } }));
    expect(clavePunto(base)).not.toBe(clavePunto({ ...base, mv: undefined }));
  });
  it("el identificador se mantiene mientras la clave no cambie", () => {
    const a = idDePedido(null, "x");
    expect(idDePedido(a, "x")).toBe(a);
    const b = idDePedido(a, "y");
    expect(b.id).not.toBe(a.id);
    expect(b.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
