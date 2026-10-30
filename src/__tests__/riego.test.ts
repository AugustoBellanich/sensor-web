// Copiado de sensor-app/src/__tests__/riego.test.ts, sin la cola sin señal (la web no la tiene).
import { describe, expect, it, vi } from "vitest";

vi.mock("@/datos/supabase", () => ({ supabase: {}, URL_BASE: "https://x.supabase.co" }));

import {
  armarEvento,
  avisoTasa,
  explicada,
  formasPara,
  leerDuracion,
  tasaMmH,
  textoDuracion,
  totalMm,
  type FormularioEvento,
  type SistemaRiego,
} from "@/datos/riego";


const sistema = (s: Partial<SistemaRiego>): SistemaRiego => ({
  method: "goteo",
  water_source: null,
  emitter_flow_lph: null,
  emitter_spacing_m: null,
  laterals_per_row: null,
  emitters_per_plant: null,
  application_rate_mmh: null,
  delivery_flow_lps: null,
  irrigated_area_ha: null,
  application_efficiency: null,
  has_flowmeter: false,
  notes: null,
  ...s,
});

// Los mismos casos que prueba_985_riego.sql de sensor-db: la vista previa tiene que dar lo mismo.
describe("tasaMmH", () => {
  it("goteo: 2 L/h cada 0,5 m, 2 mangueras, hileras a 4 m = 2 mm/h", () => {
    expect(tasaMmH(sistema({ emitter_flow_lph: 2, emitter_spacing_m: 0.5, laterals_per_row: 2 }), 4, 2, null)).toBeCloseTo(2);
  });
  it("goteo sin mangueras cargadas: una por hilera", () => {
    expect(tasaMmH(sistema({ emitter_flow_lph: 2, emitter_spacing_m: 0.5 }), 4, 2, null)).toBeCloseTo(1);
  });
  it("microaspersión: 30 L/h × 2 por planta en 4 × 2 m = 7,5 mm/h", () => {
    expect(tasaMmH(sistema({ method: "microaspersion", emitter_flow_lph: 30, emitters_per_plant: 2 }), 4, 2, null)).toBeCloseTo(7.5);
  });
  it("la pluviometría cargada manda sobre el cálculo", () => {
    expect(tasaMmH(sistema({ emitter_flow_lph: 2, emitter_spacing_m: 0.5, application_rate_mmh: 4 }), 4, 2, null)).toBe(4);
  });
  it("surco: 50 L/s sobre 2 ha = 9 mm/h; sin superficie regada, la del lote", () => {
    expect(tasaMmH(sistema({ method: "surco", delivery_flow_lps: 50, irrigated_area_ha: 2 }), null, null, 10)).toBeCloseTo(9);
    expect(tasaMmH(sistema({ method: "surco", delivery_flow_lps: 50 }), null, null, 2)).toBeCloseTo(9);
  });
  it("sin datos suficientes: null", () => {
    expect(tasaMmH(sistema({ emitter_flow_lph: 2, emitter_spacing_m: 0.5 }), null, null, null)).toBeNull();
    expect(tasaMmH(sistema({ method: "surco" }), null, null, 2)).toBeNull();
  });
});

describe("avisoTasa", () => {
  it("avisa si el goteo da un valor raro", () => {
    expect(avisoTasa("goteo", 40)).toMatch(/revisá/);
    expect(avisoTasa("goteo", 2)).toBeNull();
    expect(avisoTasa("surco", 40)).toBeNull();
  });
});

describe("duración", () => {
  it("lee horas con coma, punto o h:mm", () => {
    expect(leerDuracion("2,5")).toBe(150);
    expect(leerDuracion("2.5")).toBe(150);
    expect(leerDuracion("2:30")).toBe(150);
    expect(leerDuracion("0:45")).toBe(45);
    expect(leerDuracion("")).toBeNull();
    expect(leerDuracion("0")).toBeNull();
    expect(leerDuracion("2:75")).toBeNull();
    expect(leerDuracion("mucho")).toBeNull();
  });
  it("la muestra en horas y minutos", () => {
    expect(textoDuracion(150)).toBe("2 h 30 min");
    expect(textoDuracion(60)).toBe("1 h");
    expect(textoDuracion(null)).toBe("—");
  });
});

describe("formasPara", () => {
  it("lluvia: mm o sin cantidad", () => {
    expect(formasPara("lluvia", "goteo")).toEqual(["lamina", "sin_cantidad"]);
  });
  it("pivote empieza por mm; goteo y surco por horas", () => {
    expect(formasPara("riego", "pivote")[0]).toBe("lamina");
    expect(formasPara("riego", "goteo")[0]).toBe("horas");
    expect(formasPara("riego", "surco")[0]).toBe("horas");
  });
});

