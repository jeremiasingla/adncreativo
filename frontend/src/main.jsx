import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./styles/tailwind.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<h1>No se encontró el elemento #root. Revisa index.html.</h1>";
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  );
}
