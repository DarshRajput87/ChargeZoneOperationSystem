// ─── components/charts/FailureList.jsx ───────────────────────────────────────
import React, { useMemo } from "react";
import "./charts.css";
import "./FailureList.css";
import { COLORS } from "../../utils/dataFormatter";

const FailureList = ({ failures = [] }) => {
    const maxCount = useMemo(() => failures[0]?.count || 1, [failures]);

    return (
        <div className="chart-card">
            <div className="chart-card-header">
                <span className="chart-card-title">Top Failing Endpoints</span>
                <span className="pill red">Top 10</span>
            </div>

            {failures.length === 0 ? (
                <div className="empty-state">No failure data</div>
            ) : (
                <div className="failure-list-wrap">
                    {failures.map((f, i) => (
                        <div className="failure-row" key={i}>
                            <div className="failure-meta">
                                <span className="failure-rank">#{i + 1}</span>
                                <span className="failure-url" title={f._id}>
                                    {f._id?.length > 46 ? "…" + f._id.slice(-44) : (f._id || "—")}
                                </span>
                                <span className="failure-count">
                                    {f.count.toLocaleString()}
                                </span>
                            </div>
                            <div className="failure-bar-track">
                                <div
                                    className="failure-bar-fill"
                                    style={{ width: `${(f.count / maxCount) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(FailureList);