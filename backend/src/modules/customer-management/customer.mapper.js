const BOOKING_METHOD_MAP = {
    "ADVANCE BOOKING": "Mobile App",
    "AUTOCHARGE": "Autocharge",
    "CMS": "Mobile App",
    "QR SCAN": "Mobile App",
    "RFID": "RFID",
};

const mapBookingMethod = (method) => {
    if (!method) return "-";
    return BOOKING_METHOD_MAP[method] || method;
};

const getChargeclubTier = (units = 0) => {
    if (units <= 100) return "Bronze";
    if (units <= 200) return "Silver";
    if (units <= 400) return "Gold";
    if (units <= 700) return "Platinum";
    if (units <= 1000) return "Red";
    return "Red";
};

exports.formatUser = ({ user, vehicles, bookingsResult, query, chargeCoinsSummary, segmentData, ratingStats }) => {
    const { bookings = [], totalBookings = 0 } = bookingsResult;

    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;

    const totalUnits = user.total_units_consumed || 0;

    return {
        profile: {
            name: user.name,
            phone: user.phone,
            email: user.email,
            walletBalance: user.wallet_balance,
            totalSessions: user.total_session,
            totalSpent: user.total_spent,
            totalUnits: totalUnits,
            chargeclubTier: getChargeclubTier(totalUnits),
            createdAt: user.createdAt,
            chargeCoins: {
                available: user.chargecoins_v2,
                totalCount: chargeCoinsSummary.availableCoins || 0
            },
            segment: segmentData?.segment || "N/A",
            lastBooking: segmentData?.last_booking || null,
            rating: {
                average: ratingStats?.average || 0,
                count: ratingStats?.count || 0,
                distribution: ratingStats?.distribution || []
            }

        },

        vehicles: vehicles.map(v => ({
            vehicleName: `${v.make} ${v.model}`,
            registration: v.vin_num,
            sessions: v.session_count || 0,
            autoCharge: v.is_autocharge_enabled ? "Yes" : "No"
        })),

        bookings: bookings.map(b => {
            const inv = b.invoiceData;
            const unitUsed = b.estimated_units || 0;
            const totalAmount = inv?.total_amount || 0;
            const walletUsed = b.walletDebit || 0;
            const extraAmount = walletUsed > (b.estimated_amount || 0)
                ? walletUsed - (b.estimated_amount || 0)
                : 0;

            return {
                stationName: b.stationName || "N/A",
                ocppId: `${b.ocppId} (${b.connectorId})`,
                tenant: b.tenantName || "N/A",
                bookingId: b._id,
                bookingType: b.booking_type || "N/A",
                bookingTypeValue: b.estimated_amount || 0,
                bookingMethod: mapBookingMethod(b.initiatedFrom),
                idTag: b.idTag || "-",
                scheduledTime: b.schedule_datetime || null,
                status: b.status,
                preBookingAmount: b.estimated_amount || 0,
                amountDeductedFromWallet: walletUsed,
                unitUsedKWh: unitUsed,
                pricePerUnit: inv?.price_per_unit || 0,
                serviceCharge: inv?.service_charge || 0,
                discount: inv?.cashback || 0,
                taxableValue: inv?.subtotal || 0,
                gst: inv?.gst || 0,
                totalAmount: totalAmount,
                extraAmount: extraAmount,
                unusedAmountRefund: b.walletCredit || 0,
                sessionStartTimeIST: b.booking_start || null,
                sessionStopTimeIST: b.booking_stop || null,
                stopReason: b.stop_reason || "-",
                invoiceNumber: inv?.invoice_no || "-",
                rating: b.customerRating ?? null,  // ⭐ number (1–5) or null
            };
        }),

        pagination: {
            page,
            limit,
            totalBookings,
            totalPages: Math.ceil(totalBookings / limit)
        }
    };
};