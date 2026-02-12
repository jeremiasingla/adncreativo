import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App";
import "./styles/tailwind.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<h1>No se encontró el elemento #root. Revisa index.html.</h1>";
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
