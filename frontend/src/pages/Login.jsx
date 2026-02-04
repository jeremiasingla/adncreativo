import React from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";

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

export default function Login({ onClose }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromQuery = searchParams.get("from");
  const fromStorage = (() => {
    try {
      return sessionStorage.getItem("auth_return_path");
    } catch (_) {
      return null;
    }
  })();
  const returnTo =
    location.state?.from?.pathname ?? fromQuery ?? fromStorage ?? "/";

  return (
    <div className="w-full">
      <div className="w-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md mx-auto">
          <SignIn
            routing="virtual"
            afterSignInUrl="/"
            signUpUrl="javascript:void(0)"
          />
        </div>
      </div>
    </div>
  );
}
