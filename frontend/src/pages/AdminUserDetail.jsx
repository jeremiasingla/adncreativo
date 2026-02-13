import React from "react";
import { useParams, Link } from "react-router-dom";
import { fetchWithAuth } from "../api/fetchWithAuth";
import ActivityHeatmap from "../components/ActivityHeatmap";
import { AdminFullScreenSpinner } from "../components/LoadingSpinner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
} from "../components/DropdownMenu";

/* ── Clerk format helpers ── */
function getUserEmail(user) {
  return user.email_addresses?.[0]?.email_address || user.email || "";
}

function getUserName(user) {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return user.name || getUserEmail(user);
}

/* ── helpers ── */
function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(ts) {
  if (!ts) return "-";
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatSessionTime(ts) {
  if (!ts) return "-";
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const time = d.toLocaleTimeString("es-ES", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.getTime() >= startOfToday) return `hoy a las ${time}`;
  if (d.getTime() >= startOfYesterday) return `ayer a las ${time}`;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(ts) {
  if (!ts) return "-";
  const diff = Date.now() - Number(ts);
  if (Number.isNaN(diff) || diff < 0) return "-";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

function getInitials(name, email) {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function CopyButton({ text }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      className="ml-2 text-gray-500 hover:text-gray-300 transition-colors"
      title="Copiar"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        <svg
          className="w-3.5 h-3.5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect
            x="9"
            y="9"
            width="13"
            height="13"
            rx="2"
            ry="2"
            strokeWidth={2}
          />
          <path
            strokeWidth={2}
            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
          />
        </svg>
      )}
    </button>
  );
}

/* ── modal: reset password ── */
function ResetPasswordModal({ userId, onClose }) {
  const [pw, setPw] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  async function handleSave() {
    if (pw.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/admin/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const json = await res?.json().catch(() => ({}));
      if (json?.success) {
        setDone(true);
        setTimeout(onClose, 1200);
      } else setError(json?.error || "Error");
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1b20] border border-white/10 rounded-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          Restaurar contraseña
        </h3>
        <label className="text-xs text-gray-400 block mb-1">
          Nueva contraseña
        </label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="w-full rounded-lg bg-[#0f0f0f] border border-white/10 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/20 mb-1"
        />
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        {done && (
          <p className="text-xs text-green-400 mb-2">Contraseña actualizada</p>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── modal: change role ── */
function ChangeRoleModal({ userId, currentRole, onClose, onChanged }) {
  const [role, setRole] = React.useState(currentRole || "user");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res?.json().catch(() => ({}));
      if (json?.success) {
        onChanged(role);
        onClose();
      } else setError(json?.error || "Error");
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1b20] border border-white/10 rounded-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Cambiar rol</h3>
        <div className="space-y-2">
          {["user", "admin"].map((r) => (
            <label
              key={r}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${role === r
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 hover:border-white/20"
                }`}
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="accent-purple-500"
              />
              <span className="text-sm text-gray-200 capitalize">{r}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main ── */
export default function AdminUserDetail() {
  const { userId } = useParams();
  const [detail, setDetail] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activityMap, setActivityMap] = React.useState({});
  const [activityLoading, setActivityLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null); // "password" | "role" | null

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(
          `/admin/users/${encodeURIComponent(userId)}`,
        );
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success) setDetail(json.data);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      try {
        const res = await fetchWithAuth(
          `/admin/users/${encodeURIComponent(userId)}/activity`,
        );
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success) setActivityMap(json.data || {});
      } catch {
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = detail?.user;
  const workspaces = detail?.workspaces || [];
  const sessions = detail?.sessions || [];

  if (loading) {
    return <AdminFullScreenSpinner />;
  }
  if (!user) {
    return (
      <div className="text-sm text-gray-500 py-10">Usuario no encontrado.</div>
    );
  }

  const userName = getUserName(user);
  const userEmail = getUserEmail(user);
  const initials = getInitials(userName, userEmail);

  return (
    <div style={{ fontFamily: "'Geist', sans-serif" }}>
      {/* Modals */}
      {modal === "password" && (
        <ResetPasswordModal userId={user.id} onClose={() => setModal(null)} />
      )}
      {modal === "role" && (
        <ChangeRoleModal
          userId={user.id}
          currentRole={user.role}
          onClose={() => setModal(null)}
          onChanged={(newRole) =>
            setDetail((prev) =>
              prev ? { ...prev, user: { ...prev.user, role: newRole } } : prev,
            )
          }
        />
      )}

      {/* Back */}
      <Link
        to="/admin/users"
        className="text-sm text-gray-500 hover:text-white transition-colors"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        ← Usuarios
      </Link>

      {/* Header */}
      <div
        className="mt-5 flex items-center justify-between"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        <div
          className="flex items-center gap-4"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          <div
            className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold text-gray-300"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            {initials}
          </div>
          <div style={{ fontFamily: "'Geist', sans-serif" }}>
            <h1
              className="text-2xl font-semibold text-white"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              {userName}
            </h1>
            <p
              className="text-sm text-gray-500"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              Última actividad{" "}
              {user.last_sign_in_at
                ? formatRelative(user.last_sign_in_at)
                : "nunca"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                style={{
                  boxSizing: "border-box",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(234, 48, 25, 0.5)",
                  fontSize: "14px",
                  margin: 0,
                  padding: "0 16px",
                  appearance: "button",
                  // backgroundColor: "transparent", // Handled by data state if needed, or stick to styles
                  cursor: "pointer",
                  display: "inline-flex",
                  height: "32px",
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  borderRadius: "8px",
                  backgroundImage:
                    "linear-gradient(rgb(234, 48, 25), rgb(234, 48, 25), rgba(234, 48, 25, 0.8))",
                  lineHeight: "20px",
                  fontWeight: 600,
                  color: "rgb(255, 255, 255)",
                  boxShadow:
                    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.157) 0px 2.66172px 9.32345px 0px, rgba(255, 255, 255, 0.125) 0px 1px 0px 0px inset, rgba(0, 0, 0, 0.1) 0px -1px 0px 0px inset",
                  outline: "transparent solid 2px",
                  outlineOffset: "2px",
                  transitionProperty: "all",
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  transitionDuration: "150ms",
                  transform: "matrix(1, 0, 0, 1, 0, 0.669138)",
                  textAlign: "center",
                  letterSpacing: "-0.16px",
                  fontFamily:
                    "Geist, sans-serif, ui-sans-serif, sans-serif, system-ui",
                }}
              >
                Acciones
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2">
              <DropdownMenuSection label="Neutral actions">
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(user.id || "");
                  }}
                  icon={
                    <svg
                      className="mt-0.5 size-4 text-[--menu-icon-color] group-data-[focused]/menu-item:text-[--menu-icon-hover-color]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 3.25H4.75C3.64543 3.25 2.75 4.14543 2.75 5.25V11.25C2.75 12.3546 3.64543 13.25 4.75 13.25H11.25C12.3546 13.25 13.25 12.3546 13.25 11.25V5.25C13.25 4.14543 12.3546 3.25 11.25 3.25H10M5.75 2.75L6.28576 4.0894C6.56615 4.79036 7.24504 5.25 8 5.25C8.75496 5.25 9.43385 4.79036 9.71424 4.0894L10.25 2.75H5.75Z"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                      <path
                        d="M5.5 7.75H10.5"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        opacity="0"
                        pathLength="1"
                        strokeDashoffset="0px"
                        strokeDasharray="0px 1px"
                      ></path>
                      <path
                        d="M5.5 10.25H8.5"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        opacity="0"
                        pathLength="1"
                        strokeDashoffset="0px"
                        strokeDasharray="0px 1px"
                      ></path>
                    </svg>
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-ceramic-label-2 text-[--menu-label-color]">
                      Copiar ID de usuario
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  as={Link}
                  to={`/admin/users/${user.id}`}
                  icon={
                    <svg
                      className="mt-0.5 size-4 text-[--menu-icon-color] group-data-[focused]/menu-item:text-[--menu-icon-hover-color]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M11.1786 12.1788C10.4001 11.3023 9.26453 10.75 8 10.75C6.73547 10.75 5.59993 11.3023 4.82141 12.1788M11.1786 12.1788C12.4375 11.2197 13.25 9.70474 13.25 8C13.25 5.10051 10.8995 2.75 8 2.75C5.10051 2.75 2.75 5.10051 2.75 8C2.75 9.70474 3.56251 11.2197 4.82141 12.1788M11.1786 12.1788C10.2963 12.8509 9.19476 13.25 8 13.25C6.80524 13.25 5.7037 12.8509 4.82141 12.1788M9.25 7C9.25 7.69036 8.69036 8.25 8 8.25C7.30964 8.25 6.75 7.69036 6.75 7C6.75 6.30964 7.30964 5.75 8 5.75C8.69036 5.75 9.25 6.30964 9.25 7Z"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-ceramic-label-2 text-[--menu-label-color]">
                      Ver perfil
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={
                    <svg
                      className="mt-0.5 size-4 text-[--menu-icon-color] group-data-[focused]/menu-item:text-[--menu-icon-hover-color]"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="var(--_ceramic-icon-fill, color-mix(in srgb, currentColor 15%, transparent))"
                      ></circle>
                      <path
                        d="M3.39786 13C2.98178 12.0858 2.75 11.07 2.75 10C2.75 5.99594 5.99594 2.75 10 2.75C14.0041 2.75 17.25 5.99594 17.25 10C17.25 11.07 17.0182 12.0858 16.6021 13"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="0.25 3"
                      ></path>
                      <circle
                        cx="10"
                        cy="8.5"
                        r="1.75"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></circle>
                      <path
                        d="M9.99986 12.75C7.08699 12.75 6.24655 13.723 5.27858 15.2106L5.16028 15.3982C6.4437 16.5496 8.14003 17.25 9.99995 17.25C11.8609 17.25 13.5581 16.5488 14.8418 15.3963L14.6957 15.1716C13.7383 13.706 12.8872 12.75 9.99986 12.75Z"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-ceramic-label-2 text-[--menu-label-color]">
                      Suplantar usuario
                    </span>
                    <span
                      className="relative inline-flex shrink-0 items-center rounded-sm text-ceramic-label-4 border border-dashed border-ceramic-blue/56 px-[calc(theme(spacing.1)-1px)] py-[calc(theme(spacing[0.5])-1px)] text-ceramic-info ceramic-icon-fill-blue/16"
                      data-slot="badge"
                    >
                      <span className="px-0.5">Add-on</span>
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuSection>
              <DropdownMenuSeparator />
              <DropdownMenuSection label="Destructive actions">
                <DropdownMenuItem
                  variant="negative"
                  icon={
                    <svg
                      className="mt-0.5 size-4 text-[--menu-icon-color] group-data-[focused]/menu-item:text-[--menu-icon-hover-color]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5.25 7.75H3.75V11.25C3.75 12.3546 4.64543 13.25 5.75 13.25H10.25C11.3546 13.25 12.25 12.3546 12.25 11.25V7.75H10.75M5.25 7.75V5.5C5.25 3.98122 6.48122 2.75 8 2.75C9.51878 2.75 10.75 3.98122 10.75 5.5V7.75M5.25 7.75H10.75"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-ceramic-label-2 text-[--menu-label-color]">
                      Bloquear
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="negative"
                  icon={
                    <svg
                      className="mt-0.5 size-4 text-[--menu-icon-color] group-data-[focused]/menu-item:text-[--menu-icon-hover-color]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.28769 4.28769L11.7123 11.7123M13.25 8C13.25 10.8995 10.8995 13.25 8 13.25C5.10051 13.25 2.75 10.8995 2.75 8C2.75 5.10051 5.10051 2.75 8 2.75C10.8995 2.75 13.25 5.10051 13.25 8Z"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-ceramic-label-2 text-[--menu-label-color]">
                      Banear
                    </span>
                    <span
                      className="relative inline-flex shrink-0 items-center rounded-sm text-ceramic-label-4 overflow-hidden px-1 py-0.5 text-ceramic-white shadow-[inset_0_2px_0_rgba(43,117,225,0.35)] ring-1 ring-inset ring-ceramic-black/[0.42] bg-[linear-gradient(120deg,rgb(73,90,193)_0%,rgb(64,63,115)_16%,rgb(99,131,162)_50%,rgb(81,36,82)_87%,rgb(132,61,112)_100%)]"
                      data-slot="badge"
                    >
                      <span className="px-0.5">Pro</span>
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="negative"
                  icon={
                    <svg
                      className="overflow-visible mt-0.5 size-4 text-[--menu-icon-color] group-data-[focused]/menu-item:text-[--menu-icon-hover-color]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M13.5 5.25H12.5H10.5M3 5.25H4H6M6 5.25V4.75C6 3.64543 6.89543 2.75 8 2.75H8.5C9.60457 2.75 10.5 3.64543 10.5 4.75V5.25M6 5.25H10.5"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: "none",
                          transformOrigin: "50% 50%",
                          transformBox: "fill-box",
                        }}
                      ></path>
                      <path
                        d="M13.5 5.25H12.5L11.6095 12.374C11.5469 12.8745 11.1215 13.25 10.6172 13.25H5.88278C5.37846 13.25 4.95306 12.8745 4.8905 12.374L4 5.25H3"
                        stroke="var(--_ceramic-icon-stroke)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  }
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-ceramic-label-2 text-[--menu-label-color]">
                      Eliminar usuario
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuSection>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="mt-6 flex items-center gap-6 border-b border-white/10"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        <span
          className="text-sm text-white pb-3 border-b-2 border-white"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          Perfil
        </span>
      </div>

      {/* Content */}
      <div
        className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        {/* Left column */}
        <div
          className="space-y-6"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          {/* Activity Heatmap */}
          <ActivityHeatmap
            activityMap={activityMap}
            loading={activityLoading}
          />

          {/* Personal info */}
          <div
            className="bg-[#15161a] border border-white/10 rounded-xl p-5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <h3
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              Información personal
            </h3>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <div>
                <label
                  className="text-xs text-gray-500 block mb-1"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  First name
                </label>
                <div
                  className="rounded-lg bg-[#0f0f0f] border border-white/10 px-3 py-2 text-sm text-gray-300"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  {user.first_name || "-"}
                </div>
              </div>
              <div>
                <label
                  className="text-xs text-gray-500 block mb-1"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Last name
                </label>
                <div
                  className="rounded-lg bg-[#0f0f0f] border border-white/10 px-3 py-2 text-sm text-gray-300"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  {user.last_name || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Email addresses */}
          <div
            className="bg-[#15161a] border border-white/10 rounded-xl p-5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <h3
              className="text-sm font-semibold text-white mb-4"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              Direcciones de correo
            </h3>
            <div
              className="flex items-center justify-between gap-3 text-sm"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <div
                className="flex items-center gap-3"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                <svg
                  className="w-4 h-4 text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span
                  className="text-gray-300"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  {userEmail}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/20 text-green-400"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Principal
                </span>
              </div>
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-between rounded-md p-1 text-gray-200 hover:bg-white/10 data-[state=open]:bg-white/10"
                      aria-label="Acciones"
                    >
                      <span className="flex items-center whitespace-nowrap p-1">
                        <span>
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                            className="w-4 h-4"
                          >
                            <path
                              d="M4 8.01001V8.02001"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            ></path>
                            <path
                              d="M8 8V8.01"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            ></path>
                            <path
                              d="M12 8V8.01"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            ></path>
                          </svg>
                        </span>
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="mt-2" align="end" maxHeight="336px">
                    <DropdownMenuSection label="Neutral actions">
                      <DropdownMenuItem
                        aria-disabled="true"
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-ceramic-label-2 text-[--menu-label-color]">
                            Establecer como principal
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <div className="flex items-baseline gap-2">
                          <span className="text-ceramic-label-2 text-[--menu-label-color]">
                            Marcar como no verificado
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuSection>
                    <DropdownMenuSeparator className="my-[--menu-p] h-px bg-white/10" />
                    <DropdownMenuSection label="Destructive actions">
                      <DropdownMenuItem variant="negative">
                        <div className="flex items-baseline gap-2">
                          <span className="text-ceramic-label-2 text-[--menu-label-color]">
                            Eliminar email
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuSection>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Password */}
          <div
            className="bg-[#15161a] border border-white/10 rounded-xl p-5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <div
              className="flex items-center justify-between"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <h3
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                Contraseña
              </h3>
              <button
                type="button"
                className="text-xs text-purple-400 hover:text-purple-300"
                onClick={() => setModal("password")}
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                + Configurar contraseña
              </button>
            </div>
            <div
              className="mt-3 text-sm text-gray-500 text-center py-2"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              ••••••••
            </div>
          </div>

          {/* Devices */}
          <section
            className="bg-[#111216] border border-white/10 rounded-2xl"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <header
              className="flex items-center justify-between px-6 py-4"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <div
                className="min-w-0 flex-1"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                <h3
                  className="text-base font-medium text-white"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Dispositivos
                </h3>
              </div>
            </header>
            <div className="px-6 pb-6">
              <div className="overflow-hidden rounded-xl bg-[#1b1c21] border border-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_1px_3px_rgba(0,0,0,0.4)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed text-left">
                    <thead className="sr-only">
                      <tr>
                        <th>Dispositivo</th>
                        <th>IP y ubicación</th>
                        <th>Fecha agregada</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#1b1c21]">
                      {sessions.length === 0 ? (
                        <tr>
                          <td
                            className="px-6 py-5 text-xs text-gray-500"
                            colSpan={4}
                          >
                            Sin dispositivos.
                          </td>
                        </tr>
                      ) : (
                        sessions.map((session, index) => (
                          <tr
                            key={session.id}
                            className="border-t border-white/10"
                          >
                            <td
                              className={`px-6 py-4 ${index === 0 ? "border-t-0" : ""}`}
                            >
                              <div className="flex items-center gap-3">
                                <svg
                                  className="size-10"
                                  viewBox="0 0 40 40"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M3.63672 9.31535C3.63672 8.58921 3.7324 8.27801 3.92379 7.9668C4.16302 7.70747 4.49797 7.5 5.26352 7.5H34.785C35.4549 7.5 35.742 7.6556 35.9812 7.91494C36.2204 8.17427 36.3161 8.53734 36.3161 9.31535V30.5809C36.3161 31.3071 36.2204 31.6183 36.0769 31.8257C35.9557 32.0044 35.797 32.1493 35.614 32.2485C35.431 32.3477 35.2289 32.3983 35.0243 32.3963H4.88073C4.49795 32.3963 4.11518 32.2407 3.92379 31.8776C3.7324 31.6701 3.63672 31.3589 3.63672 30.5809V9.31535Z"
                                    fill="black"
                                  ></path>
                                  <path
                                    d="M4.30659 31.6677H35.6463C35.7898 31.6677 35.9334 31.564 36.0291 31.4603C36.1248 31.3565 36.1248 31.2009 36.1248 30.7341V9.31297C36.1248 8.69056 36.0769 8.27562 35.8377 8.06815C35.5984 7.80881 35.3592 7.70508 34.785 7.70508H5.26353C4.64152 7.70508 4.30659 7.86068 4.06736 8.12002C3.87597 8.32749 3.82813 8.63869 3.82813 9.31297V30.7341C3.82813 31.2009 3.8281 31.3565 3.9238 31.4603C4.01949 31.564 4.16305 31.6677 4.30659 31.6677Z"
                                    fill="#575757"
                                  ></path>
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M19.9983 8.63976C20.0199 8.65531 20.045 8.66422 20.0709 8.66553C20.0969 8.66684 20.1226 8.6605 20.1455 8.6472C20.1684 8.63389 20.1875 8.61412 20.2008 8.58998C20.2141 8.56583 20.2212 8.53823 20.2212 8.51009C20.2212 8.48196 20.2141 8.45435 20.2008 8.43021C20.1875 8.40607 20.1684 8.38629 20.1455 8.37299C20.1226 8.35969 20.0969 8.35335 20.0709 8.35466C20.045 8.35597 20.0199 8.36487 19.9983 8.38043C19.9766 8.36487 19.9515 8.35597 19.9256 8.35466C19.8997 8.35335 19.8739 8.35969 19.8511 8.37299C19.8282 8.38629 19.8091 8.40607 19.7957 8.43021C19.7824 8.45435 19.7754 8.48196 19.7754 8.51009C19.7754 8.53823 19.7824 8.56583 19.7957 8.58998C19.8091 8.61412 19.8282 8.63389 19.8511 8.6472C19.8739 8.6605 19.8997 8.66684 19.9256 8.66553C19.9515 8.66422 19.9766 8.65531 19.9983 8.63976Z"
                                    fill="black"
                                    stroke="black"
                                    strokeWidth="0.375"
                                  ></path>
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M0 31.8755V31.6162H40V31.8755C40 31.8755 39.0909 32.1868 38.0861 32.2905C37.4163 32.3424 36.3158 32.498 33.8277 32.498H6.36363C4.21052 32.498 2.39234 32.3424 1.57894 32.2386C0.765544 32.1349 0 31.8755 0 31.8755Z"
                                    fill="#444444"
                                  ></path>
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M4.92578 9.16016H35.0693V29.5958H4.92578V9.16016Z"
                                    fill="black"
                                  ></path>
                                </svg>
                                <div>
                                  <div className="flex items-center gap-2 text-sm text-gray-200">
                                    {parseUA(session.user_agent)}
                                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                      Activo
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    {parseBrowser(session.user_agent)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 w-[40%]">
                              {session.ip
                                ? session.location
                                  ? `${session.ip} (${session.location})`
                                  : session.ip
                                : "-"}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 w-[20%]">
                              {session.first_seen_at
                                ? formatSessionTime(session.first_seen_at)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 text-right w-[10%]">
                              <div
                                className="relative inline-flex"
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-between rounded-md p-1 text-gray-200 hover:bg-white/10 data-[state=open]:bg-white/10"
                                      aria-label="Acciones"
                                    >
                                      <span className="flex items-center whitespace-nowrap p-1">
                                        <span>
                                          <svg
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            aria-hidden="true"
                                            className="w-4 h-4"
                                          >
                                            <path
                                              d="M4 8.01001V8.02001"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            ></path>
                                            <path
                                              d="M8 8V8.01"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            ></path>
                                            <path
                                              d="M12 8V8.01"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            ></path>
                                          </svg>
                                        </span>
                                      </span>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="p-1" align="end">
                                    <DropdownMenuSection label="Destructive actions">
                                      <DropdownMenuItem variant="negative">
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-ceramic-label-2 text-[--menu-label-color]">
                                            Revocar dispositivo
                                          </span>
                                        </div>
                                      </DropdownMenuItem>
                                    </DropdownMenuSection>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <aside
          className="space-y-5"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          <div
            className="bg-[#1b1c21] border border-white/10 rounded-xl p-4"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <dl
              className="border-b border-white/10 pb-3"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <div className="pb-3">
                <dt
                  className="mb-1 text-xs font-medium text-gray-500"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  ID de usuario
                </dt>
                <dd className="flex items-center gap-2">
                  <div
                    className="flex-1 overflow-hidden text-sm text-gray-200"
                    style={{ fontFamily: "'Geist', sans-serif" }}
                  >
                    <code
                      className="font-mono text-sm"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      <abbr
                        title={user.id}
                        className="underline decoration-dotted"
                        style={{ fontFamily: "'Geist', sans-serif" }}
                      >
                        {truncateId(user.id)}
                      </abbr>
                    </code>
                  </div>
                  <CopyButton text={user.id} />
                </dd>
              </div>

              <div className="border-t border-white/10 pt-4 pb-3">
                <dt
                  className="mb-1 text-xs font-medium text-gray-500"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Email principal
                </dt>
                <dd className="flex items-center gap-2">
                  <div
                    className="flex-1 overflow-hidden text-sm text-gray-200"
                    style={{ fontFamily: "'Geist', sans-serif" }}
                  >
                    <span
                      className="block truncate"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      {userEmail}
                    </span>
                  </div>
                  <CopyButton text={userEmail} />
                </dd>
              </div>

              <div className="border-t border-white/10 pt-4 pb-3">
                <dt
                  className="mb-1 text-xs font-medium text-gray-500"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Usuario desde
                </dt>
                <dd
                  className="text-sm text-gray-200"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  {formatDate(user.created_at)}
                </dd>
              </div>

              <div className="border-t border-white/10 pt-4 pb-3">
                <dt
                  className="mb-1 text-xs font-medium text-gray-500"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  MRR
                </dt>
                <dd
                  className="text-sm text-gray-200"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  $0.00
                </dd>
              </div>

              <div className="border-t border-white/10 pt-4 pb-3">
                <dt
                  className="mb-1 text-xs font-medium text-gray-500"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Ingresos de por vida
                </dt>
                <dd
                  className="text-sm text-gray-200"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  $0.00
                </dd>
              </div>

              <div className="border-t border-white/10 pt-4">
                <dt
                  className="mb-1 text-xs font-medium text-gray-500"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  LTV estimado
                </dt>
                <dd
                  className="text-sm text-gray-200"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  $0.00
                </dd>
              </div>
            </dl>

            <dl className="pt-4" style={{ fontFamily: "'Geist', sans-serif" }}>
              <div
                className="text-xs text-gray-500"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                <dt
                  className="inline"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Perfil actualizado{" "}
                </dt>
                <dd
                  className="inline text-gray-200"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  {user.updated_at ? formatRelative(user.updated_at) : "-"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Workspaces */}
          <div
            className="bg-[#15161a] border border-white/10 rounded-xl p-5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <div
              className="text-xs text-gray-500 mb-3"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              Espacios de trabajo ({workspaces.length})
            </div>
            {workspaces.length === 0 ? (
              <div
                className="text-sm text-gray-500"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                Sin espacios de trabajo.
              </div>
            ) : (
              <ul
                className="space-y-2"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                {workspaces.map((ws) => (
                  <li key={ws.id} style={{ fontFamily: "'Geist', sans-serif" }}>
                    <div
                      className="text-sm text-gray-200 font-medium"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      {ws.slug}
                    </div>
                    <div
                      className="text-xs text-gray-500 truncate"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      {ws.url}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── utils ── */
function truncateId(id) {
  if (!id) return "-";
  const s = String(id);
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}…${s.slice(-8)}`;
}

function parseUA(ua) {
  if (!ua) return "Unknown";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) return "Macintosh";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  return "Unknown";
}

function parseBrowser(ua) {
  if (!ua) return "Unknown";
  const edge = ua.match(/Edg\/([\d.]+)/);
  if (edge) return `Edge ${edge[1]}`;
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  if (chrome) return `Chrome ${chrome[1]}`;
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  if (firefox) return `Firefox ${firefox[1]}`;
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  if (safari) return `Safari ${safari[1]}`;
  const electron = ua.match(/Electron\/([\d.]+)/);
  if (electron) return `Electron ${electron[1]}`;
  return "Unknown";
}
