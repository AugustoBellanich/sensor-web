// Copiado de sensor-app/src/__tests__/calibracion.test.ts.
import { describe, expect, it, vi } from "vitest";

import { estadoDeMarcas, fechaHoraArg, leerHora, leerNumero, momentoArg } from "@/datos/calibracion";

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
  it("la marca vieja fuera_de_calibracion cuenta como extrapolado", () => {
    expect(estadoDeMarcas(["e1_fuera_de_calibracion"], 1)).toBe("extrapolado");
  });
});
