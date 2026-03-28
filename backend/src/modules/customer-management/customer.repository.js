const mongoose = require("mongoose");
const { bookingPipeline, bookingCountMatch } = require("./customer.aggregation");

const getDb = () => global.cmsDb;

// 🔍 SEARCH USER
exports.searchUsers = async (query) => {
    const db = getDb();

    let filter = {};

    if (mongoose.Types.ObjectId.isValid(query)) {
        filter._id = new mongoose.Types.ObjectId(query);
    } else {
        filter.phone = Number(query);
    }

    return db.collection("users")
        .find(filter)
        .project({
            name: 1,
            phone: 1,
            email: 1
        })
        .limit(10)
        .toArray();
};

// 👤 GET USER
exports.getUser = async (userId) => {
    return getDb().collection("users").findOne(
        {
            _id: new mongoose.Types.ObjectId(userId),
            deleted: { $ne: true }
        },
        {
            projection: {
                name: 1,
                phone: 1,
                email: 1,
                wallet_balance: 1,
                total_session: 1,
                total_spent: 1,
                total_units_consumed: 1,
                charge_coin: 1,
                createdAt: 1
            }
        }
    );
};

// 🚗 VEHICLES
exports.getVehicles = async (userId) => {
    return getDb().collection("vehicles")
        .find({
            owner: new mongoose.Types.ObjectId(userId),
            deleted: { $ne: true }
        })
        .project({
            make: 1,
            model: 1,
            vin_num: 1,
            session_count: 1,
            is_autocharge_enabled: 1
        })
        .toArray();
};
// 💰 CHARGE COINS SUMMARY
exports.getChargeCoinsSummary = async (userId) => {
    const db = getDb();

    const uid = new mongoose.Types.ObjectId(userId);

    const result = await db.collection("chargecoins").aggregate([
        {
            $match: {
                user: uid
            }
        },
        {
            $group: {
                _id: null,

                // ✅ Total coins count (all records)
                totalCount: { $sum: 1 },

                // ✅ Total credited coins
                totalCredit: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0]
                    }
                },

                // ✅ Total debited coins
                totalDebit: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0]
                    }
                },

                // ✅ Available coins (NOT expired)
                availableCoins: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$type", "credit"] },
                                    { $eq: ["$is_expired", false] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        }
    ]).toArray();

    const data = result[0] || {};

    return {
        totalCount: data.totalCount || 0,
        totalCredit: data.totalCredit || 0,
        totalDebit: data.totalDebit || 0,
        availableCoins: data.availableCoins || 0
    };
};

