/**
 * Métricas de admistración (LLM, Imágenes, Créditos, Revenue).
 * Lee y escribe directamente en Postgres.
 */
import { query } from "../db/postgres.js";

/**
 * Registra una llamada LLM con su costo.
 * @param {object} opts
 * @param {string} opts.model - Modelo usado
 * @param {number} opts.promptTokens - Tokens del prompt
 * @param {number} opts.completionTokens - Tokens de la respuesta
 * @param {number} opts.totalCost - Costo total en USD (si es 0, se calcula)
 * @param {number} opts.durationMs - Duración en ms
 * @param {string} [opts.source] - Origen: "branding" | "profiles" | "headlines" | "creative_image"
 * @param {string} [opts.workspaceSlug] - Slug del workspace relacionado
 */
export async function recordLLMRequest({
  model,
  promptTokens,
  completionTokens,
  totalCost = 0,
  durationMs,
  source = "unknown",
  workspaceSlug = null,
}) {
  try {
    const user_id = "system"; // TODO: Si tuviéramos acceso al requerimiento actual, podríamos guardar el user_id

    await query(
      `INSERT INTO llm_request_logs 
       (user_id, feature_name, status, latency_ms, tokens_used, credits_cost, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        user_id,
        source, // feature_name
        "success", // status
        durationMs,
        promptTokens + completionTokens,
        0, // credits_cost (calcular si aplica)
        null // error_message
      ]
    );

    if (process.env.NODE_ENV !== "production" || process.env.LOG_METRICS === "1") {
      console.log(
        `[Metrics] LLM Request - ${source} | Model: ${model} | Tokens: ${promptTokens + completionTokens} | Cost: $${totalCost.toFixed(6)} | Duration: ${durationMs}ms`
      );
    }
  } catch (err) {
    console.error("❌ Error recording LLM metrics:", err.message);
  }
}

/**
 * Registra una generación de imagen.
 * @param {object} opts
 * @param {string} opts.model - Modelo usado (ej. imagen-3.0-generate-001).
 * @param {string} opts.size - Tamaño o aspect ratio.
 * @param {string} [opts.aspectRatio] - Aspect ratio solicitado.
 * @param {number} opts.durationMs - Tiempo de generación en ms.
 * @param {string} [opts.source] - Origen.
 * @param {number} [opts.estimatedUsd] - Costo estimado o real
 */
export async function recordImageGeneration({
  model,
  size,
  aspectRatio,
  durationMs,
  source = "creative",
  estimatedUsd = null,
}) {
  try {
    const user_id = "system";
    const cost = estimatedUsd ?? 0.03;

    await query(
      `INSERT INTO image_generation_logs
       (user_id, feature_name, status, latency_ms, credits_cost, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        user_id,
        source,
        "success",
        durationMs,
        5, // credits_cost default
        null
      ]
    );

    if (process.env.NODE_ENV !== "production" || process.env.LOG_METRICS === "1") {
      console.log(
        `[Metrics] Image Gen - ${source} | Model: ${model} | Size: ${size} | Cost: $${cost.toFixed(4)} | Duration: ${durationMs}ms`
      );
    }
  } catch (err) {
    console.error("❌ Error recording Image metrics:", err.message);
  }
}

/**
 * Devuelve todas las métricas del dashboard admin.
 * Consulta la base de datos para cada sección.
 */
