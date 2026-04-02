import { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { searchUsers, getUserDetails } from "../../services/customerService";
import toast from "react-hot-toast";
import ProfileTab from "./ProfileTab";
import BookingsTab from "./BookingsTab";
import "./customer-management.css";

// ── Star renderer ──────────────────────────────────────────────
function StarRating({ value }) {
    if (value == null) return <span className="cm-no-rating">—</span>;
    return (
        <span className="cm-star-rating">
            {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`cm-star ${s <= value ? "cm-star--filled" : "cm-star--empty"}`}>★</span>
            ))}
            <span className="cm-star-number">({value})</span>
        </span>
    );
}

export default function CustomerManagement() {
    const [searchParams] = useSearchParams();
    const { userId: paramUserId } = useParams();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);

    const [activeTab, setActiveTab] = useState("profile");

    // Booking pagination & filters
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Search filters
    const [searchStartDate, setSearchStartDate] = useState("");
    const [searchEndDate, setSearchEndDate] = useState("");
    const [selectedSegment, setSelectedSegment] = useState("");
    const [hasFeedback, setHasFeedback] = useState(false);
    const [selectedRatings, setSelectedRatings] = useState([]);

    // Search pagination
    const [searchPage, setSearchPage] = useState(1);
    const [searchPagination, setSearchPagination] = useState(null);

    const prevFiltersRef = useRef({
        searchStartDate: "",
        searchEndDate: "",
        selectedSegment: "",
        hasFeedback: false,
        selectedRatings: [],
    });
    const isInitialMount = useRef(true);

    // Sync filters with URL
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (searchStartDate) params.set("from", searchStartDate);
        if (searchEndDate) params.set("to", searchEndDate);
        if (selectedSegment) params.set("segment", selectedSegment);
        if (hasFeedback) params.set("feedback", "true");
        if (selectedRatings.length > 0) params.set("ratings", selectedRatings.join(","));
        if (searchPage > 1) params.set("page", searchPage);

        const newSearch = params.toString();
        const currentSearch = searchParams.toString();
        if (newSearch !== currentSearch) {
            navigate({ search: newSearch }, { replace: true });
        }
    }, [searchQuery, searchStartDate, searchEndDate, selectedSegment, hasFeedback, selectedRatings, searchPage]);

    // 1. Initial load from URL
    useEffect(() => {
        const q = searchParams.get("search") || "";
        const from = searchParams.get("from") || "";
        const to = searchParams.get("to") || "";
        const seg = searchParams.get("segment") || "";
        const fb = searchParams.get("feedback") === "true";
        const rat = searchParams.get("ratings")
            ? searchParams.get("ratings").split(",").map(Number)
            : [];
        const p = parseInt(searchParams.get("page")) || 1;

        if (q || from || to || seg || fb || rat.length > 0 || p > 1) {
            setSearchQuery(q);
            setSearchStartDate(from);
            setSearchEndDate(to);
            setSelectedSegment(seg);
            setHasFeedback(fb);
            setSelectedRatings(rat);
            setSearchPage(p);
            prevFiltersRef.current = { searchStartDate: from, searchEndDate: to, selectedSegment: seg, hasFeedback: fb, selectedRatings: rat };
        }
    }, []);

    // 2. Unified effect for filter + page changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            const hasFilters = searchQuery?.trim() || searchStartDate || searchEndDate || selectedSegment || hasFeedback || selectedRatings.length > 0;
            if (hasFilters) runSearch(searchQuery, searchPage);
            return;
        }

        const prev = prevFiltersRef.current;
        const filtersChanged =
            prev.searchStartDate !== searchStartDate ||
            prev.searchEndDate !== searchEndDate ||
            prev.selectedSegment !== selectedSegment ||
            prev.hasFeedback !== hasFeedback ||
            JSON.stringify(prev.selectedRatings) !== JSON.stringify(selectedRatings);

        prevFiltersRef.current = { searchStartDate, searchEndDate, selectedSegment, hasFeedback, selectedRatings };

        const hasFilters = searchQuery?.trim() || searchStartDate || searchEndDate || selectedSegment || hasFeedback || selectedRatings.length > 0;
        if (!hasFilters) return;

        if (filtersChanged) {
            setSearchPage(1);
            runSearch(searchQuery, 1);
        } else {
            runSearch(searchQuery, searchPage);
        }
    }, [searchPage, searchStartDate, searchEndDate, selectedSegment, hasFeedback, selectedRatings]);

    // 3. Load user details when userId in URL
    useEffect(() => {
        if (paramUserId) loadUserDetails(paramUserId);
    }, [paramUserId, page, startDate, endDate]);

    const runSearch = async (q, p) => {
        const query = q !== undefined ? q : searchQuery;
        const pageToSearch = p !== undefined ? p : searchPage;

        if (!query?.trim() && !searchStartDate && !searchEndDate && !selectedSegment && !hasFeedback && selectedRatings.length === 0) {
            setSearchResults([]);
            setSearchPagination(null);
            return;
        }

        setSearching(true);
        try {
            const data = await searchUsers(
                query?.trim() || "",
                { startDate: searchStartDate, endDate: searchEndDate, segment: selectedSegment, hasFeedback, ratings: selectedRatings },
                pageToSearch
            );

            if (data.users.length === 0) {
                toast.error("No customers found matching these filters");
            }

            setSearchResults(data.users);
            setSearchPagination({
                total: data.total,
                totalPages: data.totalPages,
                page: data.page,
                isCapped: data.isCapped,
            });

            if (
                data.users.length === 1 &&
                !searchStartDate && !searchEndDate && !selectedSegment && !hasFeedback &&
                selectedRatings.length === 0 && pageToSearch === 1 && !paramUserId
            ) {
                selectUser(data.users[0]);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to search users");
            console.error("Search error:", err);
        }
        setSearching(false);
    };

    const handleSearch = () => {
        setSearchPage(1);
        runSearch(searchQuery, 1);
    };

    const loadUserDetails = async (uid) => {
        setLoading(true);
        try {
            const data = await getUserDetails(uid, { page, limit, startDate, endDate, refDate: searchEndDate });
            setUserData(data);
            if (!selectedUser) {
                setSelectedUser({ _id: uid, name: data.profile?.name, phone: data.profile?.phone });
            }
        } catch (err) {
            toast.error("Failed to load user details");
            console.error("Load user error:", err);
        }
        setLoading(false);
    };

    const selectUser = (user) => {
        setSelectedUser(user);
        setPage(1);
        setStartDate("");
        setEndDate("");
        navigate(`/customer-management/${user._id}${window.location.search}`, { replace: true });
    };

    const handleBackToList = () => {
        setSelectedUser(null);
        setUserData(null);
        navigate(`/customer-management${window.location.search}`, { replace: true });
    };

    const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

    const handleBookingSearch = () => {
        setPage(1);
        loadUserDetails(selectedUser._id);
    };

    const handleClearAll = () => {
        setSearchStartDate(""); setSearchEndDate(""); setSearchQuery("");
        setSelectedSegment(""); setHasFeedback(false); setSelectedRatings([]);
        setSearchResults([]); setSearchPagination(null); setSearchPage(1);
        setSelectedUser(null); setUserData(null);
        prevFiltersRef.current = { searchStartDate: "", searchEndDate: "", selectedSegment: "", hasFeedback: false, selectedRatings: [] };
        navigate("/customer-management", { replace: true });
    };

    const toggleRating = (r) => {
        setSelectedRatings((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
    };

    const activeFilterCount = [searchStartDate, searchEndDate, selectedSegment, hasFeedback, ...selectedRatings].filter(Boolean).length;

    // ── Pagination window helper ─────────────────────────────
    // Always shows 5 page buttons centred around the current page
    const getPaginationPages = (currentPage, totalPages) => {
        const delta = 2; // pages on each side
        const range = [];
        const left = Math.max(1, currentPage - delta);
        const right = Math.min(totalPages, currentPage + delta);

        // Ensure we always show 5 buttons when possible
        let start = left;
        let end = right;
        if (end - start < delta * 2) {
            if (start === 1) end = Math.min(totalPages, start + delta * 2);
            else start = Math.max(1, end - delta * 2);
        }

        for (let i = start; i <= end; i++) range.push(i);
        return { pages: range, showStartEllipsis: start > 1, showEndEllipsis: end < totalPages };
    };

    return (
        <div className="cm-page">

            {/* ───── SEARCH PANEL ───── */}
            <div className="cm-search-panel">
                <div className="cm-search-row">
                    <div className="cm-search-input-wrap">
                        <input
                            type="text"
                            placeholder="Search by phone number and name...."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="cm-search-input"
                        />
                        {searchQuery && (
                            <button className="cm-input-clear" onClick={() => setSearchQuery("")} title="Clear">
                                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button className="cm-search-btn" onClick={handleSearch} disabled={searching}>
                        {searching ? <span className="cm-spinner" /> : "Search"}
                    </button>
                </div>

                <div className="cm-filters-row">
                    <div className="cm-filter-group">
                        <label className="cm-filter-label">From</label>
                        <input type="date" value={searchStartDate} onChange={(e) => setSearchStartDate(e.target.value)} className="cm-filter-date" />
                    </div>
                    <div className="cm-filter-group">
                        <label className="cm-filter-label">To</label>
                        <input type="date" value={searchEndDate} onChange={(e) => setSearchEndDate(e.target.value)} className="cm-filter-date" />
                    </div>
                    <div className="cm-filter-divider" />
                    <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="cm-filter-select">
                        <option value="">All segments</option>
                        <option value="new_active">New Active</option>
                        <option value="new_inactive">New Inactive</option>
                        <option value="active">Active</option>
                        <option value="dormant">Dormant</option>
                        <option value="churned">Churned</option>
                    </select>
                    <label className={`cm-toggle-filter ${hasFeedback ? "is-on" : ""}`}>
                        <input type="checkbox" checked={hasFeedback} onChange={(e) => setHasFeedback(e.target.checked)} />
                        <span className="cm-toggle-track"><span className="cm-toggle-thumb" /></span>
                        <span>With Feedback</span>
                    </label>
                    <div className="cm-rating-group">
                        <span className="cm-filter-label">Rating</span>
                        <div className="cm-rating-pills">
                            {[5, 4, 3, 2, 1].map((r) => (
                                <button key={r} className={`cm-rating-pill ${selectedRatings.includes(r) ? "active" : ""}`} onClick={() => toggleRating(r)}>
                                    {r}<span className="cm-star-icon">★</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {(searchQuery || activeFilterCount > 0 || selectedUser) && (
                        <button className="cm-reset-btn" onClick={handleClearAll}>
                            <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                                <path d="M2 8a6 6 0 1 1 1.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M2 5v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Reset
                            {activeFilterCount > 0 && <span className="cm-filter-badge">{activeFilterCount}</span>}
                        </button>
                    )}
                </div>
            </div>

            {(searchResults.length > 0 || searching) && !selectedUser && (
                <div className="cm-results-panel">
                    <div className="cm-results-header">
                        <div className="cm-results-header-item">Number</div>
                        <div className="cm-results-header-item">Latest Feedback</div>
                        <div className="cm-results-header-item">Rating</div>
                        <div className="cm-results-header-item">State</div>
                        <div className="cm-results-header-item" style={{ textAlign: "right" }}>
                            {searchPagination?.total != null && (
                                <span className="cm-results-count">
                                    {searchPagination.total}{searchPagination.isCapped ? "+" : ""}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="cm-results-list">
                        {searching ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="cm-result-row">
                                    <div className="cm-result-cell-main">
                                        <div className="cm-skeleton cm-skeleton-avatar" />
                                        <div className="cm-result-info">
                                            <div className="cm-skeleton cm-skeleton-text" style={{ width: '80px' }} />
                                            <div className="cm-skeleton cm-skeleton-phone" style={{ width: '100px' }} />
                                        </div>
                                    </div>
                                    <div className="cm-skeleton cm-skeleton-text" style={{ width: '90%' }} />
                                    <div className="cm-skeleton cm-skeleton-text" style={{ width: '60px' }} />
                                    <div className="cm-skeleton cm-skeleton-tag" />
                                    <div className="cm-result-arrow">
                                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            ))
                        ) : (
                            searchResults.map((u, i) => (
                                <div
                                    key={u._id}
                                    className="cm-result-row"
                                    onClick={() => selectUser(u)}
                                    style={{ animationDelay: `${i * 30}ms` }}
                                >
                                    <div className="cm-result-cell-main">
                                        <div className="cm-result-avatar">
                                            {(u.name || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="cm-result-info">
                                            <div className="cm-result-phone">{u.phone}</div>
                                            <div className="cm-result-name">{u.name || "Guest User"}</div>
                                        </div>
                                    </div>

                                    <div className={`cm-result-feedback-cell ${!u.latestFeedback ? "is-empty" : ""}`} title={u.latestFeedback}>
                                        {u.latestFeedback ? `"${u.latestFeedback}"` : ""}
                                    </div>

                                    <div className="cm-result-rating-cell">
                                        <StarRating value={u.latestRating} />
                                    </div>

                                    <div className="cm-result-state-cell">
                                        {u.segment ? (
                                            <span className={`cm-tag cm-tag--${u.segment}`}>
                                                {u.segment.replace("_", " ")}
                                            </span>
                                        ) : (
                                            <span className="cm-muted">—</span>
                                        )}
                                    </div>

                                    <svg className="cm-result-arrow" viewBox="0 0 16 16" fill="none" width="16" height="16">
                                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            ))
                        )}
                    </div>

                    {searchPagination && searchPagination.totalPages > 1 && (() => {
                        const { pages, showStartEllipsis, showEndEllipsis } = getPaginationPages(searchPage, searchPagination.totalPages);
                        return (
                            <div className="cm-pagination">
                                <button
                                    className="cm-page-btn"
                                    disabled={searchPage <= 1}
                                    onClick={() => setSearchPage((p) => p - 1)}
                                >
                                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                                        <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Prev
                                </button>

                                <div className="cm-page-dots">
                                    {showStartEllipsis && (
                                        <>
                                            <button className={`cm-page-dot ${1 === searchPage ? "active" : ""}`} onClick={() => setSearchPage(1)}>1</button>
                                            <span className="cm-page-ellipsis">…</span>
                                        </>
                                    )}

                                    {pages.map((pg) => (
                                        <button
                                            key={pg}
                                            className={`cm-page-dot ${pg === searchPage ? "active" : ""}`}
                                            onClick={() => setSearchPage(pg)}
                                        >
                                            {pg}
                                        </button>
                                    ))}

                                    {showEndEllipsis && (
                                        <>
                                            <span className="cm-page-ellipsis">…</span>
                                            <button
                                                className={`cm-page-dot ${searchPagination.totalPages === searchPage ? "active" : ""}`}
                                                onClick={() => setSearchPage(searchPagination.totalPages)}
                                            >
                                                {searchPagination.totalPages}{searchPagination.isCapped ? "+" : ""}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    className="cm-page-btn"
                                    disabled={searchPage >= searchPagination.totalPages}
                                    onClick={() => setSearchPage((p) => p + 1)}
                                >
                                    Next
                                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ───── USER DETAIL ───── */}
            {selectedUser && (
                <div className="cm-detail-panel">
                    <div className="cm-user-header">
                        <button className="cm-back-btn" onClick={handleBackToList} title="Back to results">
                            <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                                <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div className="cm-avatar-lg">
                            {(selectedUser.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="cm-user-info">
                            <div className="cm-user-name-row">
                                <h2 className="cm-user-name">{selectedUser.name || "User"}</h2>
                                {userData?.profile?.segment && (
                                    <span className={`cm-tag cm-tag--${userData.profile.segment}`}>
                                        {userData.profile.segment.replace("_", " ")}
                                    </span>
                                )}
                            </div>
                            <span className="cm-user-phone">{selectedUser.phone}</span>
                        </div>
                    </div>

                    <div className="cm-tabs">
                        {["profile", "bookings"].map((tab) => (
                            <button
                                key={tab}
                                className={`cm-tab ${activeTab === tab ? "cm-tab--active" : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab === "bookings" && userData?.pagination?.totalBookings > 0 && (
                                    <span className="cm-tab-count">{userData.pagination.totalBookings}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {loading && !userData ? (
                        <div className="cm-loading"><span className="cm-spinner cm-spinner--lg" /></div>
                    ) : userData ? (
                        <>
                            {activeTab === "profile" && (
                                <ProfileTab profile={userData.profile} vehicles={userData.vehicles} />
                            )}
                            {activeTab === "bookings" && (
                                <BookingsTab
                                    bookings={userData.bookings}
                                    pagination={userData.pagination}
                                    page={page}
                                    setPage={setPage}
                                    startDate={startDate}
                                    setStartDate={setStartDate}
                                    endDate={endDate}
                                    setEndDate={setEndDate}
                                    onSearch={handleBookingSearch}
                                    loading={loading}
                                />
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {!selectedUser && searchResults.length === 0 && !searching && (
                <div className="cm-empty-state">
                    <div className="cm-empty-icon">
                        <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
                            <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2" opacity=".3" />
                            <path d="M32 32l10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".4" />
                            <circle cx="22" cy="18" r="5" stroke="currentColor" strokeWidth="1.5" opacity=".5" />
                            <path d="M13 32c0-5 4-8 9-8s9 3 9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
                        </svg>
                    </div>
                    <p className="cm-empty-title">Find a customer</p>
                    <p className="cm-empty-sub">Search by phone number, user ID, or use filters to browse</p>
                </div>
            )}
        </div>
    );
}