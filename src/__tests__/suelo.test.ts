import { describe, expect, it } from "vitest";

import { aFormulario, capaVacia, renglonConDatos, RENGLONES, revisarCapas, textoCapa, type Capa } from "@/datos/suelo";

const capa = (o: Partial<ReturnType<typeof capaVacia>>) => ({ ...capaVacia(), ...o });

describe("revisarCapas (D-106)", () => {
  it("arma las capas ordenadas por profundidad, con números y textos", () => {
    const r = revisarCapas([
      capa({ top_cm: "35", bottom_cm: "100", bulk_density: "1,55" }),
      capa({ top_cm: "0", bottom_cm: "35", sand_pct: "40", ph: "7,8", ph_method: " Agua 1:2,5 ", texture_class: "Franco" }),
    ]);
    expect(r.errores).toEqual([null, null]);
    expect(r.listas).toEqual([
      { top_cm: 0, bottom_cm: 35, sand_pct: 40, ph: 7.8, ph_method: "Agua 1:2,5", texture_class: "Franco" },
      { top_cm: 35, bottom_cm: 100, bulk_density: 1.55 },
    ]);
  });
  it("profundidades faltantes o al revés", () => {
    expect(revisarCapas([capa({ top_cm: "0" })]).errores[0]).toMatch(/Falta/);
    expect(revisarCapas([capa({ top_cm: "40", bottom_cm: "20" })]).errores[0]).toMatch(/mayor/);
    expect(revisarCapas([capa({ top_cm: "0", bottom_cm: "400" })]).errores[0]).toMatch(/300/);
  });
  it("valores que no son números o fuera de rango", () => {
    expect(revisarCapas([capa({ top_cm: "0", bottom_cm: "20", ph: "siete" })]).errores[0]).toMatch(/pH: no es un número/);
    expect(revisarCapas([capa({ top_cm: "0", bottom_cm: "20", ph: "19" })]).errores[0]).toMatch(/pH: tiene que estar/);
    expect(revisarCapas([capa({ top_cm: "0", bottom_cm: "20", sand_pct: "60", silt_pct: "30", clay_pct: "20" })]).errores[0]).toMatch(/100 %/);
  });
  it("capas superpuestas: marca la de abajo", () => {
    const r = revisarCapas([capa({ top_cm: "0", bottom_cm: "40" }), capa({ top_cm: "30", bottom_cm: "60" })]);
    expect(r.errores).toEqual([null, "Se superpone con la capa de arriba."]);
  });
  it("de la base al formulario, con coma decimal", () => {
    const c = { top_cm: 0, bottom_cm: 35, bulk_density: 1.4, ph_method: "Agua 1:2,5", sand_pct: null } as unknown as Capa;
    const f = aFormulario(c);
    expect(f.top_cm).toBe("0");
    expect(f.bulk_density).toBe("1,4");
    expect(f.ph_method).toBe("Agua 1:2,5");
    expect(f.sand_pct).toBeUndefined();
  });
  it("textos y renglones con datos", () => {
    expect(textoCapa({ top_cm: 0, bottom_cm: 35 })).toBe("0–35 cm");
    const ph = RENGLONES.find((r) => r.titulo === "pH")!;
    expect(renglonConDatos(ph, [{ ph: null } as unknown as Capa])).toBe(false);
    expect(renglonConDatos(ph, [{ ph: 7 } as unknown as Capa])).toBe(true);
  });
});
