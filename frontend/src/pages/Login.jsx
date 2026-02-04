import React from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";

export default function Login({ onClose }) {
  const [isSignUp, setIsSignUp] = React.useState(false);

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
          <SignUp
            mode="modal"
            routing="virtual"
            afterSignUpUrl="/"
            signInUrl="javascript:void(0)"
            appearance={{
              elements: {
                modalBackdrop: "hidden",
                rootBox: "flex justify-center items-center",
                card: "shadow-2xl rounded-2xl bg-white",
                formButtonPrimary:
                  "bg-black hover:bg-gray-800 text-white rounded-lg",
              },
            }}
          />
        ) : (
          <SignIn
            mode="modal"
            routing="virtual"
            afterSignInUrl="/"
            appearance={{
              elements: {
                modalBackdrop: "hidden",
                rootBox: "flex justify-center items-center",
                card: "shadow-2xl rounded-2xl bg-white",
                formButtonPrimary:
                  "bg-black hover:bg-gray-800 text-white rounded-lg",
              },
            }}
          />
        )}

        {/* Toggle button between SignIn and SignUp */}
        <div className="text-center mt-4 text-sm text-gray-600">
          {isSignUp ? (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
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
