import React from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../api/fetchWithAuth";
import { AdminFullScreenSpinner } from "../components/LoadingSpinner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSection,
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

function getInitials(name, email) {
  const source = (name || email || "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);


  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchWithAuth("/admin/users");
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (json.success) setUsers(Array.isArray(json.data) ? json.data : []);
          else setError(json.error || "Error al cargar usuarios");
        }
      } catch {
        if (!cancelled) setError("Error al cargar usuarios");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);



  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = getUserEmail(u);
      const name = getUserName(u);
      return `${email} ${name} ${u.id || ""}`.toLowerCase().includes(q);
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pageUsers = filtered.slice(startIdx, startIdx + perPage);

  React.useEffect(() => {
    setPage(1);
  }, [search, perPage]);

  return (
    <div style={{ fontFamily: "'Geist', sans-serif !important" }}>
      {/* ...existing code... */}
      <h1
        className="text-2xl font-semibold text-white mb-8"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        Usuarios
      </h1>

      {/* Search + filter */}
      <div
        className="flex items-center gap-3 mb-6"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        <div
          className="relative flex-1 max-w-md"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-full rounded-lg bg-[#1a1a1f] border border-white/10 pl-10 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            style={{ fontFamily: "'Geist', sans-serif" }}
          />
        </div>
        <button
          type="button"
          className="p-2 rounded-lg border border-white/10 bg-[#1a1a1f] text-gray-400 hover:text-white transition-colors"
          title="Filtros"
        >
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </button>
      </div>

      {/* Table */}
      <div
        className="bg-[#15161a] rounded-xl border border-white/10 overflow-hidden"
        style={{ fontFamily: "'Geist', sans-serif" }}
      >
        {/* Header row */}
        <div
          className="grid grid-cols-[1fr_200px_200px_40px] gap-4 px-6 py-3 text-xs text-gray-500 uppercase tracking-wide border-b border-white/10"
          style={{ fontFamily: "'Geist', sans-serif" }}
        >
          <span style={{ fontFamily: "'Geist', sans-serif" }}>Usuario</span>
          <span style={{ fontFamily: "'Geist', sans-serif" }}>
            Último ingreso
          </span>
          <span
            className="flex items-center gap-1"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            Registrado
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
          </span>
          <span />
        </div>

        {loading ? (
          <AdminFullScreenSpinner />
        ) : error ? (
          <div
            className="px-6 py-10 text-sm text-red-400 text-center"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            {error}
          </div>
        ) : pageUsers.length === 0 ? (
          <div
            className="px-6 py-10 text-sm text-gray-500 text-center"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            No se encontraron usuarios.
          </div>
        ) : (
          <div
            className="divide-y divide-white/5"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            {pageUsers.map((user) => {
              const userName = getUserName(user);
              const userEmail = getUserEmail(user);
              const initials = getInitials(userName, userEmail);
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_200px_200px_40px] gap-4 items-center px-6 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  <div
                    className="flex items-center gap-3 min-w-0"
                    style={{ fontFamily: "'Geist', sans-serif" }}
                  >
                    <div
                      className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      {initials}
                    </div>
                    <div
                      className="min-w-0"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      <div
                        className="text-sm font-medium text-gray-100 truncate"
                        style={{ fontFamily: "'Geist', sans-serif" }}
                      >
                        {userName}
                      </div>
                      <div
                        className="text-xs text-gray-500 truncate"
                        style={{ fontFamily: "'Geist', sans-serif" }}
                      >
                        {userEmail}
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-sm text-gray-400"
                    style={{ fontFamily: "'Geist', sans-serif" }}
                  >
                    {user.last_sign_in_at
                      ? formatDate(user.last_sign_in_at)
                      : "-"}
                  </div>
                  <div
                    className="text-sm text-gray-400"
                    style={{ fontFamily: "'Geist', sans-serif" }}
                  >
                    {formatDate(user.created_at)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors data-[state=open]:bg-white/10 data-[state=open]:text-gray-300"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <circle cx="10" cy="4" r="1.5" />
                          <circle cx="10" cy="10" r="1.5" />
                          <circle cx="10" cy="16" r="1.5" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSection label="Acciones">
                        <DropdownMenuItem
                          onClick={() => {
                            navigate(`/admin/users/${user.id}`);
                          }}
                        >
                          <div
                            className="flex items-baseline gap-2"
                            style={{ fontFamily: "'Geist', sans-serif" }}
                          >
                            <span
                              className="text-sm"
                              style={{ fontFamily: "'Geist', sans-serif" }}
                            >
                              Ver perfil
                            </span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuSection>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div
            className="px-6 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            <div
              className="flex items-center gap-4"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <span style={{ fontFamily: "'Geist', sans-serif" }}>
                {startIdx + 1}–{Math.min(startIdx + perPage, filtered.length)}{" "}
                de {filtered.length}
              </span>
              <div
                className="flex items-center gap-2"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                <span style={{ fontFamily: "'Geist', sans-serif" }}>
                  Resultados por página
                </span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="bg-[#1a1a1f] border border-white/10 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option
                      key={n}
                      value={n}
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(1)}
                className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                «
              </button>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                ‹
              </button>
              <span
                className="px-3 py-1 rounded bg-white/10 text-gray-300"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                ›
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(totalPages)}
                className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Geist', sans-serif" }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
