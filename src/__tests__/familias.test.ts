import { describe, expect, it } from "vitest";

import { agruparPorCampo, aliasPropio, familiaDeModelo, tituloEquipo } from "@/datos/familias";

describe("familias", () => {
  it("modelo → qué mide", () => {
    expect(familiaDeModelo("B01")).toBe("suelo");
    expect(familiaDeModelo("c01")).toBe("clima");
    expect(familiaDeModelo("N01")).toBe("gateway");
    expect(familiaDeModelo("Z99")).toBe("otro");
  });
  it("título: nombre, si no sitio, si no qué mide", () => {
    expect(tituloEquipo({ id: "B01-1", type: "B01", alias: "Nogal 3", site_name: "Fila 12" })).toBe("Nogal 3");
    expect(tituloEquipo({ id: "B01-1", type: "B01", alias: "B01-1", site_name: "Fila 12" })).toBe("Fila 12");
    expect(tituloEquipo({ id: "B01-1", type: "B01", alias: null, site_name: null })).toBe("Humedad de suelo sin ubicar");
    expect(aliasPropio(" ", "x")).toBeNull();
  });
  it("agrupa por campo, con 'sin ubicar' al final", () => {
    const g = agruparPorCampo([
      { establishment_id: null, establishment_name: null, site_name: null },
      { establishment_id: "b", establishment_name: "Finca B", site_name: "S" },
      { establishment_id: "a", establishment_name: "Finca A", site_name: "S" },
      { establishment_id: null, establishment_name: null, site_name: "S1" },
      { establishment_id: "a", establishment_name: "Finca A", site_name: "S2" },
    ]);
    expect(g.map((x) => x.titulo)).toEqual(["Finca A", "Finca B", "En campos de otras personas", "Sin ubicar"]);
    expect(g[0].equipos).toHaveLength(2);
  });
  it("con provincia adelante cuando hay varias", () => {
    const g = agruparPorCampo(
      [
        { establishment_id: "a", establishment_name: "Finca A", site_name: "S", province: "Tucumán" },
        { establishment_id: "b", establishment_name: "Finca B", site_name: "S", province: "Catamarca" },
      ],
      true,
    );
    expect(g.map((x) => x.titulo)).toEqual(["Catamarca › Finca B", "Tucumán › Finca A"]);
  });
});
