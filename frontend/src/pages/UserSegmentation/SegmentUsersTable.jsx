import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import API from "../../services/api";

function formatCurrency(val) {
    if (val === null || val === undefined) return "—";
    return `₹${Number(val).toLocaleString()}`;
}

function formatDate(isoStr) {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleString();
}

export default function SegmentUsersTable({ segment, selectedRoles, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const fetchUsers = useCallback(async (currentPage, search) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                role: selectedRoles.join(","),
                search: search,
            });
            const res = await API.get(`/segments/${segment.key}/users?${params}`);
            
            const json = res.data;
            setUsers(json.data || []);
            setTotalPages(json.pagination?.pages || 1);
            setTotalUsers(json.pagination?.total || 0);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [segment, selectedRoles]);

    // Re-fetch when page or query changes
    useEffect(() => {
        fetchUsers(page, searchQuery);
    }, [page, searchQuery, fetchUsers]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // reset to page 1 on new search
        setSearchQuery(inputValue);
    };

    const handleExport = async () => {
        if (!users.length || isExporting) return;
        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                role: selectedRoles.join(","),
                search: searchQuery,
                export: "true",
            });
            const res = await API.get(`/segments/${segment.key}/users?${params}`);
            const json = res.data;
            const exportData = json.data.map((u) => ({
                "Sr. No": u.sr_no,
                "User ID": u.user_id,
                "Phone No": u.phone_no,
                "Lifecyle Segment": u.lifecycle_segment,
                "Sessions (30d)": u.sessions_30d,
                "Sessions (90d)": u.sessions_90d,
                "Sessions (All Time)": u.sessions_all_time,
                "Total Estimated Amount Spent": formatCurrency(u.total_estimated_amount),
                "Last Booking Date": formatDate(u.last_booking_date),
                "Last Segmented Date": formatDate(u.last_segmented_date),
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Segment Users");
            XLSX.writeFile(wb, `${segment.label}_Users_Export.xlsx`);
        } catch (e) {
            alert(e.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="segment-table-page">
            <header className="dash-header">
                <div>
                    <div className="header-badge" style={{color: segment.color, borderColor: segment.border}}>{segment.label.toUpperCase()} USERS</div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button className="back-btn" onClick={onClose}>←</button>
                        User Segmentation Details
                    </h1>
                    <p className="header-sub">
                        Viewing all users currently categorized as {segment.label}. Total matches: {totalUsers}
                    </p>
                </div>
            </header>

            <div className="table-controls">
                <form className="search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search by User ID or Phone No..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button type="submit" className="search-btn">Search</button>
                    {searchQuery && (
                        <button type="button" className="clear-btn" onClick={() => {
                            setInputValue("");
                            setSearchQuery("");
                            setPage(1);
                        }}>Clear</button>
                    )}
                </form>

                <button 
                    className="export-btn" 
                    onClick={handleExport}
                    disabled={isExporting || users.length === 0}
                    style={{ opacity: isExporting ? 0.7 : 1, cursor: isExporting ? "not-allowed" : "pointer" }}
                >
                    {isExporting ? "⏳ Downloading..." : "↓ Download Excel"}
                </button>
            </div>

            {error && <div className="error-banner" style={{marginBottom: 20}}>⚠ {error}</div>}

            <div className="table-container">
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Sr.No</th>
                            <th>User ID</th>
                            <th>Phone No</th>
                            <th>30d Sessions</th>
                            <th>90d Sessions</th>
                            <th>All-time Sessions</th>
                            <th>Est. Amount Spent</th>
                            <th>Lifecycle Segment</th>
                            <th>Last Booking Date</th>
                            <th>Last Segmented Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" className="table-loading">Loading users...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="table-empty">No users found for this segment.</td>
                            </tr>
                        ) : (
                            users.map((u) => (
                                <tr key={u.user_id}>
                                    <td>{u.sr_no}</td>
                                    <td>{u.user_id}</td>
                                    <td>{u.phone_no}</td>
                                    <td>{u.sessions_30d}</td>
                                    <td>{u.sessions_90d}</td>
                                    <td>{u.sessions_all_time}</td>
                                    <td className="currency">{formatCurrency(u.total_estimated_amount)}</td>
                                    <td>
                                        <span className="lifecycle-badge" style={{color: segment.color, background: segment.bg, borderColor: segment.border}}>
                                            {u.lifecycle_segment}
                                        </span>
                                    </td>
                                    <td>{formatDate(u.last_booking_date)}</td>
                                    <td>{formatDate(u.last_segmented_date)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && totalPages > 1 && (
                <div className="pagination">
                    <button 
                        disabled={page === 1} 
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <span className="page-info">Page {page} of {totalPages}</span>
                    <button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
