import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin/overview", label: "Resumen" },
  { to: "/admin/users", label: "Usuarios" },
];

const ADMIN_THEME_KEY = "admin-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(ADMIN_THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  const prefersLight = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)").matches
    : false;
  return prefersLight ? "light" : "dark";
}

export default function AdminLayout() {
  const [theme, setTheme] = React.useState(getInitialTheme);

  React.useEffect(() => {
    try {
      localStorage.setItem(ADMIN_THEME_KEY, theme);
    } catch {}
  }, [theme]);

  return (
    <div className="min-h-screen admin-theme" data-admin-theme={theme}>
      {/* Top bar */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/admin/overview" className="flex items-center">
              <img
                src="/images/aura-white.svg"
                alt="Aura"
                className="h-6 w-auto"
              />
            </Link>
            <nav className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors pb-[17px] pt-[17px] border-b-2 ${
                    isActive
                      ? "text-white border-white"
                      : "text-gray-500 border-transparent hover:text-gray-300"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
              className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
              aria-label="Cambiar tema"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05 5.636 5.636M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              )}
              <span>{theme === "dark" ? "Claro" : "Oscuro"}</span>
            </button>
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              ← Salir al sitio
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
