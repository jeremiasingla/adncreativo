import React from "react";
import { fetchWithAuth } from "../api/fetchWithAuth";
import { AdminFullScreenSpinner } from "../components/LoadingSpinner";

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-[#15161a] border border-white/10 rounded-xl p-5">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [metrics, setMetrics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchWithAuth("/admin/metrics");
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (json.success) setMetrics(json.data || {});
          else setError(json.error || "Error");
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
  if (error) return <div className="text-sm text-red-400 py-10">{error}</div>;

  const llm = metrics?.llm || {};
  const images = metrics?.images || {};

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-8">Resumen</h1>

      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Métricas LLM
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Solicitudes totales"
          value={llm.totalRequests ?? 0}
        />
        <MetricCard label="Exitosas" value={llm.successCount ?? 0} />
        <MetricCard label="Fallidas" value={llm.failureCount ?? 0} />
        <MetricCard
          label="Latencia promedio"
          value={llm.avgLatency ? `${Math.round(llm.avgLatency)}ms` : "-"}
        />
      </div>

      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Métricas de imágenes
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total generadas"
          value={images.totalGenerated ?? 0}
        />
        <MetricCard label="Exitosas" value={images.successCount ?? 0} />
        <MetricCard label="Fallidas" value={images.failureCount ?? 0} />
        <MetricCard
          label="Latencia promedio"
          value={images.avgLatency ? `${Math.round(images.avgLatency)}ms` : "-"}
        />
      </div>

      {metrics && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
            JSON sin procesar
          </summary>
          <pre className="mt-2 text-xs text-gray-400 bg-[#15161a] border border-white/10 rounded-xl p-4 overflow-auto max-h-96">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
