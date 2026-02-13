import React from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../api/fetchWithAuth";
import { AdminFullScreenSpinner } from "../components/LoadingSpinner";

/* ── helpers ── */
const FONT = { fontFamily: "'Geist', sans-serif" };
const MONO = { fontFamily: "'Geist Mono', monospace" };

function getUserActivityStats(users) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  let total = 0,
    today = 0,
    last7 = 0,
    last30 = 0,
    neverLoggedIn = 0;
  for (const u of users) {
    total++;
    if (u.last_sign_in_at) {
      const last = Number(u.last_sign_in_at);
      if (!isNaN(last)) {
        if (last >= startOfToday.getTime()) today++;
        if (last >= sevenDaysAgo) last7++;
        if (last >= thirtyDaysAgo) last30++;
      }
    } else {
      neverLoggedIn++;
    }
  }
  return { total, today, last7, last30, neverLoggedIn };
}

function getUserEmail(user) {
  return user.email_addresses?.[0]?.email_address || user.email || "";
}

function getUserName(user) {
  if (user.first_name || user.last_name)
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return user.name || getUserEmail(user);
}

function getInitials(name, email) {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function fmtNum(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString("es-AR");
}

function fmtCurrency(n) {
  if (n == null) return "$0";
  return `$${Number(n).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ── Metric Card ── */
function MetricCard({ label, value, sub, icon, trend, trendUp }) {
  return (
    <div style={FONT} className="bg-[#15161a] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        {icon && <div className="text-gray-600">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-white">{value}</div>
        {trend != null && (
          <span
            className={`text-xs font-medium ${trendUp ? "text-emerald-400" : "text-red-400"}`}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ children, icon }) {
  return (
    <h2 style={FONT} className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
      {icon}
      {children}
    </h2>
  );
}

/* ── Alert Row ── */
function AlertRow({ severity, message, time, action }) {
  const colors = {
    critical: "bg-red-500/10 border-red-500/30 text-red-400",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };
  const dotColors = {
    critical: "bg-red-400",
    warning: "bg-amber-400",
    info: "bg-blue-400",
  };
  return (
    <div
      style={FONT}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[severity] || colors.info}`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${dotColors[severity] || dotColors.info}`}
      />
      <span className="text-sm flex-1">{message}</span>
      {time && <span className="text-xs opacity-60 shrink-0">{time}</span>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={FONT}
          className="text-xs font-medium underline underline-offset-2 shrink-0 hover:opacity-80"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ── Mini bar for top usage ── */
function UsageBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          background:
            "linear-gradient(to right, rgb(234, 48, 25), rgba(234, 48, 25, 0.8))",
          width: `${pct}%`,
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════ */
export default function AdminOverview() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [metricsRes, usersRes] = await Promise.all([
          fetchWithAuth("/admin/metrics"),
          fetchWithAuth("/admin/users"),
        ]);
        let metricsJson = {},
          usersJson = {};
        if (metricsRes)
          metricsJson = await metricsRes.json().catch(() => ({}));
        if (usersRes) usersJson = await usersRes.json().catch(() => ({}));
        if (!cancelled) {
          if (metricsJson.success) setMetrics(metricsJson.data || {});
          else setError(metricsJson.error || "Error");
          if (usersJson.success)
            setUsers(Array.isArray(usersJson.data) ? usersJson.data : []);
        }
      } catch {
        if (!cancelled) setError("Error al cargar métricas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <AdminFullScreenSpinner />;
  if (error)
    return (
      <div style={FONT} className="text-sm text-red-400 py-10">
        {error}
      </div>
    );

  const llm = metrics?.llm || {};
  const images = metrics?.images || {};
  const credits = metrics?.credits || {};
  const revenue = metrics?.revenue || {};
  const topUsers = metrics?.topUsers || [];
  const topFeatures = metrics?.topFeatures || [];
  const alerts = metrics?.alerts || [];
  const userStats = getUserActivityStats(users);

  /* Computed error rates */
  const totalLlm = (llm.successCount || 0) + (llm.failureCount || 0);
  const llmErrorRate =
    totalLlm > 0 ? ((llm.failureCount || 0) / totalLlm) * 100 : 0;

  const totalImg = (images.successCount || 0) + (images.failureCount || 0);
  const imgErrorRate =
    totalImg > 0 ? ((images.failureCount || 0) / totalImg) * 100 : 0;

  /* Build alerts list (API alerts + auto-detected) */
  const allAlerts = [...alerts];

  if (llmErrorRate > 10) {
    allAlerts.push({
      severity: "critical",
      message: `Tasa de error LLM elevada: ${llmErrorRate.toFixed(1)}% (${fmtNum(llm.failureCount)} fallidas de ${fmtNum(totalLlm)})`,
    });
  }
  if (imgErrorRate > 10) {
    allAlerts.push({
      severity: "critical",
      message: `Tasa de error imágenes elevada: ${imgErrorRate.toFixed(1)}% (${fmtNum(images.failureCount)} fallidas de ${fmtNum(totalImg)})`,
    });
  }


  /* Top users by consumption */
  const computedTopUsers =
    topUsers.length > 0
      ? topUsers
      : [...users]
        .filter((u) => (u.credits_used ?? u.usage ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.credits_used ?? b.usage ?? 0) -
            (a.credits_used ?? a.usage ?? 0),
        )
        .slice(0, 5);

  const maxUsage =
    computedTopUsers.length > 0
      ? Math.max(
        ...computedTopUsers.map((u) => u.credits_used ?? u.usage ?? 0),
      )
      : 1;

  return (
    <div style={FONT}>
      <h1 style={FONT} className="text-2xl font-semibold text-white mb-8">Resumen</h1>

      {/* ════════ ALERTAS ════════ */}
      {allAlerts.length > 0 && (
        <div className="mb-8">
          <SectionHeader
            icon={
              <svg
                className="w-4 h-4 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            }
          >
            Alertas ({allAlerts.length})
          </SectionHeader>
          <div className="space-y-2">
            {allAlerts.map((alert, i) => (
              <AlertRow
                key={i}
                severity={alert.severity || "info"}
                message={alert.message}
                time={alert.time}
                action={
                  alert.actionLabel
                    ? {
                      label: alert.actionLabel,
                      onClick: () =>
                        alert.actionUrl && navigate(alert.actionUrl),
                    }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ════════ USUARIOS ════════ */}
      <SectionHeader
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      >
        Usuarios
      </SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Totales" value={fmtNum(userStats.total)} />
        <MetricCard label="Activos hoy" value={fmtNum(userStats.today)} />
        <MetricCard label="Activos 7 días" value={fmtNum(userStats.last7)} />
        <MetricCard label="Activos 30 días" value={fmtNum(userStats.last30)} />
      </div>

      {/* ════════ CRÉDITOS ════════ */}
      <SectionHeader
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        }
      >
        Créditos
      </SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Emitidos"
          value={fmtNum(credits.issued ?? 0)}
          sub={credits.issuedPeriod || "total"}
        />
        <MetricCard
          label="Consumidos"
          value={fmtNum(credits.consumed ?? 0)}
          sub={
            credits.issued > 0
              ? `${(((credits.consumed || 0) / credits.issued) * 100).toFixed(1)}% del total`
              : undefined
          }
        />
        <MetricCard
          label="Disponibles"
          value={fmtNum(
            (credits.issued ?? 0) -
            (credits.consumed ?? 0) -
            (credits.expired ?? 0),
          )}
        />
        <MetricCard
          label="Vencidos"
          value={fmtNum(credits.expired ?? 0)}
          sub={credits.expired > 0 ? "requiere atención" : undefined}
        />
      </div>

      {/* ════════ INGRESOS ════════ */}
      <SectionHeader
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      >
        Ingresos
      </SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="MRR"
          value={fmtCurrency(revenue.mrr ?? 0)}
          trend={revenue.mrrTrend}
          trendUp={revenue.mrrTrendUp}
        />
        <MetricCard
          label="Recargas"
          value={fmtCurrency(revenue.recharges ?? 0)}
          sub={
            revenue.rechargeCount != null
              ? `${fmtNum(revenue.rechargeCount)} transacciones`
              : undefined
          }
        />
        <MetricCard
          label="Planes / Suscripciones"
          value={fmtCurrency(revenue.subscriptions ?? 0)}
          sub={
            revenue.activeSubscribers != null
              ? `${fmtNum(revenue.activeSubscribers)} suscriptores activos`
              : undefined
          }
        />
        <MetricCard
          label="ARPU"
          value={fmtCurrency(revenue.arpu ?? 0)}
          sub="ingreso promedio por usuario"
        />
      </div>

      {/* ════════ LLM ════════ */}
      <SectionHeader
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        }
      >
        Métricas LLM
      </SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Solicitudes totales"
          value={fmtNum(llm.totalRequests ?? 0)}
        />
        <MetricCard label="Exitosas" value={fmtNum(llm.successCount ?? 0)} />
        <MetricCard
          label="Fallidas"
          value={fmtNum(llm.failureCount ?? 0)}
          sub={
            totalLlm > 0
              ? `${llmErrorRate.toFixed(1)}% tasa de error`
              : undefined
          }
        />
        <MetricCard
          label="Latencia promedio"
          value={llm.avgLatency ? `${Math.round(llm.avgLatency)}ms` : "-"}
        />
      </div>

      {/* ════════ IMÁGENES ════════ */}
      <SectionHeader
        icon={
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        }
      >
        Métricas de imágenes
      </SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total generadas"
          value={fmtNum(images.totalGenerated ?? 0)}
        />
        <MetricCard
          label="Exitosas"
          value={fmtNum(images.successCount ?? 0)}
        />
        <MetricCard
          label="Fallidas"
          value={fmtNum(images.failureCount ?? 0)}
          sub={
            totalImg > 0
              ? `${imgErrorRate.toFixed(1)}% tasa de error`
              : undefined
          }
        />
        <MetricCard
          label="Latencia promedio"
          value={
            images.avgLatency ? `${Math.round(images.avgLatency)}ms` : "-"
          }
        />
      </div>

      {/* ════════ TOP USUARIOS + TOP FEATURES ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top usuarios por consumo */}
        <div className="bg-[#15161a] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={FONT} className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              Top usuarios por consumo
            </h3>
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="text-xs transition-colors bg-clip-text text-transparent bg-gradient-to-r from-[rgb(234,48,25)] to-[rgba(234,48,25,0.8)] hover:opacity-80"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(234, 48, 25), rgba(234, 48, 25, 0.8))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                ...FONT
              }}
            >
              Ver todos →
            </button>
          </div>

          {computedTopUsers.length === 0 ? (
            <div style={FONT} className="text-sm text-gray-600 text-center py-6">
              Sin datos de consumo aún.
            </div>
          ) : (
            <div className="space-y-3">
              {computedTopUsers.map((u, i) => {
                const name = getUserName(u);
                const email = getUserEmail(u);
                const initials = getInitials(name, email);
                const usage = u.credits_used ?? u.usage ?? 0;
                return (
                  <div
                    key={u.id || i}
                    style={FONT}
                    className="flex items-center gap-3 group cursor-pointer"
                    onClick={() => u.id && navigate(`/admin/users/${u.id}`)}
                  >
                    <span className="text-xs text-gray-600 w-5 text-right font-medium tabular-nums">
                      {i + 1}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-gray-400 shrink-0 group-hover:bg-white/15 transition-colors">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">
                          {name}
                        </span>
                        <span className="text-xs text-gray-500 tabular-nums ml-2 shrink-0">
                          {fmtNum(usage)}
                        </span>
                      </div>
                      <UsageBar value={usage} max={maxUsage} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top features consumidas */}
        <div className="bg-[#15161a] border border-white/10 rounded-xl p-5">
          <h3 style={FONT} className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
            Top features consumidas
          </h3>

          {topFeatures.length === 0 ? (
            <div style={FONT} className="text-sm text-gray-600 text-center py-6">
              Sin datos de features aún.
              <div className="text-xs text-gray-700 mt-2">
                Incluí{" "}
                <code className="text-gray-500" style={MONO}>
                  topFeatures
                </code>{" "}
                en{" "}
                <code className="text-gray-500" style={MONO}>
                  /admin/metrics
                </code>{" "}
                para poblar esta sección.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {topFeatures.slice(0, 8).map((f, i) => {
                const featureMax = topFeatures[0]?.count || 1;
                return (
                  <div key={f.name || i} style={FONT} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-5 text-right font-medium tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">
                          {f.label || f.name}
                        </span>
                        <span className="text-xs text-gray-500 tabular-nums ml-2">
                          {fmtNum(f.count)}
                        </span>
                      </div>
                      <UsageBar value={f.count} max={featureMax} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
