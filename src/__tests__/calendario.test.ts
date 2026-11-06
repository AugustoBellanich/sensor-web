import { describe, expect, it } from "vitest";

import { lugarEnRango, semanasDelMes, tocarDia } from "@/datos/calendario";

describe("calendario", () => {
  it("octubre de 2026 empieza un jueves", () => {
    expect(semanasDelMes({ anio: 2026, mes: 10 })[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });
});

describe("rango de días con dos toques", () => {
  it("el primer toque marca el inicio y el segundo el fin", () => {
    let s = tocarDia({ inicio: null, fin: null }, "2026-10-12");
    expect(s).toEqual({ inicio: "2026-10-12", fin: null });
    s = tocarDia(s, "2026-10-18");
    expect(s).toEqual({ inicio: "2026-10-12", fin: "2026-10-18" });
    expect(lugarEnRango(s, "2026-10-12")).toBe("borde");
    expect(lugarEnRango(s, "2026-10-15")).toBe("medio");
    expect(lugarEnRango(s, "2026-10-19")).toBeNull();
  });
  it("un día anterior al inicio pasa a ser el inicio", () => {
    expect(tocarDia({ inicio: "2026-10-12", fin: null }, "2026-10-05")).toEqual({ inicio: "2026-10-05", fin: "2026-10-12" });
  });
  it("el mismo día dos veces es un día solo", () => {
    expect(tocarDia({ inicio: "2026-10-12", fin: null }, "2026-10-12")).toEqual({ inicio: "2026-10-12", fin: "2026-10-12" });
  });
  it("con el rango completo, un toque empieza otro", () => {
    expect(tocarDia({ inicio: "2026-10-12", fin: "2026-10-18" }, "2026-11-01")).toEqual({ inicio: "2026-11-01", fin: null });
  });
});
