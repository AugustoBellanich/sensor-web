import { describe, expect, it } from "vitest";

import { textoSenal } from "@/datos/equipos";
import {
  detalleRecepcion,
  equipoDelDanado,
  mediana,
  nivelRecepcion,
  nivelSenal,
  numerosSenal,
} from "@/datos/senal";

describe("textoSenal (F36)", () => {
  const hace = () => "hace 3 min";
  it("RSSI entero, SNR con coma, antigüedad y receptor", () => {
    expect(textoSenal({ rssi: -97, snr: 7.25, momento: "x", receptor: "N01-24F8C2", mediana: null }, hace)).toBe(
      "-97 dBm · SNR 7,3 dB · hace 3 min · N01-24F8C2",
    );
  });
  it("SNR negativo", () => {
    expect(textoSenal({ rssi: -121, snr: -12.5, momento: "x", receptor: null, mediana: null }, hace)).toBe("-121 dBm · SNR -12,5 dB · hace 3 min");
  });
  it("sin SNR", () => {
    expect(textoSenal({ rssi: -80.4, snr: null, momento: "x", receptor: null, mediana: null }, hace)).toBe("-80 dBm · hace 3 min");
  });
});

describe("nivelSenal: por el margen sobre -15 dB de SNR", () => {
  it.each([
    [8, "buena"],
    [5, "buena"],
    [3.9, "aceptable"],
    [0, "aceptable"],
    [-2.25, "debil"],
    [-10, "debil"],
    [-11.8, "limite"],
  ])("SNR %s dB → %s", (snr, nivel) => {
    expect(nivelSenal({ rssi: -106, snr })).toBe(nivel);
  });
  it("sin SNR usa el RSSI", () => {
    expect(nivelSenal({ rssi: -95, snr: null })).toBe("buena");
    expect(nivelSenal({ rssi: -106, snr: null })).toBe("aceptable");
    expect(nivelSenal({ rssi: -115, snr: null })).toBe("debil");
    expect(nivelSenal({ rssi: -125, snr: null })).toBe("limite");
  });
  it("sin datos, null", () => {
    expect(nivelSenal({ rssi: null, snr: null })).toBeNull();
  });
});

describe("mediana", () => {
  it("impar, par y con nulos", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([null, 5, undefined, 1])).toBe(3);
    expect(mediana([])).toBeNull();
  });
});

describe("numerosSenal", () => {
  it("con y sin SNR", () => {
    expect(numerosSenal({ rssi: -106.4, snr: 3.9 })).toBe("-106 dBm · SNR 3,9 dB");
    expect(numerosSenal({ rssi: -106, snr: null })).toBe("-106 dBm");
  });
});

describe("recepción del N01 (F39)", () => {
  it("niveles por porcentaje de paquetes malos", () => {
    expect(nivelRecepcion({ ok: 990, crc: 5, danados: 5 })).toEqual({ malos: 1, nivel: "normal" });
    expect(nivelRecepcion({ ok: 95, crc: 2, danados: 3 })?.nivel).toBe("algunos");
    expect(nivelRecepcion({ ok: 80, crc: 5, danados: 15 })?.nivel).toBe("muchos");
    expect(nivelRecepcion({ ok: 0, crc: 0, danados: 0 })).toBeNull();
  });
  it("detalle con miles", () => {
    expect(detalleRecepcion({ ok: 1234, crc: 3, danados: 2 })).toBe("1.234 bien · 3 con error de radio · 2 dañados");
  });
  it("equipo del último dañado", () => {
    expect(equipoDelDanado("RSSI -107 SNR 2.50 | C01-336F22,2026-11-21 03:12:44,V=4.17(97%),T=24.34.17(97%)")).toBe("C01-336F22");
    expect(equipoDelDanado("basura sin coma")).toBeNull();
    expect(equipoDelDanado(null)).toBeNull();
  });
});
