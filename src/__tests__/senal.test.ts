import { describe, expect, it } from "vitest";

import { textoSenal } from "@/datos/equipos";

describe("textoSenal (F36)", () => {
  const hace = () => "hace 3 min";
  it("RSSI entero, SNR con coma, antigüedad y receptor", () => {
    expect(textoSenal({ rssi: -97, snr: 7.25, momento: "x", receptor: "N01-24F8C2" }, hace)).toBe(
      "-97 dBm · SNR 7,3 dB · hace 3 min · N01-24F8C2",
    );
  });
  it("SNR negativo", () => {
    expect(textoSenal({ rssi: -121, snr: -12.5, momento: "x", receptor: null }, hace)).toBe("-121 dBm · SNR -12,5 dB · hace 3 min");
  });
  it("sin SNR", () => {
    expect(textoSenal({ rssi: -80.4, snr: null, momento: "x", receptor: null }, hace)).toBe("-80 dBm · hace 3 min");
  });
});
