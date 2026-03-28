import React from "react";

export default function BookingsTab({
    bookings,
    pagination,
    page,
    setPage,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onSearch,
    loading
}) {
    const [ratingFilter, setRatingFilter] = React.useState("all");

    const formatDate = (d) => {
        if (!d) return "-";
        return new Date(d).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
        });
    };

    const StarRating = ({ rating }) => {
        if (rating === null || rating === undefined) {
            return <span className="cm-no-rating">-</span>;
        }
        return (
            <div className="cm-star-rating" title={`${rating} / 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={star <= rating ? "cm-star cm-star--filled" : "cm-star cm-star--empty"}
                    >
                        ★
                    </span>
                ))}
                <span className="cm-star-number">({rating})</span>
            </div>
        );
    };

    const filteredBookings = React.useMemo(() => {
        if (!bookings) return [];
        if (ratingFilter === "all") return bookings;
        if (ratingFilter === "unrated") return bookings.filter(b => b.rating === null || b.rating === undefined);
        return bookings.filter(b => b.rating === Number(ratingFilter));
    }, [bookings, ratingFilter]);

    const columns = [
        "Sr No", "Station Name", "OCPP ID (Connector)", "Tenant", "Booking ID",
        "Booking Type", "Booking Type Value", "Booking Method", "IDTag",
        "Scheduled Time", "Status", "Pre Booking Amount",
        "Amount Deducted from Wallet", "Unit Used (kWh)", "Price Per Unit",
        "Service Charge", "Discount", "Taxable Value", "GST",
        "Total Amount", "Extra Amount", "Unused Amount (Refund)",
        "Session Start Time (IST)", "Session Stop Time (IST)",
        "Stop Reason", "Invoice Number", "Rating"
    ];

    return (
        <div className="cm-bookings-tab">

            {/* ── Filters ── */}
            <div className="cm-booking-filters">
                <span className="cm-filter-label">Booking Details</span>

                <div className="cm-filter-row">
                    <label>
                        From:
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="cm-date-input"
                        />
                    </label>
                    <label>
                        To:
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="cm-date-input"
                        />
                    </label>

                    {/* ⭐ Rating Filter */}
                    <label>
                        Rating:
                        <select
                            className="cm-date-input cm-rating-select"
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 — Excellent</option>
                            <option value="4">4 — Good</option>
                            <option value="3">3 — Average</option>
                            <option value="2">2 — Poor</option>
                            <option value="1">1 — Terrible</option>
                            <option value="unrated">Not Rated</option>
                        </select>
                    </label>

                    <button className="cm-search-btn" onClick={onSearch} disabled={loading}>
                        {loading ? "Loading..." : "Search"}
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="cm-table-wrapper cm-table-scroll">
                <table className="cm-table cm-bookings-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map((b, i) => (
                                <tr key={b.bookingId || i}>
                                    <td>{(page - 1) * (pagination?.limit || 10) + i + 1}</td>
                                    <td>{b.stationName}</td>
                                    <td>{b.ocppId}</td>
                                    <td>{b.tenant}</td>
                                    <td className="cm-booking-id">{b.bookingId}</td>
                                    <td>{b.bookingType}</td>
                                    <td>{b.bookingTypeValue}</td>
                                    <td>{b.bookingMethod}</td>
                                    <td>{b.idTag}</td>
                                    <td>{formatDate(b.scheduledTime)}</td>
                                    <td>
                                        <span className={`cm-status cm-status--${b.status}`}>
                                            {b.status}
                                        </span>
                                    </td>
                                    <td>₹{b.preBookingAmount}</td>
                                    <td>₹{b.amountDeductedFromWallet}</td>
                                    <td>{(b.unitUsedKWh || 0).toFixed(2)}</td>
                                    <td>₹{b.pricePerUnit}</td>
                                    <td>₹{b.serviceCharge}</td>
                                    <td>₹{b.discount}</td>
                                    <td>₹{b.taxableValue}</td>
                                    <td>₹{b.gst}</td>
                                    <td>₹{b.totalAmount}</td>
                                    <td>₹{b.extraAmount}</td>
                                    <td>₹{b.unusedAmountRefund}</td>
                                    <td>{formatDate(b.sessionStartTimeIST)}</td>
                                    <td>{formatDate(b.sessionStopTimeIST)}</td>
                                    <td>{b.stopReason}</td>
                                    <td>{b.invoiceNumber}</td>
                                    <td><StarRating rating={b.rating} /></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="cm-no-data">
                                    {ratingFilter !== "all"
                                        ? `No bookings with ${ratingFilter === "unrated" ? "no rating" : `${ratingFilter}-star rating`}`
                                        : "No Booking Data"
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ── */}
            {pagination && pagination.totalPages > 1 && (
                <div className="cm-pagination">
                    <button
                        className="cm-page-btn"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        ← Prev
                    </button>
                    <span className="cm-page-info">
                        Page {pagination.page} of {pagination.totalPages}
                        &nbsp;({pagination.totalBookings} bookings)
                    </span>
                    <button
                        className="cm-page-btn"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}