import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const heroBackground = (
  <>
    <div className="absolute inset-0 bg-white" aria-hidden />
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(191,219,254,0.45) 0%, rgba(147,197,253,0.2) 35%, rgba(129,140,248,0.06) 55%, transparent 70%)",
      }}
    />
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        opacity: 0.06,
      }}
    />
  </>
);

const inputClass =
  "w-full rounded-lg border border-gray-200/80 bg-white/95 px-4 py-3 text-gray-900 placeholder:text-gray-500 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  async function handle(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      const errorMsg =
        data.error === "email and password required"
          ? "Correo y contraseña son obligatorios"
          : data.error === "invalid_email"
          ? "El correo no es válido"
          : data.error === "password_too_short"
          ? "La contraseña debe tener al menos 8 caracteres"
          : data.error === "User already exists"
          ? "Ya existe un usuario con ese correo"
          : data.error === "too_many_requests"
          ? "Demasiados intentos. Esperá unos minutos."
          : data.error === "internal_error"
          ? "Error del servidor. Intentá de nuevo más tarde."
          : data.error || "Error al registrarse";
      if (!res.ok) return setError(errorMsg);
      setUser(data.user);
      navigate("/");
    } catch (err) {
      setError("Error de conexión");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center isolate">
        <div
          className="absolute inset-0 z-0 w-full h-full min-h-full overflow-hidden"
          aria-hidden
        >
          {heroBackground}
        </div>

        <div
          className="relative z-10 w-full flex flex-col items-center justify-center px-4"
          style={{
            paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 4rem))",
            paddingBottom:
              "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))",
          }}
        >
          <div className="w-full max-w-md mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-8 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver al inicio
            </Link>

            <div
              className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 sm:p-8 shadow-lg"
              style={{
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
              }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 font-serif mb-2">
                Crear cuenta
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Registrate y empezá a generar creativos con tu marca en minutos.
              </p>

              <form onSubmit={handle} className="flex flex-col gap-4">
                <label className="sr-only" htmlFor="register-name">
                  Nombre
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre"
                  className={inputClass}
                />
                <label className="sr-only" htmlFor="register-email">
                  Correo electrónico
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className={inputClass}
                />
                <label className="sr-only" htmlFor="register-password">
                  Contraseña
                </label>
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className={inputClass}
                />
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200/80 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[0_4px_12px_rgba(30,157,241,0.35)] hover:shadow-[0_6px_16px_rgba(30,157,241,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  Registrarse
                </button>
              </form>

              <p className="text-center text-gray-600 text-sm mt-6">
                ¿Ya tenés cuenta?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