export async function getAllMetrics() {
  // LLM
  let llm = {
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    avgLatency: 0,
  };
  try {
    const res = await query(`
      SELECT
        COUNT(*) AS "totalRequests",
        COUNT(*) FILTER (WHERE status = 'success') AS "successCount",
        COUNT(*) FILTER (WHERE status != 'success') AS "failureCount",
        COALESCE(ROUND(AVG(latency_ms)::numeric, 1), 0) AS "avgLatency"
      FROM llm_request_logs;
    `);
    if (res.rows && res.rows[0]) {
      llm = {
        totalRequests: Number(res.rows[0].totalRequests),
        successCount: Number(res.rows[0].successCount),
        failureCount: Number(res.rows[0].failureCount),
        avgLatency: Number(res.rows[0].avgLatency),
      };
    }
  } catch (e) { console.error("Metrics LLM:", e.message); }

  // Images
  let images = {
    totalGenerated: 0,
    successCount: 0,
    failureCount: 0,
    avgLatency: 0,
  };
  try {
    const res = await query(`
      SELECT
        COUNT(*) AS "totalGenerated",
        COUNT(*) FILTER (WHERE status = 'success') AS "successCount",
        COUNT(*) FILTER (WHERE status != 'success') AS "failureCount",
        COALESCE(ROUND(AVG(latency_ms)::numeric, 1), 0) AS "avgLatency"
      FROM image_generation_logs;
    `);
    if (res.rows && res.rows[0]) {
      images = {
        totalGenerated: Number(res.rows[0].totalGenerated),
        successCount: Number(res.rows[0].successCount),
        failureCount: Number(res.rows[0].failureCount),
        avgLatency: Number(res.rows[0].avgLatency),
      };
    }
  } catch (e) { console.error("Metrics Images:", e.message); }

  // Credits
  let credits = {
    issued: 0,
    consumed: 0,
    expired: 0,
    issuedPeriod: "últimos 30 días",
  };
  try {
    const res = await query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type != 'expiration'), 0) AS "issued",
        COALESCE(ABS(SUM(amount) FILTER (WHERE type = 'consumption')), 0) AS "consumed",
        COALESCE(ABS(SUM(amount) FILTER (WHERE type = 'expiration')), 0) AS "expired"
      FROM user_credits
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    if (res.rows && res.rows[0]) {
      credits = {
        issued: Number(res.rows[0].issued),
        consumed: Number(res.rows[0].consumed),
        expired: Number(res.rows[0].expired),
        issuedPeriod: "últimos 30 días",
      };
    }
  } catch (e) { console.error("Metrics Credits:", e.message); }

  // Revenue
  let revenue = {
    mrr: 0,
    mrrTrend: "0%",
    mrrTrendUp: true,
    recharges: 0,
    rechargeCount: 0,
    subscriptions: 0,
    activeSubscribers: 0,
    arpu: 0,
  };
  try {
    const mrrRes = await query(`
      SELECT COALESCE(SUM(amount_cents), 0) / 100.0 AS "mrr"
      FROM subscriptions
      WHERE status = 'active'
    `);

    // Recargas este mes
    const recRes = await query(`
      SELECT
        COALESCE(SUM(amount_cents), 0) / 100.0 AS "recharges",
        COUNT(*) AS "rechargeCount"
      FROM payments
      WHERE type = 'recharge' AND status = 'succeeded' 
        AND created_at >= date_trunc('month', NOW())
    `);

    // Subscripciones este mes
    const subsRes = await query(`
      SELECT COALESCE(SUM(amount_cents), 0) / 100.0 AS "subscriptions"
      FROM payments
      WHERE type = 'subscription' AND status = 'succeeded' 
        AND created_at >= date_trunc('month', NOW())
    `);

    const actSubsRes = await query(`
      SELECT COUNT(*) AS "activeSubscribers"
      FROM subscriptions
      WHERE status = 'active'
    `);

    // ARPU = Revenue / Active Users
    const arpuRes = await query(`
      SELECT
        (COALESCE(SUM(amount_cents), 0) / 100.0) / NULLIF(COUNT(DISTINCT user_id),0) AS "arpu"
      FROM payments
      WHERE status = 'succeeded' AND created_at >= date_trunc('month', NOW())
    `);

    const mrr = Number(mrrRes.rows?.[0]?.mrr || 0);

    revenue = {
      mrr,
      mrrTrend: "+0%", // Placeholder
      mrrTrendUp: true,
      recharges: Number(recRes.rows?.[0]?.recharges || 0),
      rechargeCount: Number(recRes.rows?.[0]?.rechargeCount || 0),
      subscriptions: Number(subsRes.rows?.[0]?.subscriptions || 0),
      activeSubscribers: Number(actSubsRes.rows?.[0]?.activeSubscribers || 0),
      arpu: Number(arpuRes.rows?.[0]?.arpu || 0),
    };
  } catch (e) { console.error("Metrics Revenue:", e.message); }

  // Top users
  let topUsers = [];
  try {
    const res = await query(`
      SELECT u.id, u.name AS first_name, '' AS last_name, u.email, ABS(SUM(c.amount)) AS credits_used
      FROM users u
      JOIN user_credits c ON c.user_id = u.id AND c.type = 'consumption'
      GROUP BY u.id, u.name, u.email
      ORDER BY credits_used DESC
      LIMIT 5
    `);
    topUsers = res.rows || [];
  } catch (e) { console.error("Metrics TopUsers:", e.message); }

  // Top features
  let topFeatures = [];
  try {
    const res = await query(`
      SELECT feature_name AS name, COUNT(*) AS count
      FROM (
        SELECT feature_name FROM llm_request_logs
        UNION ALL
        SELECT feature_name FROM image_generation_logs
      ) combined
      GROUP BY feature_name
      ORDER BY count DESC
      LIMIT 8
    `);
    const labelMap = {
      ad_copy_generation: "Generación de copy",
      image_generation: "Generación de imagen",
      ad_variation: "Variaciones de anuncio",
      headline_generation: "Generación de títulos",
      audience_suggestion: "Sugerencia de audiencia",
      sales_angles: "Ángulos de venta",
      branding: "Extracción Branding",
      profiles: "Perfiles Cliente",
      knowledgeBase: "Base Conocimiento"
    };
    topFeatures = (res.rows || []).map((f) => ({
      ...f,
      label: labelMap[f.name] || f.name,
      count: Number(f.count),
    }));
  } catch (e) { console.error("Metrics TopFeatures:", e.message); }

  // Alerts
  let alerts = [];
  try {
    const failedPayments = await query(`
      SELECT COUNT(*) AS failed_count
      FROM payments
      WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
    `);
    const count = Number(failedPayments.rows?.[0]?.failed_count || 0);
    if (count > 0) {
      alerts.push({
        severity: "critical",
        message: `${count} pagos fallidos en las últimas 24 horas`,
        time: "hace 2h", // TODO: Calcular tiempo real relativo
        actionLabel: "Ver pagos",
        actionUrl: "/admin/payments",
      });
    }
  } catch (e) { console.error("Metrics Alerts:", e.message); }

  return {
    llm,
    images,
    credits,
    revenue,
    topUsers,
    topFeatures,
    alerts,
  };
}