// ⚡ BOOKINGS (data + count in parallel, no $facet)
exports.getBookings = async (userId, query) => {
    const db = getDb();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId");
    }

    const uid = new mongoose.Types.ObjectId(userId);

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate } = query;

    // ============================
    // 🔥 BUILD MATCH FILTER
    // ============================
    const match = {
        customer_user_booked: uid
    };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // ============================
    // ⚡ STEP 1: FAST PARALLEL — bookings + count
    // ============================
    const [bookings, totalBookings] = await Promise.all([
        db.collection("chargerbookings")
            .find(match)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .project({
                _id: 1,
                reservationId: 1,
                status: 1,
                connectorId: 1,
                charger: 1,
                tenant: 1,
                invoice: 1,
                estimated_amount: 1,
                estimated_units: 1,
                idTag: 1,
                schedule_datetime: 1,
                booking_type: 1,
                initiatedFrom: 1,
                is_rfid_based_booking: 1,
                booking_start: 1,
                booking_stop: 1,
                meterstart: 1,
                meterstop: 1,
                stop_reason: 1,
                createdAt: 1
            })
            .toArray(),

        db.collection("chargerbookings")
            .countDocuments(match)
    ]);

    if (bookings.length === 0) return { bookings, totalBookings };

    // ============================
    // ⚡ STEP 2: BATCH LOOKUPS (all parallel — 5 queries at once)
    // ============================
    const chargerIds = [...new Set(bookings.map(b => b.charger).filter(Boolean).map(String))];
    const tenantIds = [...new Set(bookings.map(b => b.tenant).filter(Boolean).map(String))];
    const invoiceIds = [...new Set(bookings.map(b => b.invoice).filter(Boolean).map(String))];
    const bookingIds = bookings.map(b => b._id);

    const toObjIds = (ids) => ids.map(id => new mongoose.Types.ObjectId(id));

    const [chargers, tenants, invoices, wallets, reviews] = await Promise.all([
        // 🔌 Chargers → get charger_id (OCPP ID) + charging_station ref
        chargerIds.length > 0
            ? db.collection("chargers")
                .find({ _id: { $in: toObjIds(chargerIds) } })
                .project({ charger_id: 1, charging_station: 1 })
                .toArray()
            : [],

        // 🏢 Tenants → get company name
        tenantIds.length > 0
            ? db.collection("companies")
                .find({ _id: { $in: toObjIds(tenantIds) } })
                .project({ name: 1 })
                .toArray()
            : [],

        // 🧾 Invoices → get billing fields
        invoiceIds.length > 0
            ? db.collection("invoices")
                .find({ _id: { $in: toObjIds(invoiceIds) } })
                .project({
                    invoice_no: 1,
                    price_per_unit: 1,
                    service_charge: 1,
                    subtotal: 1,
                    gst: 1,
                    total_amount: 1,
                    cashback: 1,
                    wallet_amount_used: 1
                })
                .toArray()
            : [],

        // 💰 Wallets → get debit/credit per booking
        db.collection("wallets")
            .find({ booking: { $in: bookingIds } })
            .project({ booking: 1, amount: 1, type: 1 })
            .toArray(),

        // ⭐ Reviews → get customer rating per booking
        db.collection("customerreviews")
            .find({
                booking_id: { $in: bookingIds },
                customer: uid
            })
            .project({ booking_id: 1, ratings: 1 })
            .toArray()
    ]);

    // ============================
    // ⚡ STEP 3: STATION NAMES (from charger → station)
    // ============================
    const stationIds = [...new Set(chargers.map(c => c.charging_station).filter(Boolean).map(String))];

    const stations = stationIds.length > 0
        ? await db.collection("chargingstations")
            .find({ _id: { $in: toObjIds(stationIds) } })
            .project({ name: 1 })
            .toArray()
        : [];

    // ============================
    // 🗺️ BUILD LOOKUP MAPS
    // ============================
    const stationMap = {};
    for (const s of stations) stationMap[s._id.toString()] = s.name;

    const chargerMap = {};
    for (const c of chargers) {
        chargerMap[c._id.toString()] = {
            ocppId: c.charger_id || "N/A",
            stationName: stationMap[c.charging_station?.toString()] || "N/A"
        };
    }

    const tenantMap = {};
    for (const t of tenants) tenantMap[t._id.toString()] = t.name;

    const invoiceMap = {};
    for (const inv of invoices) invoiceMap[inv._id.toString()] = inv;

    // Wallet: group by booking → sum debit & credit
    const walletMap = {};
    for (const w of wallets) {
        const bId = w.booking.toString();
        if (!walletMap[bId]) walletMap[bId] = { debit: 0, credit: 0 };
        if (w.type === "debit") walletMap[bId].debit += w.amount;
        if (w.type === "credit") walletMap[bId].credit += w.amount;
    }

    // ⭐ Reviews: map booking_id → rating number
    const reviewMap = {};
    for (const r of reviews) {
        reviewMap[r.booking_id.toString()] = r.ratings;
    }

    // ============================
    // 📎 ATTACH RESOLVED DATA TO EACH BOOKING
    // ============================
    for (const b of bookings) {
        const cInfo = chargerMap[b.charger?.toString()] || {};
        b.stationName = cInfo.stationName || "N/A";
        b.ocppId = cInfo.ocppId || "N/A";
        b.tenantName = tenantMap[b.tenant?.toString()] || "N/A";
        b.invoiceData = invoiceMap[b.invoice?.toString()] || null;
        b.walletDebit = walletMap[b._id.toString()]?.debit || 0;
        b.walletCredit = walletMap[b._id.toString()]?.credit || 0;
        b.customerRating = reviewMap[b._id.toString()] ?? null;  // ⭐ null = no review
    }

    return { bookings, totalBookings };
};