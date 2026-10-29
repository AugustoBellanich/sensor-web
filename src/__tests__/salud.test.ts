import { describe, expect, it, vi } from "vitest";

vi.mock("@/datos/supabase", () => ({ supabase: {}, URL_BASE: "https://x.supabase.co" }));

import { detalleCausa, fraseCausa, fraseResumen, nivel, ordenar, resumen, resumenEstado, sensoresDe, tituloEstado, type SaludEquipo } from "@/datos/salud";

const ahora = new Date("2026-10-20T15:00:00Z");

const equipo = (x: Partial<SaludEquipo>): SaludEquipo => ({
  device_id: "B01-000001",
  type: "B01",
  alias: null,
  site_name: null,
  establishment_id: null,
  establishment_name: null,
  gateway_id: "N01-24955A",
  state: "al-dia",
  severity: 0,
  causes: [],
  last_lora_at: null,
  last_reading_at: null,
  expected_interval_s: 900,
  completeness_24h: 1,
  clock_offset_s: null,
  battery_pct: 90,
  battery_mv: null,
  ...x,
});

const causa = (code: string, severity: number, data: Record<string, unknown> = {}) => ({
  code,
  severity,
  title: code,
  advice: "hacer algo",
  data,
});

describe("salud de la red", () => {
  it("nivel según la gravedad", () => {
    expect(nivel(equipo({}))).toBe("ok");
    expect(nivel(equipo({ state: "bateria-baja", severity: 2 }))).toBe("aviso");
    expect(nivel(equipo({ state: "sin-conexion", severity: 6 }))).toBe("grave");
    expect(nivel(equipo({ state: "reloj", severity: 4 }))).toBe("grave");
    expect(nivel(equipo({ state: "sin-datos" }))).toBe("gris");
    expect(nivel(equipo({ state: "solo-sd" }))).toBe("gris");
  });

  it("detalle de cada causa en palabras", () => {
    expect(detalleCausa(causa("sin-conexion", 6, { since: "2026-10-20T10:00:00Z" }), ahora)).toBe("Último dato hace 5 h");
    expect(detalleCausa(causa("reloj", 4, { offset_s: 4200 }))).toBe("Atrasado 1 h 10 min");
    expect(detalleCausa(causa("reloj", 4, { offset_s: -300 }))).toBe("Adelantado 5 min");
    expect(detalleCausa(causa("intermitente", 3, { completeness: 0.5, gaps: 4 }))).toBe("50 % de lo esperado en 24 h · 4 cortes");
    expect(detalleCausa(causa("bateria-critica", 5, { battery_pct: 8, battery_mv: 3380 }))).toBe("8 % · 3.38 V");
    expect(detalleCausa(causa("no-carga", 3, { drop_pct: 12, days: 3 }))).toBe("Bajó 12 puntos en 3 días");
    expect(detalleCausa(causa("no-sube", 5, { pending_batches: 6, errors_1h: 1 }))).toBe("6 lotes sin subir · 1 envío con error en la última hora");
    expect(detalleCausa(causa("senal-debil", 2, { rssi: -82 }))).toBe("-82 dBm");
    expect(detalleCausa(causa("sensores-sin-alta", 3, { ids: ["B01-24955A", "C01-24955A"] }))).toBe("B01-24955A, C01-24955A");
    expect(detalleCausa(causa("otra", 1))).toBeNull();
  });

  it("resumen y frase del campo", () => {
    const lista = [
      equipo({ device_id: "N01-24955A", type: "N01" }),
      equipo({ device_id: "B01-1", state: "sin-conexion", severity: 6 }),
      equipo({ device_id: "C01-1", type: "C01", state: "bateria-baja", severity: 2 }),
      equipo({ device_id: "C01-2", type: "C01", state: "sin-datos" }),
    ];
    const r = resumen(lista);
    expect(r).toEqual({ total: 4, problemas: 2, graves: 1, gateways: 1, sensores: 3 });
    expect(fraseResumen(r)).toBe("2 equipos necesitan atención (1 con un problema grave)");
    expect(fraseResumen(resumen([equipo({})]))).toBe("El equipo está bien");
    expect(fraseResumen(resumen([]))).toBe("Este campo todavía no tiene equipos");
  });

  it("orden: lo más grave primero, los que nunca mandaron al final", () => {
    const l = ordenar([
      equipo({ device_id: "C01-NADA", type: "C01", state: "sin-datos" }),
      equipo({ device_id: "B01-OK" }),
      equipo({ device_id: "B01-BAT", state: "bateria-baja", severity: 2 }),
      equipo({ device_id: "B01-OFF", state: "sin-conexion", severity: 6 }),
    ]);
    expect(l.map((e) => e.device_id)).toEqual(["B01-OFF", "B01-BAT", "B01-OK", "C01-NADA"]);
  });

  it("sensores de un gateway y título del estado", () => {
    const l = [equipo({ device_id: "B01-A" }), equipo({ device_id: "B01-B", gateway_id: "N01-OTRO" }), equipo({ device_id: "N01-24955A", type: "N01", gateway_id: null })];
    expect(sensoresDe("N01-24955A", l).map((e) => e.device_id)).toEqual(["B01-A"]);
    expect(tituloEstado(equipo({}))).toBe("Al día");
    expect(tituloEstado(equipo({ causes: [causa("reloj", 4)] }))).toBe("reloj");
  });
});

describe("resumenEstado", () => {
  it("sin causas, el estado en palabras", () => {
    expect(resumenEstado(equipo({}))).toBe("Al día");
  });
  it("cuenta graves y avisos sin repetir el título de la causa", () => {
    expect(resumenEstado(equipo({ causes: [causa("no-carga", 3)] }))).toBe("1 aviso");
    expect(resumenEstado(equipo({ causes: [causa("sin-conexion", 6), causa("no-carga", 3), causa("reloj", 2)] }))).toBe("1 problema grave · 2 avisos");
  });
});

describe("fraseCausa", () => {
  const ahora = new Date("2026-10-20T15:00:00Z");
  const c = (code: string, data: Record<string, unknown> = {}) => ({ code, severity: 3, title: "T", advice: "Hacé algo.", data });
  it("una frase con el dato y qué hacer", () => {
    expect(fraseCausa(c("bateria-baja", { battery_pct: 22 }), "B01")).toBe("Batería baja (22 %): limpiá el panel solar.");
    expect(fraseCausa(c("sin-conexion", { since: "2026-10-20T10:00:00Z" }), "B01", ahora)).toBe("Sin datos hace 5 h: revisá la batería y la antena.");
    expect(fraseCausa(c("sin-conexion", {}), "N01")).toBe("Sin conexión: revisá la alimentación y el WiFi.");
    expect(fraseCausa(c("reloj", { offset_s: 4200 }), "C01")).toBe("Reloj atrasado 1 h 10 min: ponelo en hora por Bluetooth.");
    expect(fraseCausa(c("intermitente", { completeness: 0.45 }), "B01")).toBe("Llega el 45 % de los datos: revisá la antena y la distancia al receptor.");
    expect(fraseCausa(c("no-sube", { token: true }), "N01")).toBe("La base rechaza sus envíos: cargale un token nuevo.");
    expect(fraseCausa(c("sensores-sin-alta", { ids: ["B01-1", "C01-2"] }), "N01")).toBe("Recibe 2 sensores sin dar de alta: dalos de alta para guardar sus datos.");
  });
  it("código nuevo: título y consejo de la base", () => {
    expect(fraseCausa(c("otra-cosa"), "B01")).toBe("T: hacé algo.");
  });
});
