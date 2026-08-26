import React, { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

// Nodos: Posición, tamaño del punto y timing de la animación de pulso
const NODES = [
  { top: 25, left: 20, size: 4, delay: "0s", duration: "4s" },
  { top: 40, left: 45, size: 5, delay: "1.5s", duration: "3s" },
  { top: 30, left: 75, size: 3, delay: "0.5s", duration: "4.5s" },
  { top: 70, left: 30, size: 4.5, delay: "2.5s", duration: "6s" },
  { top: 75, left: 65, size: 5, delay: "1s", duration: "3.5s" },
  { top: 50, left: 88, size: 3.5, delay: "2s", duration: "4s" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    navigate("/");
  };

  return (
    <div 
      className="min-h-screen w-full flex relative overflow-hidden" 
      style={{ 
        backgroundColor: "#0b0f19",
        backgroundImage: `
          radial-gradient(circle at 20% 150%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% -50%, rgba(20, 83, 112, 0.35) 0%, transparent 50%)
        `
      }}
    >
      <style>{`
        /* Efecto de anillo que se expande y desvanece sutilmente */
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          80%, 100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
        }
        
        /* Efecto de brillo suave en el núcleo del punto */
        @keyframes glow-dot {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }

        .ring-animation {
          animation: pulse-ring var(--duration) cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          animation-delay: var(--delay);
        }

        .dot-animation {
          animation: glow-dot var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        @media (prefers-reduced-motion: reduce) {
          .ring-animation, .dot-animation { animation: none; }
        }
      `}</style>

      {/* PANEL IZQUIERDO — Gráfica nocturna y nodos sutiles */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12 border-r border-slate-800/60">
        
        {/* Capas de montañas oscuras */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          viewBox="0 0 400 900"
          preserveAspectRatio="none"
        >
          <path d="M0,380 C80,330 160,390 240,340 C320,290 400,350 400,350 L400,900 L0,900 Z" fill="#0f172a" />
          <path d="M0,520 C100,470 200,530 300,480 C350,455 400,490 400,490 L400,900 L0,900 Z" fill="#0b0f19" opacity="0.8" />
        </svg>

        {/* Nodos de telemetría con pulsos */}
        {NODES.map((n, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              top: `${n.top}%`,
              left: `${n.left}%`,
            }}
          >
            {/* Anillo de pulso expansivo */}
            <div
              className="absolute rounded-full ring-animation border border-sky-400"
              style={{
                width: `${n.size * 2}px`,
                height: `${n.size * 2}px`,
                backgroundColor: "rgba(56, 189, 248, 0.1)",
                "--delay": n.delay,
                "--duration": n.duration,
              } as React.CSSProperties}
            />
            {/* Punto sólido central */}
            <div
              className="absolute rounded-full bg-sky-400 dot-animation"
              style={{
                width: `${n.size}px`,
                height: `${n.size}px`,
                boxShadow: `0 0 ${n.size * 2.5}px rgba(56, 189, 248, 0.8)`,
                "--delay": n.delay,
                "--duration": n.duration,
              } as React.CSSProperties}
            />
          </div>
        ))}

        {/* Gateway central destacado (antena principal) */}
        <div
          className="absolute pointer-events-none"
          style={{ top: "35%", left: "55%" }}
        >
          <div 
            className="absolute rounded-full bg-sky-500/20 border border-sky-400/50"
            style={{
              width: "16px", height: "16px",
              transform: "translate(-50%, -50%)",
              animation: "pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite"
            }}
          />
          <div 
            className="absolute rounded-full bg-sky-400"
            style={{
              width: "8px", height: "8px",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 15px 4px rgba(56,189,248,0.8)"
            }}
          />
        </div>

        {/* Cabecera de logos */}
        <div className="relative z-10 flex items-center gap-4">
          <img src="/branding/logo-inta.svg" alt="INTA" className="h-14 w-auto object-contain filter brightness-0 invert" />
          <div className="h-5 w-px bg-slate-700" />
          <img src="/branding/isologotipo.svg" alt="Sensor Web" className="h-11 w-auto object-contain filter brightness-0 invert" />
        </div>

        {/* Texto institucional central */}
        <div className="relative z-10 max-w-sm my-auto py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium mb-4 bg-sky-500/10 text-sky-400 border border-sky-500/20 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Telemetría y Red de Sensores
          </div>
          <h2 className="text-3xl font-bold tracking-tight leading-snug text-slate-100">
            Cada punto, un nodo.<br />
            Cada nodo, una red.<br />
            Cada red, una decisión.
          </h2>
        </div>

        {/* Pie de página izquierdo */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-sky-400">
            
          </span>
          <span>PROYECTO SENSOR</span>
        </div>
      </div>

      {/* PANEL DERECHO — Formulario de acceso */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 relative z-10">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl shadow-black/40 border border-slate-100">
          
          <div className="flex lg:hidden items-center justify-center gap-6 mb-12 border-b border-slate-100 pb-6">
            <img src="/branding/logo-inta.svg" alt="INTA" className="h-16 w-auto object-contain filter brightness-0 opacity-90" />
            <img src="/branding/isologotipo.svg" alt="Sensor Web" className="h-12 w-auto object-contain filter brightness-0 opacity-90" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Acceso al panel de control y análisis de datos
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@inta.gob.ar"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-sky-600 focus:bg-white focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                <button type="button" className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-sky-600 focus:bg-white focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-900/25 text-white"
                style={{ backgroundColor: loading ? "#0369a1" : "#0f172a" }}
              >
                <span>{loading ? "Iniciando sesión..." : "Ingresar al Panel"}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
              
              <button
                type="button"
                className="w-full py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                Crear una cuenta
              </button>
            </div>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center space-y-2">
            <p className="text-[11px] font-medium text-slate-500">
              Instituto Nacional de Tecnología Agropecuaria
            </p>
            <p className="text-[11px] text-slate-400">
              Al ingresar, aceptás nuestra{" "}
              <a href="#" className="font-semibold hover:text-slate-600 underline underline-offset-2 transition-colors">
                Política de privacidad
              </a>
              {" "}y los{" "}
              <a href="#" className="font-semibold hover:text-slate-600 underline underline-offset-2 transition-colors">
                Términos de uso
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}