import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { OrganizationProfile } from "@clerk/clerk-react";
import { useAuth } from "../contexts/AuthContext";

const iconClass = "w-4 h-4 shrink-0";

function IconHouse({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || iconClass}
      aria-hidden="true"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function IconImage({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || iconClass}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
function IconPalette({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || iconClass}
      aria-hidden="true"
    >
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}
function IconBookOpen({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || iconClass}
      aria-hidden="true"
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}
function IconCircleUser({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className || iconClass}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}
function IconChevronDown({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconPanelLeftClose({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  );
}
function IconPanelLeftOpen({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </svg>
  );
}
const iconSizeClass =
  "[&_svg]:!w-4 [&_svg]:!h-4 [&_svg]:shrink-0 [&_svg]:flex-none";
const sidebarIconSize = "w-4 h-4 shrink-0";
const navButtonBase =
  "inline-flex items-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none cursor-pointer py-2.5 group w-full justify-start gap-3 px-3 h-11 " +
  iconSizeClass;
const sidebarHover = "hover:bg-accent hover:text-[#1e9df1]";
const navButtonDefault = `${navButtonBase} ${sidebarHover} text-neutral-600`;
// Estilos visuales del botón activo (Creativos): gradient, sombras, hover:translate-y-[-1px], active:translate-y-[1px]
const activeButtonVisual =
  "bg-gradient-to-b from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] border border-primary/50";
const navButtonActive = `${navButtonBase} ${activeButtonVisual}`;
const activeButtonCollapsed =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none cursor-pointer rounded-xl group w-12 h-12 " +
  iconSizeClass +
  " " +
  activeButtonVisual;
const navButtonCollapsed =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer group w-12 h-12 text-neutral-600 " +
  iconSizeClass +
  " " +
  sidebarHover;

export default function WorkspaceSidebar({ workspace, collapsed, onCollapse }) {
  const { user } = useAuth();
  const { workspaceSlug } = useParams();
  const { pathname } = useLocation();
  const [showOrgModal, setShowOrgModal] = React.useState(false);

  const safeWorkspace = workspace ?? {};
  const { name: workspaceName = "Espacio", logoUrl, slug } = safeWorkspace;
  const displayName =
    user?.name?.trim() || user?.email?.split("@")[0] || "Usuario";

  const parts = pathname.split("/").filter(Boolean);
  const currentSegment = parts[0] === workspaceSlug ? (parts[1] ?? "") : "";
  const effectiveSegment = currentSegment || "creatives";
  const basePath = workspaceSlug ? `/${workspaceSlug}` : "";

  const pxBar = collapsed ? "px-4" : "px-3";

  const handleOpenOrgModal = () => {
    setShowOrgModal(true);
  };

  const handleCloseOrgModal = () => {
    setShowOrgModal(false);
  };

  return (
    <aside
      className={`h-full flex flex-col shrink-0 border-r border-neutral-100 bg-transparent overflow-hidden transition-all duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
      aria-label="Navegación del workspace"
    >
      {/* Top bar: colapsado = botón w-12 h-12 (logo por defecto, ícono expandir al hover); expandido = logo + selector + botón colapsar w-11 h-11 */}
      <div
        className={`h-16 flex items-center border-b border-neutral-100 ${
          collapsed ? "px-4 justify-center" : "px-3 justify-between"
        }`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-xl group w-12 h-12 shrink-0 cursor-e-resize"
            title="Expandir barra lateral"
            aria-label="Expandir barra lateral"
          >
            <img
              alt="ADNCreativo"
              width={24}
              height={24}
              src="/images/logo-adncreativo-no-background.svg"
              className="w-6 h-6 shrink-0 group-hover:hidden"
              style={{ color: "transparent" }}
              loading="lazy"
              decoding="async"
            />
            <IconPanelLeftOpen className="w-4 h-4 shrink-0 text-neutral-500 hidden group-hover:block group-hover:text-[#1e9df1]" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center shrink-0 pl-1">
                <img
                  alt="ADNCreativo"
                  width={24}
                  height={24}
                  decoding="async"
                  src="/images/logo-adncreativo-no-background.svg"
                  className="w-6 h-6 shrink-0"
                  style={{ color: "transparent" }}
                />
              </div>
              <span className="text-neutral-300 text-lg shrink-0">/</span>
              <button
                type="button"
                onClick={handleOpenOrgModal}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer hover:bg-accent hover:text-accent-foreground group h-auto px-2 py-1.5 min-w-0"
                aria-label="Cambiar espacio de trabajo"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center text-white font-semibold text-[10px] overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      alt={workspaceName}
                      src={logoUrl}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="text-foreground">
                      {(workspaceName || "W").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[15px] font-medium text-neutral-700 group-hover:text-[#1e9df1] truncate transition-colors">
                  {workspaceName}
                </span>
                <IconChevronDown
                  className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1e9df1] shrink-0 transition-colors"
                  aria-hidden="true"
                />
              </button>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-xl w-11 h-11 text-neutral-400 shrink-0 cursor-w-resize"
              title="Colapsar barra lateral"
              aria-label="Colapsar barra lateral"
            >
              <IconPanelLeftClose className="w-4 h-4 shrink-0" />
            </button>
          </>
        )}
      </div>

      {/* Inicio: vuelve al dashboard */}
      <div
        className={`py-4 border-b border-neutral-100 ${
          collapsed ? "px-4" : "px-3"
        }`}
      >
        <Link
          to="/"
          className={`inline-flex items-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none ${iconSizeClass} cursor-pointer py-2.5 text-neutral-600 w-full justify-start gap-3 px-3 h-11 ${
            collapsed ? "!w-12 !h-12 !justify-center" : ""
          } ${sidebarHover}`}
        >
          <IconHouse className={sidebarIconSize} />
          {!collapsed && <span>Inicio</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-5 overflow-y-auto flex flex-col ${pxBar}`}>
        <div className={collapsed ? "space-y-4" : "space-y-4"}>
          <div>
            {!collapsed && (
              <p className="font-sans text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2.5 px-2">
                Crear
              </p>
            )}
            <ul className={collapsed ? "space-y-2.5" : "space-y-1.5"}>
              <li>
                <Link
                  to={`${basePath}/creatives`}
                  className={
                    effectiveSegment === "creatives"
                      ? collapsed
                        ? activeButtonCollapsed
                        : navButtonActive
                      : collapsed
                        ? navButtonCollapsed
                        : navButtonDefault
                  }
                >
                  <IconImage
                    className={`${sidebarIconSize} transition-colors ${
                      effectiveSegment === "creatives"
                        ? "text-primary-foreground"
                        : "text-neutral-500 group-hover:text-[#1e9df1]"
                    }`}
                  />
                  {!collapsed && <span>Creativos</span>}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-auto space-y-4 pt-4">
          <div>
            {!collapsed && (
              <p className="font-sans text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2.5 px-2">
                Mi negocio
              </p>
            )}
            <ul className={collapsed ? "space-y-2.5" : "space-y-1.5"}>
              <li>
                <Link
                  to={`${basePath}/branding`}
                  className={
                    effectiveSegment === "branding"
                      ? collapsed
                        ? activeButtonCollapsed
                        : navButtonActive
                      : collapsed
                        ? navButtonCollapsed
                        : navButtonDefault
                  }
                >
                  <IconPalette
                    className={`${sidebarIconSize} transition-colors ${
                      effectiveSegment === "branding"
                        ? "text-primary-foreground"
                        : "text-neutral-500 group-hover:text-[#1e9df1]"
                    }`}
                  />
                  {!collapsed && <span>Branding</span>}
                </Link>
              </li>
              <li>
                <Link
                  to={`${basePath}/base-de-conocimiento`}
                  className={
                    effectiveSegment === "base-de-conocimiento"
                      ? collapsed
                        ? activeButtonCollapsed
                        : navButtonActive
                      : collapsed
                        ? navButtonCollapsed
                        : navButtonDefault
                  }
                >
                  <IconBookOpen
                    className={`${sidebarIconSize} transition-colors ${
                      effectiveSegment === "base-de-conocimiento"
                        ? "text-primary-foreground"
                        : "text-neutral-500 group-hover:text-[#1e9df1]"
                    }`}
                  />
                  {!collapsed && <span>Base de Conocimiento</span>}
                </Link>
              </li>
              <li>
                <Link
                  to={`${basePath}/customer-profiles`}
                  className={
                    effectiveSegment === "customer-profiles"
                      ? collapsed
                        ? activeButtonCollapsed
                        : navButtonActive
                      : collapsed
                        ? navButtonCollapsed
                        : navButtonDefault
                  }
                >
                  <IconCircleUser
                    className={`${sidebarIconSize} transition-colors ${
                      effectiveSegment === "customer-profiles"
                        ? "text-primary-foreground"
                        : "text-neutral-500 group-hover:text-[#1e9df1]"
                    }`}
                  />
                  {!collapsed && <span>Perfiles de Clientes</span>}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Pie: usuario */}
      <div className={`py-5 border-t border-neutral-100 space-y-3 ${pxBar}`}>
        <div
          className={`group flex items-center text-sm font-semibold transition-all cursor-pointer rounded-xl text-neutral-600 hover:bg-accent hover:text-accent-foreground font-sans ${
            collapsed ? "w-12 h-12 justify-center" : "w-full h-11 gap-3 px-3"
          }`}
          role="button"
          tabIndex={0}
        >
          <div className="w-4 h-4 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <span className="truncate flex-1">{displayName}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {user?.role === "admin" ? "ADMIN" : "Básico"}
              </span>
            </>
          )}
        </div>
      </div>
    </aside>
    {showOrgModal &&
      createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleCloseOrgModal}
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={handleCloseOrgModal}
            aria-hidden="true"
          />
          <div
            className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseOrgModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-50"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6 pt-12">
              <OrganizationProfile />
            </div>
          </div>
        </div>,
        document.body
      )}
  );
}
