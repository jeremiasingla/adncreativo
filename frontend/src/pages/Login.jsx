import React from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";

export default function Login({ onClose, isSignUp, setIsSignUp }) {
  const redirectUrl = window.location.pathname;
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const handleLinkClick = (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      
      // Si es un link de sign up, cambiar a SignUp
      if (href && href.includes("/sign-up")) {
        e.preventDefault();
        setIsSignUp(true);
      }
      // Si es un link de sign in, cambiar a SignIn
      if (href && href.includes("/sign-in")) {
        e.preventDefault();
        setIsSignUp(false);
      }
    };

    containerRef.current.addEventListener("click", handleLinkClick);
    return () => {
      containerRef.current?.removeEventListener("click", handleLinkClick);
    };
  }, [setIsSignUp]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isSignUp ? (
          <SignUp
            mode="modal"
            routing="virtual"
            forceRedirectUrl={redirectUrl}
            appearance={{
              elements: {
                modalBackdrop: "hidden",
                rootBox: "flex justify-center items-center",
                card: "shadow-2xl rounded-2xl bg-white",
                formButtonPrimary:
                  "bg-black hover:bg-gray-800 text-white rounded-lg",
                footerActionLink: "hidden",
              },
            }}
          />
        ) : (
          <SignIn
            mode="modal"
            routing="virtual"
            forceRedirectUrl={redirectUrl}
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
      </div>
    </div>
  );
}
