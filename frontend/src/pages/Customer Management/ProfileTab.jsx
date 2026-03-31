import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const icons = {
    phone: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    email: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    ),
    wallet: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
    ),
    sessions: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    ),
    spent: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    units: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="6" width="18" height="12" rx="2" />
            <line x1="23" y1="10" x2="23" y2="14" />
            <line x1="7" y1="10" x2="7" y2="14" />
            <line x1="11" y1="10" x2="11" y2="14" />
        </svg>
    ),
    calendar: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    tier: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34" />
            <path d="M15 2c0 2.21-1.34 4-3 4-1.66 0-3-1.79-3-4" />
            <circle cx="12" cy="10" r="4" />
        </svg>
    ),
    coins: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
        </svg>
    ),
    segment: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
    clock: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    star: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    )
};


export default function ProfileTab({ profile, vehicles }) {
    if (!profile) return null;

    const profileCards = [
        { icon: icons.phone, label: "Phone Number", value: `+91${profile.phone}` },
        { icon: icons.email, label: "Email Address", value: profile.email || "-" },
        { icon: icons.wallet, label: "Wallet Balance", value: `₹${(profile.walletBalance || 0).toFixed(2)}` },
        {
            icon: icons.tier,
            label: "Chargeclub Tier",
            value: (
                <span className={`cm-tier-label cm-tier--${profile.chargeclubTier?.toLowerCase()}`}>
                    {profile.chargeclubTier}
                </span>
            )
        },
        { icon: icons.sessions, label: "Total Sessions", value: profile.totalSessions || 0 },
        { icon: icons.spent, label: "Total Spent", value: `₹${(profile.totalSpent || 0).toFixed(2)}` },
        { icon: icons.units, label: "Total Units Consumed", value: `${(profile.totalUnits || 0).toFixed(2)} kWh` },
        { icon: icons.calendar, label: "Account Created", value: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-" },
        {
            icon: icons.coins,
            label: "Charge Coins",
            value: (
                <div>
                    <div style={{ fontWeight: 600 }}>
                        {profile.chargeCoins?.available} Coins
                    </div>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                        Total Earned: {profile.chargeCoins?.totalCount || 0}
                    </div>
                </div>
            )
        },
        {
            icon: icons.segment,
            label: "User Segment",
            value: (
                <span className={`cm-badge ${profile.segment === "churned" ? "cm-badge--red" : profile.segment === "active" ? "cm-badge--green" : "cm-badge--blue"}`}>
                    {(profile.segment || "N/A").replace("_", " ").toUpperCase()}
                </span>
            )
        },
        {
            icon: icons.clock,
            label: "Last Booking",
            value: profile.lastBooking ? new Date(profile.lastBooking).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"
        },
        {
            icon: icons.star,
            label: "Average Rating",
            value: (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "16px" }}>{profile.rating?.average || "0.0"}</span>
                    <span style={{ fontSize: "12px", color: "#888" }}>({profile.rating?.count || 0} reviews)</span>
                </div>
            )
        },
    ];


    return (
        <div className="cm-profile-tab">
            {/* ── Profile Cards ── */}
            <div className="cm-profile-grid">
                {profileCards.map((card, i) => (
                    <div className="cm-profile-card" key={i}>
                        <div className="cm-profile-card-icon">{card.icon}</div>
                        <div>
                            <div className="cm-profile-card-value">{card.value}</div>
                            <div className="cm-profile-card-label">{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Vehicle Details ── */}
            <h3 className="cm-section-title">Vehicle Details</h3>
            <div className="cm-table-wrapper">
                <table className="cm-table">
                    <thead>
                        <tr>
                            <th>S.No.</th>
                            <th>Vehicle Name (Make/Model)</th>
                            <th>Vehicle Registration No.</th>
                            <th>No. of Sessions</th>
                            <th>AutoCharge</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles && vehicles.length > 0 ? (
                            vehicles.map((v, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{v.vehicleName}</td>
                                    <td>{v.registration}</td>
                                    <td>{v.sessions}</td>
                                    <td>
                                        <span className={`cm-badge ${v.autoCharge === "Yes" ? "cm-badge--green" : "cm-badge--muted"}`}>
                                            {v.autoCharge}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="cm-no-data">No vehicles found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Rating Chart ── */}
            <h3 className="cm-section-title" style={{ marginTop: "32px" }}>Rating Distribution</h3>
            <div className="cm-table-wrapper" style={{ padding: "20px", height: "300px", paddingBottom: "10px" }}>
                {profile.rating?.count > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profile.rating.distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="rating" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#334155" allowDecimals={false} />
                            <Tooltip
                                cursor={{ fill: '#1e293b' }}
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                                itemStyle={{ color: '#38bdf8' }}
                            />
                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                        No ratings available for this user yet.
                    </div>
                )}
            </div>
        </div>
    );
}

