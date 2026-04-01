const mongoose = require("mongoose");

const getDb = () => global.cmsDb;

// ─────────────────────────────────────────────
// ⚡ REQUIRED INDEXES — Run once in MongoDB shell or migration
// These are the #1 performance lever. Without them, nothing else matters.
//
// db.users.createIndex({ role: 1, deleted: 1, createdAt: -1 })
// db.users.createIndex({ role: 1, deleted: 1, phone: 1 })
// db.users.createIndex({ role: 1, deleted: 1, name: 1 })
// db.users.createIndex({ role: 1, deleted: 1, email: 1 })
//
// db.chargerbookings.createIndex({ customer_user_booked: 1, status: 1, payment_status: 1, updatedAt: -1 })
// db.chargerbookings.createIndex({ status: 1, payment_status: 1, updatedAt: -1, customer_user_booked: 1 })
//
// db.customerreviews.createIndex({ customer: 1, createdAt: -1 })
// db.customerreviews.createIndex({ booking_id: 1, customer: 1 })
//
// db.vehicles.createIndex({ owner: 1, deleted: 1 })
// db.chargecoins.createIndex({ user: 1, type: 1, is_expired: 1 })
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 🔧 SEGMENT CLASSIFIER (pure JS, no DB)
// ─────────────────────────────────────────────
const classifySegment = (user, lastBooking, totalBookings, refDate) => {
  const minus30 = new Date(refDate - 30 * 24 * 60 * 60 * 1000);
  const minus90 = new Date(refDate - 90 * 24 * 60 * 60 * 1000);

  if (user.createdAt >= minus30 && totalBookings > 0) return "new_active";
  if (user.createdAt >= minus30) return "new_inactive";
  if (lastBooking && lastBooking >= minus30) return "active";
  if (lastBooking && lastBooking >= minus90) return "dormant";
  return "churned";
};

// ─────────────────────────────────────────────
// 🔧 SHARED SEGMENT STAGES (single-user profile only)
// ─────────────────────────────────────────────
const getSegmentStages = (referenceDate) => {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate || Date.now());
  return [
    {
      $lookup: {
        from: "chargerbookings",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$customer_user_booked", "$$userId"] },
                  { $eq: ["$status", "completed"] },
                  { $eq: ["$payment_status", "done"] },
                  { $lte: ["$updatedAt", ref] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              last_booking: { $max: "$updatedAt" },
              total_bookings: { $sum: 1 }
            }
          }
        ],
        as: "stats"
      }
    },
    {
      $addFields: {
        last_booking: { $arrayElemAt: ["$stats.last_booking", 0] },
        total_bookings: { $ifNull: [{ $arrayElemAt: ["$stats.total_bookings", 0] }, 0] }
      }
    },
    {
      $addFields: {
        segment: {
          $let: {
            vars: {
              minus30: { $dateSubtract: { startDate: ref, unit: "day", amount: 30 } },
              minus90: { $dateSubtract: { startDate: ref, unit: "day", amount: 90 } }
            },
            in: {
              $switch: {
                branches: [
                  { case: { $and: [{ $gte: ["$createdAt", "$$minus30"] }, { $gt: ["$total_bookings", 0] }] }, then: "new_active" },
                  { case: { $gte: ["$createdAt", "$$minus30"] }, then: "new_inactive" },
                  { case: { $gte: ["$last_booking", "$$minus30"] }, then: "active" },
                  { case: { $gte: ["$last_booking", "$$minus90"] }, then: "dormant" }
                ],
                default: "churned"
              }
            }
          }
        }
      }
    },
    { $unset: "stats" }
  ];
};

