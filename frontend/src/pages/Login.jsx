import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import HeroBackground from "../components/HeroBackground";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      const returnPath =
        (typeof sessionStorage !== "undefined" &&
          sessionStorage.getItem("auth_return_path")) ||
        from;
      try {
        sessionStorage.removeItem("auth_return_path");
      } catch (_) {}
      navigate(returnPath || "/", { replace: true });
    } catch (err) {
      const msg = err?.message || "invalid_credentials";
      setError(
        msg === "invalid_credentials" ? "Correo o contraseña incorrectos" : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-screen w-full lg:min-h-0 lg:h-[100dvh]">
        <HeroBackground />
        <div
          className="relative z-10 min-h-screen w-full lg:h-[100dvh] flex flex-col items-center justify-center p-4"
          style={{
            paddingTop:
              "max(10rem, calc(env(safe-area-inset-top, 0px) + 10rem))",
            paddingBottom:
              "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))",
          }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-black/60 hover:text-black text-sm font-medium mb-8 transition-colors"
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

          <div className="w-full max-w-md mx-auto px-4 sm:px-6">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center font-instrument-serif bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-500 bg-clip-text text-transparent">
              Iniciar sesión
            </h1>
            <p className="text-black/60 text-sm text-center mb-6">
              Ingresá con el email de tu cuenta
            </p>

            <div className="w-full max-w-md mx-auto relative rounded-xl p-1 transition-all duration-300 glass-prompt-wrap hover:scale-[1.005]">
              <div className="rounded-[10px] bg-white/95 backdrop-blur-sm p-6 sm:p-8 shadow-inner">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                      {error}
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contraseña
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white/80 focus:ring-2 focus:ring-black focus:border-transparent transition-shadow"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {loading ? "Entrando…" : "Entrar"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
