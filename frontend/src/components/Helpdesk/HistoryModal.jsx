import React from 'react';

export default function HistoryModal({ isOpen, onClose, userName, history }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                width: '90%',
                maxWidth: '850px',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                animation: 'fadeUp 0.3s ease both'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
                        Interaction History: <span style={{ color: 'var(--muted)' }}>{userName}</span>
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--muted)',
                            fontSize: '28px',
                            cursor: 'pointer',
                            lineHeight: 1,
                            padding: '0 8px'
                        }}
                    >
                        &times;
                    </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", color: 'var(--muted-md)', fontWeight: "600" }}>Date</th>
                            <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", color: 'var(--muted-md)', fontWeight: "600" }}>Status</th>
                            <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", color: 'var(--muted-md)', fontWeight: "600" }}>Feedback</th>
                            <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", color: 'var(--muted-md)', fontWeight: "600" }}>Attended By</th>
                            <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", color: 'var(--muted-md)', fontWeight: "600" }}>Issue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((hist, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--card)', transition: 'background 0.2s' }}>
                                <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", color: 'var(--text)' }}>
                                    {hist.sessionDate ? new Date(hist.sessionDate).toLocaleDateString() : "-"}
                                </td>
                                <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                                    <span style={{
                                        padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", letterSpacing: "0.03em",
                                        backgroundColor: hist.HelpNeeded === "yes" ? "rgba(232, 48, 58, 0.15)" : "rgba(46, 204, 113, 0.15)",
                                        color: hist.HelpNeeded === "yes" ? "#ff6b6b" : "#4ade80",
                                        border: `1px solid ${hist.HelpNeeded === "yes" ? "rgba(232, 48, 58, 0.3)" : "rgba(46, 204, 113, 0.3)"}`
                                    }}>
                                        {hist.HelpNeeded === "yes" ? "Needed Help" : "Satisfied"}
                                    </span>
                                </td>
                                <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", color: 'var(--muted)', maxWidth: "250px", whiteSpace: "normal", lineHeight: "1.5" }}>
                                    {hist.feedback || "-"}
                                </td>
                                <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", color: 'var(--text)' }}>
                                    {hist.attendedBy || "-"}
                                </td>
                                <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", color: 'var(--text)' }}>
                                    {(hist.tags && hist.tags.length > 0) ? hist.tags.map(tag => (
                                        <span key={tag} style={{
                                            background: 'var(--card-hover)', padding: '2px 8px', borderRadius: '4px',
                                            fontSize: '11px', color: 'var(--muted-md)', marginRight: '6px', border: '1px solid var(--border)'
                                        }}>
                                            {tag}
                                        </span>
                                    )) : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
