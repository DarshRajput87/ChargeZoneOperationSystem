exports.bookingPipeline = (userId, { page = 1, limit = 10, startDate, endDate }) => {
    const skip = (page - 1) * limit;

    // Base match on user
    const matchStage = { customer_user_booked: userId };

    // Optional date range filter
    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.createdAt.$lte = end;
        }
    }

    return [
        { $match: matchStage },

        { $sort: { createdAt: -1 } },

        // Paginate FIRST — only 'limit' docs go through the lookups
        { $skip: skip },
        { $limit: limit },

        // Keep only needed fields before lookups
        {
            $project: {
                charger: 1,
                connectorId: 1,
                status: 1,
                createdAt: 1,
            }
        },

        // 1️⃣ Charger lookup — only fetch charging_station ref
        {
            $lookup: {
                from: "chargers",
                let: { chargerId: "$charger" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$chargerId"] } } },
                    { $project: { charging_station: 1, _id: 0 } }
                ],
                as: "_charger"
            }
        },
        { $unwind: { path: "$_charger", preserveNullAndEmptyArrays: true } },

        // 2️⃣ Station lookup — only fetch name
        {
            $lookup: {
                from: "chargingstations",
                let: { stationId: "$_charger.charging_station" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$stationId"] } } },
                    { $project: { name: 1, _id: 0 } }
                ],
                as: "_station"
            }
        },
        { $unwind: { path: "$_station", preserveNullAndEmptyArrays: true } },

        // 3️⃣ Invoice lookup
        {
            $lookup: {
                from: "invoices",
                let: { bookingId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$booking", "$$bookingId"] } } },
                    { $project: { invoice_no: 1, total_amount: 1, _id: 0 } }
                ],
                as: "invoice"
            }
        },
        { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },

        // 4️⃣ Wallet lookup
        {
            $lookup: {
                from: "wallets",
                let: { bookingId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$booking", "$$bookingId"] } } },
                    { $project: { amount: 1, type: 1, _id: 0 } }
                ],
                as: "wallets"
            }
        },

        // Compute wallet debit / credit
        {
            $addFields: {
                stationName: "$_station.name",
                walletUsed: {
                    $sum: {
                        $map: {
                            input: "$wallets",
                            as: "w",
                            in: { $cond: [{ $eq: ["$$w.type", "debit"] }, "$$w.amount", 0] }
                        }
                    }
                },
                refund: {
                    $sum: {
                        $map: {
                            input: "$wallets",
                            as: "w",
                            in: { $cond: [{ $eq: ["$$w.type", "credit"] }, "$$w.amount", 0] }
                        }
                    }
                }
            }
        },

        // Clean up temp fields
        { $project: { _charger: 0, _station: 0, wallets: 0, charger: 0 } }
    ];
};

// Lightweight count — no lookups, no $facet overhead
exports.bookingCountMatch = (userId, { startDate, endDate }) => {
    const match = { customer_user_booked: userId };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt.$lte = end;
        }
    }
    return match;
};