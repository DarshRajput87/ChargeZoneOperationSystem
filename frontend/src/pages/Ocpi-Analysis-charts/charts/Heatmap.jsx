// ─── components/charts/Heatmap.jsx ───────────────────────────────────────────
import React, { useMemo } from "react";
import "./charts.css";
import "./Heatmap.css";
import { formatHeatmap } from "../../utils/dataFormatter";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const heatColor = (count, max) => {
    if (!count || count === 0) return "rgba(255,77,106,0.04)";
    const t = count / max;
    if (t < 0.2) return "rgba(245,166,35,0.22)";
    if (t < 0.4) return "rgba(245,166,35,0.45)";
    if (t < 0.65) return "rgba(240,120,64,0.62)";
    if (t < 0.85) return "rgba(240,77,106,0.72)";
    return "rgba(240,77,106,0.94)";
};

const Heatmap = ({ logs = [] }) => {
    const { rows, mods } = useMemo(() => formatHeatmap(logs), [logs]);

    const maxHeat = useMemo(() =>
        Math.max(...rows.map(r => r.count), 1)
        , [rows]);

    const lookup = useMemo(() => {
        const m = {};
        rows.forEach(r => {
            if (!m[r.module]) m[r.module] = {};
            m[r.module][r.hour] = r.count;
        });
        return m;
    }, [rows]);

    return (
        <div className="chart-card heatmap-card">
            <div className="chart-card-header">
                <span className="chart-card-title">Module × Hour Failure Density</span>
                <div className="hm-legend">
                    <span className="hm-legend-label">Low</span>
                    {[0.15, 0.35, 0.55, 0.75, 1].map((t, i) => (
                        <div
                            key={i}
                            className="hm-swatch"
                            style={{ background: heatColor(Math.round(t * maxHeat), maxHeat) }}
                        />
                    ))}
                    <span className="hm-legend-label">High</span>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="empty-state">No failure data to display</div>
            ) : (
                <div className="heatmap-wrap">
                    <div className="hm-grid" style={{ gridTemplateColumns: `112px repeat(24, 1fr)` }}>
                        <div className="hm-corner" />
                        {HOURS.map(h => (
                            <div key={h} className="hm-hour-label">
                                {h % 3 === 0 ? `${String(h).padStart(2, "0")}h` : ""}
                            </div>
                        ))}

                        {mods.map(mod => (
                            <React.Fragment key={mod}>
                                <div className="hm-mod-label" title={mod}>{mod}</div>
                                {HOURS.map(h => {
                                    const count = lookup[mod]?.[h] || 0;
                                    return (
                                        <div
                                            key={h}
                                            className="hm-cell"
                                            style={{ background: heatColor(count, maxHeat) }}
                                            title={`${mod} @ ${String(h).padStart(2, "0")}:00 — ${count} failure${count !== 1 ? "s" : ""}`}
                                        >
                                            {count > 0 && count >= Math.max(3, maxHeat * 0.3) && (
                                                <span className="hm-cell-val">{count}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(Heatmap);