// ─────────────────────────────────────────────
// 📎 ATTACH FEEDBACK — batched, page-only (unchanged, already optimal)
// ─────────────────────────────────────────────
const attachFeedback = async (db, users) => {
  if (!users.length) return users;
  const userIds = users.map(u => u._id);

  // Uses index: { customer: 1, createdAt: -1 }
  // $group deduplicates per customer cheaply
  const reviews = await db.collection("customerreviews").aggregate([
    { $match: { customer: { $in: userIds }, feedback: { $exists: true, $ne: null } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$customer", feedback: { $first: "$feedback" }, ratings: { $first: "$ratings" } } }
  ]).toArray();

  const reviewMap = {};
  for (const r of reviews) reviewMap[r._id.toString()] = r;

  for (const u of users) {
    const rev = reviewMap[u._id.toString()];
    u.latestFeedback = rev?.feedback?.trim() || null;
    u.latestRating = rev?.ratings ?? null;
  }
  return users;
};

// ─────────────────────────────────────────────
// 🔍 SEARCH USERS  ← MAIN OPTIMIZATION TARGET
//
// OLD FLOW (slow):
//   1. Fetch ALL matching users into memory (could be 10k+)
//   2. Fetch booking stats for ALL of them in one giant $in
//   3. Classify + filter in JS → paginate
//   Problem: loads 10k docs, 10k-user $in on bookings = slow
//
// NEW FLOW (fast):
//   1. Pre-filter IDs from small collections (feedback, bookings) — unchanged
//   2. COUNT total after segment awareness WITHOUT loading all docs
//   3. Use SKIP+LIMIT at DB level with a smarter two-pass strategy:
//      - If segment filter: fetch all IDs + stats in one lean pipeline, classify, paginate in JS
//        but project only _id + createdAt (tiny docs) → much less data transferred
//      - If no segment filter: pure DB-side skip/limit on users, then batch stats only for page
//   4. Fetch full user docs only for the current page (20 max)
// ─────────────────────────────────────────────
exports.searchUsers = async (query, filters = {}, page = 1, limit = 20) => {
  const db = getDb();
  const { startDate, endDate, segment, hasFeedback, ratings } = filters;
  const skip = (page - 1) * limit;
  const refDate = endDate ? new Date(endDate) : new Date();

  // ── Base user match ──────────────────────────
  const userMatch = { role: "customer", deleted: { $ne: true } };

  if (query && query.trim()) {
    const q = query.trim();
    if (mongoose.Types.ObjectId.isValid(q)) {
      userMatch._id = new mongoose.Types.ObjectId(q);
    } else {
      const num = Number(q);
      if (!isNaN(num)) {
        userMatch.phone = num;
      } else {
        const esc = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        userMatch.$or = [
          { name: { $regex: esc, $options: "i" } },
          { email: { $regex: esc, $options: "i" } }
        ];
      }
    }
  }

  // ── PRE-FILTER 1: Feedback/ratings → resolve user IDs ───
  let feedbackUserIds = null;
  if (hasFeedback || (ratings && ratings.length > 0)) {
    const feedbackPipeline = [
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$customer", latestFeedback: { $first: "$feedback" }, latestRating: { $first: "$ratings" } } }
    ];
    const feedbackMatch = {};
    if (hasFeedback) feedbackMatch.latestFeedback = { $exists: true, $ne: null, $not: /^\s*$/ };
    if (ratings && ratings.length > 0) feedbackMatch.latestRating = { $in: ratings.map(Number) };
    feedbackPipeline.push({ $match: feedbackMatch });
    // Only need IDs — project only _id (smaller transfer)
    feedbackPipeline.push({ $project: { _id: 1 } });

    const reviewDocs = await db.collection("customerreviews").aggregate(feedbackPipeline).toArray();
    feedbackUserIds = reviewDocs.map(d => d._id?.toString()).filter(Boolean);
    if (!feedbackUserIds.length) return { users: [], total: 0, page, totalPages: 0 };
  }

  // ── PRE-FILTER 2: Date range → active user IDs from bookings ──
  let dateUserIds = null;
  if (startDate || endDate) {
    const bookingMatch = { status: "completed", payment_status: "done" };
    if (startDate) bookingMatch.updatedAt = { $gte: new Date(startDate) };
    if (endDate) { bookingMatch.updatedAt = bookingMatch.updatedAt || {}; bookingMatch.updatedAt.$lte = new Date(endDate); }

    // Project only the grouped _id — uses the compound index efficiently
    const activeDocs = await db.collection("chargerbookings")
      .aggregate([
        { $match: bookingMatch },
        { $group: { _id: "$customer_user_booked" } }
      ], { allowDiskUse: false }) // fits in RAM with index
      .toArray();

    dateUserIds = activeDocs.map(d => d._id?.toString()).filter(Boolean);
    if (!dateUserIds.length) return { users: [], total: 0, page, totalPages: 0 };
  }

  // ── Merge ID sets (intersection) ────────────
  let resolvedIds = null;
  if (feedbackUserIds && dateUserIds) {
    const dateSet = new Set(dateUserIds);
    resolvedIds = feedbackUserIds.filter(id => dateSet.has(id));
  } else if (feedbackUserIds) {
    resolvedIds = feedbackUserIds;
  } else if (dateUserIds) {
    resolvedIds = dateUserIds;
  }

  if (resolvedIds !== null) {
    if (!resolvedIds.length) return { users: [], total: 0, page, totalPages: 0 };
    const objIds = resolvedIds.map(id => new mongoose.Types.ObjectId(id));
    if (userMatch._id && !userMatch._id.$in) {
      if (!objIds.find(id => id.equals(userMatch._id))) return { users: [], total: 0, page, totalPages: 0 };
    } else {
      userMatch._id = { $in: objIds };
    }
  }

  // ─────────────────────────────────────────────
  // FAST PATH: No segment filter
  // DB handles skip/limit — only fetch page-size user docs + stats
  // ─────────────────────────────────────────────
  if (!segment) {
    // COUNT and PAGE happen at DB level — never loads full result set
    const [total, pageUsers] = await Promise.all([
      db.collection("users").countDocuments(userMatch),
      db.collection("users")
        .find(userMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ name: 1, phone: 1, email: 1, createdAt: 1 })
        .toArray()
    ]);

    if (!pageUsers.length) return { users: [], total, page, totalPages: Math.ceil(total / limit) };

    // Stats only for this page (20 users max) — tiny $in
    const pageIds = pageUsers.map(u => u._id);
    const bookingStats = await db.collection("chargerbookings").aggregate([
      {
        $match: {
          customer_user_booked: { $in: pageIds },
          status: "completed",
          payment_status: "done",
          updatedAt: { $lte: refDate }
        }
      },
      { $group: { _id: "$customer_user_booked", last_booking: { $max: "$updatedAt" }, total_bookings: { $sum: 1 } } }
    ]).toArray();

    const statsMap = {};
    for (const s of bookingStats) statsMap[s._id.toString()] = s;

    for (const u of pageUsers) {
      const s = statsMap[u._id.toString()] || { last_booking: null, total_bookings: 0 };
      u.last_booking = s.last_booking;
      u.segment = classifySegment(u, s.last_booking, s.total_bookings, refDate);
    }

    await attachFeedback(db, pageUsers);
    return { users: pageUsers, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────────
  // SEGMENT PATH: Need to classify ALL matched users to filter by segment
  // Optimization: fetch only _id + createdAt (tiny docs, ~40 bytes each)
  // then batch stats, classify in JS, paginate, THEN fetch full docs for page only
  // ─────────────────────────────────────────────

  // Step A: Lean fetch — only fields needed for classifySegment
  const leanUsers = await db.collection("users")
    .find(userMatch)
    .sort({ createdAt: -1 })
    .project({ createdAt: 1 }) // _id always included; createdAt needed for new_* segments
    .toArray();

  if (!leanUsers.length) return { users: [], total: 0, page, totalPages: 0 };

  // Step B: Batch booking stats for ALL lean users in ONE query
  // Still a large $in but only returns aggregated rows (not raw booking docs)
  const allUserIds = leanUsers.map(u => u._id);

  const bookingStats = await db.collection("chargerbookings").aggregate([
    {
      $match: {
        customer_user_booked: { $in: allUserIds },
        status: "completed",
        payment_status: "done",
        updatedAt: { $lte: refDate }
      }
    },
    {
      $group: {
        _id: "$customer_user_booked",
        last_booking: { $max: "$updatedAt" },
        total_bookings: { $sum: 1 }
      }
    }
  ], { allowDiskUse: true }).toArray(); // allow disk for large sets

  const statsMap = {};
  for (const s of bookingStats) statsMap[s._id.toString()] = s;

  // Step C: Classify in JS and filter by segment — pure memory ops
  const segmentMatched = [];
  for (const u of leanUsers) {
    const s = statsMap[u._id.toString()] || { last_booking: null, total_bookings: 0 };
    const seg = classifySegment(u, s.last_booking, s.total_bookings, refDate);
    if (seg === segment) {
      segmentMatched.push({ _id: u._id, last_booking: s.last_booking });
    }
  }

  const total = segmentMatched.length;
  if (!total) return { users: [], total: 0, page, totalPages: 0 };

  // Step D: Paginate the matched IDs (in-memory slice — cheap)
  const pageSlice = segmentMatched.slice(skip, skip + limit);
  const pageIds = pageSlice.map(s => s._id);

  // Step E: Fetch FULL user docs only for current page (20 max) — tiny query
  const fullUsers = await db.collection("users")
    .find({ _id: { $in: pageIds } })
    .project({ name: 1, phone: 1, email: 1, createdAt: 1 })
    .toArray();

  // Preserve sort order from segmentMatched
  const userMap = {};
  for (const u of fullUsers) userMap[u._id.toString()] = u;

  const pageUsers = pageSlice.map(s => {
    const u = userMap[s._id.toString()];
    if (!u) return null;
    u.last_booking = s.last_booking;
    u.segment = segment;
    return u;
  }).filter(Boolean);

  // Step F: Attach feedback only for page
  await attachFeedback(db, pageUsers);

  return { users: pageUsers, total, page, totalPages: Math.ceil(total / limit) };
};

// ─────────────────────────────────────────────
// 👤 GET USER
// ─────────────────────────────────────────────
exports.getUser = async (userId) => {
  return getDb().collection("users").findOne(
    { _id: new mongoose.Types.ObjectId(userId), deleted: { $ne: true } },
    {
      projection: {
        name: 1, phone: 1, email: 1, wallet_balance: 1,
        total_session: 1, total_spent: 1, total_units_consumed: 1,
        chargecoins_v2: 1, createdAt: 1
      }
    }
  );
};

// ─────────────────────────────────────────────
// 🚗 VEHICLES
// ─────────────────────────────────────────────
exports.getVehicles = async (userId) => {
  return getDb().collection("vehicles")
    .find({ owner: new mongoose.Types.ObjectId(userId), deleted: { $ne: true } })
    .project({ make: 1, model: 1, vin_num: 1, session_count: 1, is_autocharge_enabled: 1 })
    .toArray();
};

// ─────────────────────────────────────────────
// 💰 CHARGE COINS SUMMARY
// ─────────────────────────────────────────────
exports.getChargeCoinsSummary = async (userId) => {
  const db = getDb();
  const uid = new mongoose.Types.ObjectId(userId);

  const result = await db.collection("chargecoins").aggregate([
    { $match: { user: uid } },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalCredit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
        totalDebit: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] } },
        availableCoins: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$type", "credit"] }, { $eq: ["$is_expired", false] }] },
              "$amount", 0
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

// ─────────────────────────────────────────────
// ⚡ BOOKINGS
// ─────────────────────────────────────────────
exports.getBookings = async (userId, query) => {
  const db = getDb();
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");

  const uid = new mongoose.Types.ObjectId(userId);
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  const { startDate, endDate } = query;

  const match = { customer_user_booked: uid };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [bookings, totalBookings] = await Promise.all([
    db.collection("chargerbookings")
      .find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .project({
        _id: 1, reservationId: 1, status: 1, connectorId: 1, charger: 1,
        tenant: 1, invoice: 1, estimated_amount: 1, estimated_units: 1,
        idTag: 1, schedule_datetime: 1, booking_type: 1, initiatedFrom: 1,
        is_rfid_based_booking: 1, booking_start: 1, booking_stop: 1,
        meterstart: 1, meterstop: 1, stop_reason: 1, createdAt: 1
      })
      .toArray(),
    db.collection("chargerbookings").countDocuments(match)
  ]);

  if (!bookings.length) return { bookings, totalBookings };

  const chargerIds = [...new Set(bookings.map(b => b.charger).filter(Boolean).map(String))];
  const tenantIds = [...new Set(bookings.map(b => b.tenant).filter(Boolean).map(String))];
  const invoiceIds = [...new Set(bookings.map(b => b.invoice).filter(Boolean).map(String))];
  const bookingIds = bookings.map(b => b._id);
  const toObjIds = (ids) => ids.map(id => new mongoose.Types.ObjectId(id));

  const [chargers, tenants, invoices, wallets, reviews] = await Promise.all([
    chargerIds.length > 0
      ? db.collection("chargers").find({ _id: { $in: toObjIds(chargerIds) } }).project({ charger_id: 1, charging_station: 1 }).toArray()
      : [],
    tenantIds.length > 0
      ? db.collection("companies").find({ _id: { $in: toObjIds(tenantIds) } }).project({ name: 1 }).toArray()
      : [],
    invoiceIds.length > 0
      ? db.collection("invoices").find({ _id: { $in: toObjIds(invoiceIds) } }).project({
        invoice_no: 1, price_per_unit: 1, service_charge: 1,
        subtotal: 1, gst: 1, total_amount: 1, cashback: 1, wallet_amount_used: 1
      }).toArray()
      : [],
    db.collection("wallets").find({ booking: { $in: bookingIds } }).project({ booking: 1, amount: 1, type: 1 }).toArray(),
    db.collection("customerreviews").find({ booking_id: { $in: bookingIds }, customer: uid }).project({ booking_id: 1, ratings: 1 }).toArray()
  ]);

  const stationIds = [...new Set(chargers.map(c => c.charging_station).filter(Boolean).map(String))];
  const stations = stationIds.length > 0
    ? await db.collection("chargingstations").find({ _id: { $in: toObjIds(stationIds) } }).project({ name: 1 }).toArray()
    : [];

  const stationMap = {};
  for (const s of stations) stationMap[s._id.toString()] = s.name;

  const chargerMap = {};
  for (const c of chargers) chargerMap[c._id.toString()] = { ocppId: c.charger_id || "N/A", stationName: stationMap[c.charging_station?.toString()] || "N/A" };

  const tenantMap = {};
  for (const t of tenants) tenantMap[t._id.toString()] = t.name;

  const invoiceMap = {};
  for (const inv of invoices) invoiceMap[inv._id.toString()] = inv;

  const walletMap = {};
  for (const w of wallets) {
    const bId = w.booking.toString();
    if (!walletMap[bId]) walletMap[bId] = { debit: 0, credit: 0 };
    if (w.type === "debit") walletMap[bId].debit += w.amount;
    if (w.type === "credit") walletMap[bId].credit += w.amount;
  }

  const reviewMap = {};
  for (const r of reviews) reviewMap[r.booking_id.toString()] = r.ratings;

  for (const b of bookings) {
    const cInfo = chargerMap[b.charger?.toString()] || {};
    b.stationName = cInfo.stationName || "N/A";
    b.ocppId = cInfo.ocppId || "N/A";
    b.tenantName = tenantMap[b.tenant?.toString()] || "N/A";
    b.invoiceData = invoiceMap[b.invoice?.toString()] || null;
    b.walletDebit = walletMap[b._id.toString()]?.debit || 0;
    b.walletCredit = walletMap[b._id.toString()]?.credit || 0;
    b.customerRating = reviewMap[b._id.toString()] ?? null;
  }

  return { bookings, totalBookings };
};

// ─────────────────────────────────────────────
// 📊 USER SEGMENT — single user, $lookup fine
// ─────────────────────────────────────────────
exports.getUserSegment = async (userId, referenceDate) => {
  const db = getDb();
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    ...getSegmentStages(referenceDate || new Date()),
    { $project: { _id: 1, role: 1, createdAt: 1, last_booking: 1, total_bookings: 1, segment: 1 } }
  ];

  const result = await db.collection("users").aggregate(pipeline).toArray();
  return result[0] || null;
};

// ─────────────────────────────────────────────
// ⭐ USER RATINGS
// ─────────────────────────────────────────────
exports.getUserRatingStats = async (userId) => {
  const db = getDb();
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");

  const uid = new mongoose.Types.ObjectId(userId);
  const ratings = await db.collection("customerreviews")
    .find({ customer: uid })
    .project({ ratings: 1 })
    .toArray();

  if (!ratings.length) return { average: 0, count: 0, distribution: [] };

  let sum = 0;
  const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(r => {
    const val = r.ratings || 0;
    sum += val;
    if (val >= 1 && val <= 5) distMap[val]++;
  });

  return {
    average: parseFloat((sum / ratings.length).toFixed(1)),
    count: ratings.length,
    distribution: [
      { rating: "1 Star", count: distMap[1] },
      { rating: "2 Stars", count: distMap[2] },
      { rating: "3 Stars", count: distMap[3] },
      { rating: "4 Stars", count: distMap[4] },
      { rating: "5 Stars", count: distMap[5] }
    ]
  };
};