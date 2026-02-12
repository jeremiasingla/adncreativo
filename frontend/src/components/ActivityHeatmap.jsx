import React from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Tooltip } from "react-tooltip";
import { LoadingSpinner } from "./LoadingSpinner";

function getLevel(count, max) {
  if (!count) return 0;
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export default function ActivityHeatmap({ activityMap = {}, loading = false }) {
  if (loading) {
    return (
      <div className="bg-[#15161a] border border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Actividad</h3>
        <div className="h-[140px] flex items-center justify-center">
          <LoadingSpinner size="small" variant="white" />
        </div>
      </div>
    );
  }

  // Build values array and compute max
  const values = [];
  let maxCount = 0;
  let totalContributions = 0;

  for (const [date, count] of Object.entries(activityMap)) {
    values.push({ date, count });
    if (count > maxCount) maxCount = count;
    totalContributions += count;
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - 1);

  return (
    <div className="bg-[#15161a] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Actividad</h3>
        <span className="text-xs text-gray-500">
          {totalContributions} actividad{totalContributions !== 1 ? "es" : ""}{" "}
          en el último año
        </span>
      </div>

      <div className="activity-heatmap-wrapper">
        <CalendarHeatmap
          startDate={startDate}
          endDate={today}
          values={values}
          showWeekdayLabels
          weekdayLabels={["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]}
          monthLabels={[
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic",
          ]}
          classForValue={(value) => {
            if (!value || !value.count) return "heatmap-level-0";
            return `heatmap-level-${getLevel(value.count, maxCount)}`;
          }}
          tooltipDataAttrs={(value) => ({
            "data-tooltip-id": "heatmap-tooltip",
            "data-tooltip-content": value?.date
              ? `${value.count || 0} actividad${(value.count || 0) !== 1 ? "es" : ""} el ${new Date(value.date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`
              : "Sin datos",
          })}
          gutterSize={3}
        />
        <Tooltip
          id="heatmap-tooltip"
          style={{
            backgroundColor: "#1f2937",
            color: "#e5e7eb",
            fontSize: "11px",
            borderRadius: "6px",
            padding: "4px 8px",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 50,
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2">
        <span className="text-[10px] text-gray-500 mr-1">Menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-[11px] h-[11px] rounded-[2px] heatmap-swatch-${level}`}
          />
        ))}
        <span className="text-[10px] text-gray-500 ml-1">Más</span>
      </div>
    </div>
  );
}
