import React from "react";
import { Link } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";

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

export default function Register() {
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
              <SignUp
                routing="path"
                path="/register"
                signInUrl="/login"
                afterSignUpUrl="/"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