/**
 * Devuelve métricas detalladas de LLM para admin.
 */
export async function getLLMMetrics() {
  const summaryRes = await query(`
    SELECT
      COUNT(*) AS "totalRequests",
      COALESCE(SUM(tokens_used), 0) AS "totalTokens",
      COALESCE(SUM(latency_ms), 0) AS "totalDurationMs"
    FROM llm_request_logs
  `);

  const eventsRes = await query(`
    SELECT * FROM llm_request_logs ORDER BY created_at DESC LIMIT 50
  `);

  const row = summaryRes.rows[0];
  const totalRequests = Number(row.totalRequests);
  const totalTokens = Number(row.totalTokens);

  return {
    summary: {
      totalRequests,
      totalTokens,
      totalDurationMs: Number(row.totalDurationMs),
    },
    events: eventsRes.rows
  };
}

/**
 * Devuelve métricas detalladas de Imágenes para admin.
 */
export async function getImageMetrics() {
  const summaryRes = await query(`
    SELECT
      COUNT(*) AS "totalImages",
      COALESCE(SUM(latency_ms), 0) AS "totalDurationMs"
    FROM image_generation_logs
  `);

  const eventsRes = await query(`
    SELECT * FROM image_generation_logs ORDER BY created_at DESC LIMIT 50
  `);

  const row = summaryRes.rows[0];
  const totalImages = Number(row.totalImages);

  return {
    summary: {
      totalImages,
      totalDurationMs: Number(row.totalDurationMs),
    },
    events: eventsRes.rows
  };
}

/**
 * Limpia todas las métricas (Logs únicamente). Use con precaución.
 */
export async function clearAllMetrics() {
  await query("TRUNCATE TABLE llm_request_logs");
  await query("TRUNCATE TABLE image_generation_logs");
  return { message: "Logs truncated" };
}
