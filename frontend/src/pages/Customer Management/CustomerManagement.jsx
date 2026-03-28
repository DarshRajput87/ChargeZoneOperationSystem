import { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { searchUsers, getUserDetails } from "../../services/customerService";
import ProfileTab from "./ProfileTab";
import BookingsTab from "./BookingsTab";
import "./customer-management.css";

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

    // Auto-search from URL param (helpdesk link)
    useEffect(() => {
        const q = searchParams.get("search");
        if (q) {
            setSearchQuery(q);
            handleSearch(q);
        }
    }, []);

    // Load user details when userId is in URL
    useEffect(() => {
        if (paramUserId) {
            loadUserDetails(paramUserId);
        }
    }, [paramUserId, page, startDate, endDate]);

    const handleSearch = async (q) => {
        const query = q || searchQuery;
        if (!query.trim()) return;

        setSearching(true);
        try {
            const results = await searchUsers(query.trim());
            setSearchResults(results);

            // Auto-select if only 1 result
            if (results.length === 1) {
                selectUser(results[0]);
            }
        } catch (err) {
            console.error("Search error:", err);
        }
        setSearching(false);
    };

    const selectUser = (user) => {
        setSelectedUser(user);
        setSearchResults([]);
        setPage(1);
        setStartDate("");
        setEndDate("");
        navigate(`/customer-management/${user._id}`, { replace: true });
    };

    const loadUserDetails = async (uid) => {
        setLoading(true);
        try {
            const data = await getUserDetails(uid, { page, limit, startDate, endDate });
            setUserData(data);
            if (!selectedUser) {
                setSelectedUser({ _id: uid, name: data.profile?.name, phone: data.profile?.phone });
            }
        } catch (err) {
            console.error("Load user error:", err);
        }
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const handleBookingSearch = () => {
        setPage(1);
        loadUserDetails(selectedUser._id);
    };

    return (
        <div className="cm-page">
            {/* ───── SEARCH BAR ───── */}
            <div className="cm-search-bar">
                <input
                    type="text"
                    placeholder="Search by phone number or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="cm-search-input"
                />
                <button
                    className="cm-search-btn"
                    onClick={() => handleSearch()}
                    disabled={searching}
                >
                    {searching ? "Searching..." : "Search"}
                </button>
            </div>

            {/* ───── SEARCH RESULTS ───── */}
            {searchResults.length > 1 && (
                <div className="cm-search-results">
                    {searchResults.map((u) => (
                        <div
                            key={u._id}
                            className="cm-search-result-item"
                            onClick={() => selectUser(u)}
                        >
                            <span className="cm-result-name">{u.name || "Unknown"}</span>
                            <span className="cm-result-phone">{u.phone}</span>
                            <span className="cm-result-email">{u.email || ""}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ───── USER DETAIL ───── */}
            {selectedUser && (
                <>
                    {/* User Header */}
                    <div className="cm-user-header">
                        <div className="cm-avatar">
                            {(selectedUser.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="cm-user-info">
                            <h2>{selectedUser.name || "User"}</h2>
                            <span className="cm-user-phone">{selectedUser.phone}</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="cm-tabs">
                        <button
                            className={`cm-tab ${activeTab === "profile" ? "cm-tab--active" : ""}`}
                            onClick={() => setActiveTab("profile")}
                        >
                            Profile
                        </button>
                        <button
                            className={`cm-tab ${activeTab === "bookings" ? "cm-tab--active" : ""}`}
                            onClick={() => setActiveTab("bookings")}
                        >
                            Bookings
                        </button>
                    </div>

                    {/* Tab Content */}
                    {loading && !userData ? (
                        <div className="cm-loading">Loading...</div>
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
                </>
            )}

            {!selectedUser && searchResults.length === 0 && !searching && (
                <div className="cm-empty">
                    <p>Search for a customer by phone number or user ID</p>
                </div>
            )}
        </div>
    );
}
