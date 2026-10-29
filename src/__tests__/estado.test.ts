import { describe, expect, it } from "vitest";

import { mensajeBase } from "@/datos/errores";
import { hace, idValido, modeloDeId, normalizarId, semaforo, esReciente, haceCorto } from "@/datos/estado";

const ahora = new Date("2026-10-04T12:00:00Z");
const antes = (min: number) => new Date(ahora.getTime() - min * 60000).toISOString();

describe("semaforo", () => {
  it("módulos: atrasado después de 6 h", () => {
    expect(semaforo(antes(30), "B01", ahora)).toBe("al-dia");
    expect(semaforo(antes(7 * 60), "C01", ahora)).toBe("atrasado");
  });
  it("gateway: atrasado después de 3 h sin latido", () => {
    expect(semaforo(antes(20), "N01", ahora)).toBe("al-dia");
    expect(semaforo(antes(40), "N01", ahora)).toBe("atrasado");
  });
  it("sin datos", () => {
    expect(semaforo(null, "B01", ahora)).toBe("sin-datos");
    expect(semaforo("cualquier cosa", "B01", ahora)).toBe("sin-datos");
  });
});

describe("hace", () => {
  it("textos cortos", () => {
    expect(hace(antes(0), ahora)).toBe("recién");
    expect(hace(antes(5), ahora)).toBe("hace 5 min");
    expect(hace(antes(180), ahora)).toBe("hace 3 h");
    expect(hace(antes(3 * 24 * 60), ahora)).toBe("hace 3 días");
    expect(hace(null, ahora)).toBe("nunca");
  });
});

describe("ids", () => {
  it("normaliza y valida", () => {
    expect(normalizarId(" b01-a1b2c3 ")).toBe("B01-A1B2C3");
    expect(idValido("b01-a1b2c3")).toBe(true);
    expect(idValido("B01-SIMULA")).toBe(true);
    expect(idValido("B01-12")).toBe(false);
    expect(idValido("SEN-B01-A1B2C3")).toBe(false);
    expect(modeloDeId("n01-24d2a6")).toBe("N01");
  });
});

describe("mensajeBase", () => {
  it("traduce los códigos de la base", () => {
    expect(mensajeBase("invalid_claim_code")).toMatch(/código no es correcto/);
    expect(mensajeBase("ERROR: admin_required")).toMatch(/administrador/);
    expect(mensajeBase("TypeError: Network request failed")).toMatch(/conexión/);
    expect(mensajeBase(null)).toMatch(/inesperado/);
  });
});

describe("haceCorto", () => {
  const ahora = new Date("2026-10-29T12:00:00Z");
  const antes = (min: number) => new Date(ahora.getTime() - min * 60000).toISOString();
  it("corto, con mínimo de 1 h", () => {
    expect(haceCorto(antes(10), ahora)).toBe("< 1 h");
    expect(haceCorto(antes(185), ahora)).toBe("3 h");
    expect(haceCorto(antes(25 * 24 * 60), ahora)).toBe("25 d");
    expect(haceCorto(antes(45 * 24 * 60), ahora)).toBe("1 m");
    expect(haceCorto(antes(400 * 24 * 60), ahora)).toBe("1 a");
    expect(haceCorto(null, ahora)).toBeNull();
  });
  it("reciente: menos de una hora", () => {
    expect(esReciente(antes(59), ahora)).toBe(true);
    expect(esReciente(antes(61), ahora)).toBe(false);
  });
});
