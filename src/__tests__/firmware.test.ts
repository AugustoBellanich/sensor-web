// Revisión del .bin y huella, como en la app (sensor-app src/__tests__/ota.test.ts).
import { describe, expect, it, vi } from "vitest";

vi.mock("@/datos/supabase", () => ({ supabase: {} }));

import { MAXIMO_BYTES, revisarBinario, sha256Hex } from "@/datos/firmware";

function imagen(version: string | null, tamano = 4096, primerByte = 0xe9): Uint8Array {
  const b = new Uint8Array(tamano);
  b[0] = primerByte;
  if (version) b.set(new TextEncoder().encode(`\0${version}\0`), 2000);
  return b;
}

describe("revisar el .bin", () => {
  it("encuentra modelo y versión", () => {
    expect(revisarBinario(imagen("C01-FW-1.6.1-dev"))).toEqual({
      valido: true,
      problema: null,
      modelo: "C01",
      version: "C01-FW-1.6.1-dev",
    });
    expect(revisarBinario(imagen("B01-FW-1.4.0")).version).toBe("B01-FW-1.4.0");
  });
  it("rechaza lo que no es del ESP32, sin versión o demasiado grande", () => {
    expect(revisarBinario(imagen("C01-FW-1.6.1", 4096, 0x50)).problema).toMatch(/ESP32/);
    expect(revisarBinario(imagen(null)).problema).toMatch(/versión/);
    expect(revisarBinario(imagen("C01-FW-1.6.1", MAXIMO_BYTES + 1)).problema).toMatch(/más grande/);
  });
  it("el espacio depende del modelo: el N01 tiene particiones más grandes (D-94)", () => {
    expect(revisarBinario(imagen("N01-FW-1.6.2-dev", 1433111)).valido).toBe(true);
    expect(revisarBinario(imagen("B01-FW-1.4.2-dev", 1433111)).problema).toMatch(/espacio del B01/);
    expect(revisarBinario(imagen("N01-FW-1.6.2-dev", 1703937)).problema).toMatch(/más grande/);
  });
});

describe("huella", () => {
  it("SHA-256 en hex", async () => {
    // SHA-256("abc")
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
