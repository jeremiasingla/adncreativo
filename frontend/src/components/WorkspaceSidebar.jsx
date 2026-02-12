import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useClerk } from "@clerk/clerk-react";
import { useAuth } from "../contexts/AuthContext";
import {
  IconHouse,
  IconImage,
  IconPalette,
  IconBookOpen,
  IconCircleUser,
  IconChevronDown,
  IconPanelLeftClose,
  IconPanelLeftOpen,
  IconSparkles,
  IconSettings,
  IconCreditCard,
  IconLogOut,
} from "./icons";

const iconClass = "w-4 h-4 shrink-0";
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
  const { t } = useTranslation();
  const { openUserProfile } = useClerk();
  const { user, logout } = useAuth();
  const { workspaceSlug } = useParams();
  const { pathname } = useLocation();
  const [showUserPopup, setShowUserPopup] = React.useState(false);
  const userButtonRef = React.useRef(null);
  const popupRef = React.useRef(null);
  
  const safeWorkspace = workspace ?? {};
  const { name: workspaceName = "Espacio", logoUrl, slug } = safeWorkspace;
  const displayName =
    user?.name?.trim() || user?.email?.split("@")[0] || t("common.user");

  const parts = pathname.split("/").filter(Boolean);
  const currentSegment = parts[0] === workspaceSlug ? (parts[1] ?? "") : "";
  const effectiveSegment = currentSegment || "creatives";
  const basePath = workspaceSlug ? `/${workspaceSlug}` : "";

  const pxBar = collapsed ? "px-4" : "px-3";

  // Cerrar popup al hacer clic fuera o presionar Escape
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showUserPopup &&
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target)
      ) {
        setShowUserPopup(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape" && showUserPopup) {
        setShowUserPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showUserPopup]);

  const toggleUserPopup = () => {
    setShowUserPopup(!showUserPopup);
  };

  return (
    <aside
      className={`h-full flex flex-col shrink-0 border-r border-neutral-100 bg-transparent overflow-hidden transition-all duration-200 ${collapsed ? "w-20" : "w-64"}`}
      aria-label="Navegación del workspace"
    >
      {/* Top bar: colapsado = botón w-12 h-12 (logo por defecto, ícono expandir al hover); expandido = logo + selector + botón colapsar w-11 h-11 */}
      <div
        className={`h-16 flex items-center border-b border-neutral-100 ${collapsed ? "px-4 justify-center" : "px-3 justify-between"}`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-xl group w-12 h-12 shrink-0 cursor-e-resize"
            title={t("sidebar.expand")}
            aria-label={t("sidebar.expand")}
          >
            <img
              alt="Aura Studio"
              width={24}
              height={24}
              decoding="async"
              src="/images/favicon-red.svg"
              className="w-6 h-6 shrink-0 group-hover:hidden"
              style={{ color: "transparent" }}
            />
            <IconPanelLeftOpen className="w-4 h-4 shrink-0 text-neutral-500 hidden group-hover:block group-hover:text-[#1e9df1]" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center shrink-0 pl-1">
                <img
                  alt="Aura Studio"
                  width={24}
                  height={24}
                  decoding="async"
                  src="/images/favicon-red.svg"
                  className="w-6 h-6 shrink-0"
                  style={{ color: "transparent" }}
                />
              </div>
              <span className="text-neutral-300 text-lg shrink-0">/</span>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer hover:bg-accent hover:text-accent-foreground group h-auto px-2 py-1.5 min-w-0"
                aria-label="Cambiar espacio de trabajo"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center text-white font-semibold text-[10px] overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      alt={workspaceName}
                      src={logoUrl}
                      className="w-full h-full object-cover"
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
              title={t("sidebar.collapse")}
              aria-label={t("sidebar.collapse")}
            >
              <IconPanelLeftClose className="w-4 h-4 shrink-0" />
            </button>
          </>
        )}
      </div>

      {/* Inicio: vuelve al dashboard */}
      <div
        className={`py-4 border-b border-neutral-100 ${collapsed ? "px-4" : "px-3"}`}
      >
        <Link
          to="/"
          className={`inline-flex items-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none ${iconSizeClass} cursor-pointer py-2.5 text-neutral-600 w-full justify-start gap-3 px-3 h-11 ${collapsed ? "!w-12 !h-12 !justify-center" : ""} ${sidebarHover}`}
        >
          <IconHouse className={sidebarIconSize} />
          {!collapsed && <span>{t("sidebar.home")}</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-5 overflow-y-auto flex flex-col ${pxBar}`}>
        <div className={collapsed ? "space-y-4" : "space-y-4"}>
          <div>
            {!collapsed && (
              <p className="font-sans text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2.5 px-2">
                {t("sidebar.create")}
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
                    className={`${sidebarIconSize} transition-colors ${effectiveSegment === "creatives" ? "text-primary-foreground" : "text-neutral-500 group-hover:text-[#1e9df1]"}`}
                  />
                  {!collapsed && <span>{t("sidebar.creatives")}</span>}
                </Link>
              </li>
              <li>
                <Link
                  to={`${basePath}/galeria`}
                  className={
                    effectiveSegment === "galeria"
                      ? collapsed
                        ? activeButtonCollapsed
                        : navButtonActive
                      : collapsed
                        ? navButtonCollapsed
                        : navButtonDefault
                  }
                >
                  <IconSparkles
                    className={`${sidebarIconSize} transition-colors ${effectiveSegment === "galeria" ? "text-primary-foreground" : "text-neutral-500 group-hover:text-[#1e9df1]"}`}
                  />
                  {!collapsed && <span>{t("sidebar.gallery")}</span>}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-auto space-y-4 pt-4">
          <div>
            {!collapsed && (
              <p className="font-sans text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2.5 px-2">
                {t("sidebar.myBusiness")}
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
                    className={`${sidebarIconSize} transition-colors ${effectiveSegment === "branding" ? "text-primary-foreground" : "text-neutral-500 group-hover:text-[#1e9df1]"}`}
                  />
                  {!collapsed && <span>{t("sidebar.branding")}</span>}
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
                    className={`${sidebarIconSize} transition-colors ${effectiveSegment === "base-de-conocimiento" ? "text-primary-foreground" : "text-neutral-500 group-hover:text-[#1e9df1]"}`}
                  />
                  {!collapsed && <span>{t("sidebar.knowledgeBase")}</span>}
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
                    className={`${sidebarIconSize} transition-colors ${effectiveSegment === "customer-profiles" ? "text-primary-foreground" : "text-neutral-500 group-hover:text-[#1e9df1]"}`}
                  />
                  {!collapsed && <span>{t("sidebar.customerProfiles")}</span>}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Pie: usuario */}
      <div className={`py-5 border-t border-neutral-100 space-y-3 ${pxBar} relative`}>
        <div
          ref={userButtonRef}
          onClick={toggleUserPopup}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleUserPopup();
            }
          }}
          className={`group flex items-center text-sm font-semibold transition-all cursor-pointer rounded-xl text-neutral-600 hover:bg-accent hover:text-accent-foreground font-sans ${collapsed ? "w-12 h-12 justify-center" : "w-full h-11 gap-3 px-3"}`}
          role="button"
          tabIndex={0}
          aria-label={t("nav.userMenu")}
          aria-expanded={showUserPopup}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-4 h-4 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="w-4 h-4 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <>
              <span className="truncate flex-1">{displayName}</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {user?.role === "admin" ? t("common.admin") : t("common.basic")}
              </span>
            </>
          )}
        </div>

        {/* Popover tipo Clerk: User button popover */}
        {showUserPopup && (
          <div
            ref={popupRef}
            role="dialog"
            aria-label={t("nav.userMenu")}
            className="absolute bottom-full left-0 mb-2 min-w-[220px] max-w-[calc(100%-24px)] bg-white rounded-xl shadow-xl border border-neutral-200/80 overflow-hidden z-50"
            style={{
              animation: "fadeInUp 0.2s ease-out",
              boxShadow:
                "0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div className="p-3">
              {/* User preview */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-[22px] h-[22px] rounded-full overflow-hidden bg-neutral-100">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={displayName}
                      title={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-neutral-900 truncate">
                    {displayName}
                  </div>
                  <div className="text-[12px] text-neutral-500 truncate">
                    {user?.email || ""}
                  </div>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div
              className="border-t border-neutral-100 py-1"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowUserPopup(false);
                  openUserProfile?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <IconSettings className="w-4 h-4 shrink-0 text-neutral-500" />
                <span>{t("common.manageAccount")}</span>
              </button>
              <Link
                to="/billing"
                role="menuitem"
                onClick={() => setShowUserPopup(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <IconCreditCard className="w-4 h-4 shrink-0 text-neutral-500" />
                <span>{t("common.billing")}</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setShowUserPopup(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <IconLogOut className="w-4 h-4 shrink-0 text-neutral-500" />
                <span>{t("common.signOut")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
