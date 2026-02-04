import React from "react";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export default function Login({ onClose }) {
  const [isSignUp, setIsSignUp] = React.useState(false);
  const redirectUrl = window.location.pathname;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isSignUp ? (
          <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
            <button className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium">
              Crear cuenta
            </button>
          </SignUpButton>
        ) : (
          <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
            <button className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium">
              Iniciar sesión
            </button>
          </SignInButton>
        )}

        {/* Toggle button between SignIn and SignUp */}
        <div className="text-center mt-4 text-sm text-gray-600">
          {isSignUp ? (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-black font-semibold hover:underline"
              >
                Inicia sesión
              </button>
            </>
          ) : (
            <>
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-black font-semibold hover:underline"
              >
                Regístrate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
