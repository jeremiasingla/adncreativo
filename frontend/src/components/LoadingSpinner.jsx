import React from "react";

/**
 * Componente de spinner de carga reutilizable
 * @param {string} size - "small" (8) | "medium" (10) | "large" (16) | "xl" (20)
 * @param {string} className - Clases adicionales de tailwind
 */
export function LoadingSpinner({
  size = "medium",
  className = "",
  variant = "default",
}) {
  const sizeMap = {
    small: "w-8 h-8",
    medium: "w-10 h-10",
    large: "w-16 h-16",
    xl: "w-20 h-20",
  };
  const ringClassName =
    variant === "white"
      ? "border-white/30 border-t-white"
      : "border-border border-t-primary";

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Cargando"
    >
      <div
        className={`${sizeMap[size]} border-2 ${ringClassName} rounded-full animate-spin`}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Spinner centrado para pantalla completa/viewport
 */
export function FullScreenLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner size="large" />
    </div>
  );
}

/**
 * Spinner centrado en pantalla para admin
 */
export function AdminFullScreenSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <LoadingSpinner size="small" variant="white" />
    </div>
  );
}

/**
 * Spinner centrado para contenedor flexible
 */
export function CenteredLoadingSpinner() {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-8">
      <LoadingSpinner size="large" />
    </div>
  );
}