const base: FormularioEvento = {
  tipo: "riego",
  fecha: "2026-09-10",
  hora: "8:00",
  forma: "horas",
  duracion: "3",
  medidorDesde: "",
  medidorHasta: "",
  volumen: "",
  lamina: "",
  caudal: "",
  notas: " ",
};
const ahora = new Date("2026-10-09T12:00:00-03:00");

describe("armarEvento", () => {
  it("riego en horas, en hora argentina", () => {
    const r = armarEvento(base, ahora, "id-1");
    expect(r).toEqual({
      ok: true,
      evento: {
        client_id: "id-1",
        kind: "riego",
        started_at: "2026-09-10T08:00:00-03:00",
        input_method: "horas",
        duration_min: 180,
        meter_start_m3: null,
        meter_end_m3: null,
        volume_m3: null,
        depth_mm: null,
        flow_lps: null,
        notes: null,
      },
    });
  });
  it("exige lo de cada forma", () => {
    expect(armarEvento({ ...base, duracion: "" }, ahora).ok).toBe(false);
    expect(armarEvento({ ...base, forma: "lamina", lamina: "" }, ahora).ok).toBe(false);
    expect(armarEvento({ ...base, forma: "caudalimetro", medidorDesde: "1100", medidorHasta: "1000" }, ahora)).toMatchObject({ ok: false, mensaje: expect.stringMatching(/mayor/) });
    expect(armarEvento({ ...base, forma: "caudal_y_horas", caudal: "50", duracion: "" }, ahora).ok).toBe(false);
  });
  it("caudalímetro y caudal × horas", () => {
    expect(armarEvento({ ...base, forma: "caudalimetro", medidorDesde: "1000", medidorHasta: "1100,5" }, ahora)).toMatchObject({
      ok: true,
      evento: { meter_start_m3: 1000, meter_end_m3: 1100.5 },
    });
    expect(armarEvento({ ...base, forma: "caudal_y_horas", caudal: "50", duracion: "2" }, ahora)).toMatchObject({
      ok: true,
      evento: { flow_lps: 50, duration_min: 120 },
    });
  });
  it("sin cantidad: alcanza con la fecha y la hora", () => {
    expect(armarEvento({ ...base, forma: "sin_cantidad", duracion: "" }, ahora)).toMatchObject({ ok: true, evento: { input_method: "sin_cantidad" } });
  });
  it("lluvia en mm; no en horas", () => {
    expect(armarEvento({ ...base, tipo: "lluvia", forma: "lamina", lamina: "12", duracion: "" }, ahora)).toMatchObject({ ok: true, evento: { kind: "lluvia", depth_mm: 12 } });
    expect(armarEvento({ ...base, tipo: "lluvia" }, ahora).ok).toBe(false);
  });
  it("no acepta fecha futura ni hora mal escrita", () => {
    expect(armarEvento({ ...base, fecha: "2026-10-10" }, ahora).ok).toBe(false);
    expect(armarEvento({ ...base, hora: "25:00" }, ahora).ok).toBe(false);
    expect(armarEvento({ ...base, fecha: null }, ahora).ok).toBe(false);
  });
  it("cada envío lleva un id distinto", () => {
    const a = armarEvento(base, ahora);
    const b = armarEvento(base, ahora);
    expect(a.ok && b.ok && a.evento.client_id !== b.evento.client_id).toBe(true);
  });
});

describe("totales y subidas explicadas", () => {
  const ev = [
    { kind: "riego" as const, gross_mm: 6, started_at: "2026-09-10T08:00:00-03:00", duration_min: 180 },
    { kind: "riego" as const, gross_mm: null, started_at: "2026-09-12T08:00:00-03:00", duration_min: null },
    { kind: "lluvia" as const, gross_mm: 12, started_at: "2026-09-15T18:00:00-03:00", duration_min: null },
  ];
  it("suma mm y cuenta los sin cantidad", () => {
    expect(totalMm(ev, "riego")).toEqual({ mm: 6, n: 2, sinCantidad: 1 });
    expect(totalMm(ev, "lluvia")).toEqual({ mm: 12, n: 1, sinCantidad: 0 });
  });
  it("una subida dentro del riego o hasta 3 h después queda explicada", () => {
    expect(explicada(Date.parse("2026-09-10T13:30:00-03:00"), ev)).toBe(true); // termina 11:00, +3 h
    expect(explicada(Date.parse("2026-09-10T15:00:00-03:00"), ev)).toBe(false);
    expect(explicada(Date.parse("2026-09-15T19:00:00-03:00"), ev)).toBe(true);
  });
});
