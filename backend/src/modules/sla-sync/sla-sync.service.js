const { ObjectId } = require("mongodb");

const COE_COLLECTION = "ocpi_emsp_in_progressbooking";

/**
 * Safely convert a value to a MongoDB ObjectId.
 * Returns null if the value is not a valid ObjectId string.
 */
const toObjectId = (val) => {
    if (!val) return null;
    if (val instanceof ObjectId) return val;
    try {
        return new ObjectId(String(val));
    } catch {
        return null;
    }
};

/**
 * syncSlaStatuses
 * ───────────────
 * Runs every hour (scheduled from server.js).
 *
 * For every COE record that is still "in_progress":
 *  1. Look up the corresponding booking in the prod CMS DB
 *     (chargerbookings collection) via the authorization_reference
 *     field, which equals the booking _id in prod.
 *  2. If the prod booking status differs from "in_progress",
 *     update the COE record with the new status and timestamp.
 *
 * @param {Db} coeDb  - COE MongoDB database handle (global.coeDb)
 * @param {Db} cmsDb  - Prod CMS MongoDB database handle (global.cmsDb)
 */
exports.syncSlaStatuses = async (coeDb, cmsDb) => {

    const tag = "[SLA-SYNC]";

    try {

        // ─── 1. Fetch all in-progress records from COE ─────────────────────
        const coeRecords = await coeDb
            .collection(COE_COLLECTION)
            .find({ status: "in_progress" })
            .toArray();

        if (!coeRecords.length) {
            console.log(`${tag} No in-progress sessions found. Skipping.`);
            return;
        }

        console.log(`${tag} Cron started – checking ${coeRecords.length} session(s)...`);

        let updated = 0;
        let unchanged = 0;
        let notFound = 0;

        // ─── 2. Check each record against the prod DB ──────────────────────
        for (const record of coeRecords) {

            const bookingObjId = toObjectId(record.bookingId);

            if (!bookingObjId) {
                console.warn(
                    `${tag} Skipping record ${record._id} – missing/invalid bookingId:`,
                    record.bookingId
                );
                notFound++;
                continue;
            }

            // Look up the booking in the prod CMS DB
            const prodBooking = await cmsDb
                .collection("chargerbookings")
                .findOne(
                    { _id: bookingObjId },
                    { projection: { status: 1 } }
                );

            if (!prodBooking) {
                console.warn(
                    `${tag} Booking not found in prod for bookingId: ${record.bookingId}`
                );
                notFound++;
                continue;
            }

            const prodStatus = prodBooking.status;           // raw prod value
            const prodStatusLower = prodStatus?.toLowerCase(); // e.g. "completed"

            // Only update if the prod status is different from "in_progress"
            if (prodStatusLower === "in_progress" || !prodStatusLower) {
                unchanged++;
                continue;
            }

            // ─── 3. Update the COE record ─────────────────────────────────────
            await coeDb.collection(COE_COLLECTION).updateOne(
                { _id: record._id },
                {
                    $set: {
                        status: prodStatusLower,
                        prodStatus: prodStatus,
                        prodStatusSyncedAt: new Date()
                    }
                }
            );

            console.log(
                `${tag} Updated record ${record._id} → status: "${prodStatusLower}" (prod: "${prodStatus}")`
            );

            updated++;
        }

        console.log(
            `${tag} Done. updated=${updated}, unchanged=${unchanged}, notFound=${notFound}`
        );

    } catch (err) {
        console.error(`${tag} Error during sync:`, err.message);
    }

};
