import { describe, expect, it } from "vitest";
import { AuthError } from "@supabase/supabase-js";

import { codigoCompleto, correoValido, limpiarCodigo, mensajeDeError } from "@/datos/errores";

describe("mensajeDeError", () => {
  it("traduce los códigos de Supabase", () => {
    expect(mensajeDeError(new AuthError("x", 400, "invalid_credentials"))).toMatch(/no son correctos/);
    expect(mensajeDeError(new AuthError("x", 400, "otp_expired"))).toMatch(/código venció/);
  });
  it("sin conexión", () => {
    expect(mensajeDeError(new Error("Network request failed"))).toMatch(/conexión/);
  });
  it("sin error", () => {
    expect(mensajeDeError(null)).toMatch(/inesperado/);
  });
});

describe("validaciones", () => {
  it("correo", () => {
    expect(correoValido(" augusto@inta.gob.ar ")).toBe(true);
    expect(correoValido("augusto@")).toBe(false);
  });
  it("código pegado con espacios", () => {
    expect(limpiarCodigo("123 456")).toBe("123456");
    expect(codigoCompleto("12345")).toBe(false);
    expect(codigoCompleto("123-456")).toBe(true);
  });
});
