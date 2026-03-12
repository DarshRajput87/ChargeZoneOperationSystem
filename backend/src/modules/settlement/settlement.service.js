const axios = require("axios");
const { ObjectId } = require("mongodb");

// Import existing payload builder
const { buildPayload } = require("../cdr-recovery/cdr.service");

const POST_URL = "https://api.chargecloud.net/ocpi/emsp/2.2/cdrs";
const COE_COLLECTION = "ocpi_emsp_in_progressbooking";

// ─── Helper ──────────────────────────────────────────────────────────────────
const toObjectId = (val) => {
    if (!val) return null;
    if (val instanceof ObjectId) return val;
    try { return new ObjectId(String(val)); } catch { return null; }
};


/*
    Build settlement payload for preview
    Used when user clicks "Settle" button
*/
exports.previewSettlement = async (db, bookingId) => {
    try {

        const result = await buildPayload(db, bookingId);

        if (result.error) {
            return {
                success: false,
                error: result.error
            };
        }

        return {
            success: true,
            payload: result.payload,
            token: result.token,
            bookingStatus: result.bookingStatus
        };

    } catch (error) {

        return {
            success: false,
            error: error.message
        };

    }
};


/*
    Push settlement (Send CDR to ChargeCloud)
    Used when user clicks "Close Session"
*/
exports.pushSettlement = async (payload, token) => {

    try {

        const response = await axios.post(
            POST_URL,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${token}`
                }
            }
        );

        return {
            success: true,
            status: response.status,
            data: response.data
        };

    } catch (error) {

        return {
            success: false,
            status: error.response?.status || 500,
            error: error.response?.data || error.message
        };

    }

};


/*
    Post-settle update
    ──────────────────
    Called automatically after pushSettlement.
    - Stamps ui_updated: true/false on the COE record.
    - Checks the prod chargerbookings collection to confirm
      whether the booking is now "completed".
    - Writes settledAt timestamp.

    @param {Db}     coeDb      - COE database (global.coeDb)
    @param {Db}     cmsDb      - Prod CMS database (global.cmsDb)
    @param {string} bookingId  - The booking ID (authorization_reference)
    @param {boolean} pushOk    - Whether the CDR push succeeded
*/
exports.postSettleUpdate = async (coeDb, cmsDb, bookingId, pushOk) => {

    try {

        // ── 1. Check prod DB for booking completion status ──────────────
        let prodCompleted = false;

        const bookingObjId = toObjectId(bookingId);

        if (bookingObjId) {

            const prodBooking = await cmsDb
                .collection("chargerbookings")
                .findOne(
                    { _id: bookingObjId },
                    { projection: { status: 1 } }
                );

            if (prodBooking?.status) {
                prodCompleted =
                    prodBooking.status.toLowerCase() === "completed";
            }
        }

        // ── 2. Update COE record ────────────────────────────────────────
        await coeDb.collection(COE_COLLECTION).updateOne(
            { bookingId: toObjectId(bookingId) },
            {
                $set: {
                    ui_updated: pushOk === true,
                    prodCompleted,
                    settledAt: new Date()
                }
            }
        );

        return { ui_updated: pushOk === true, prodCompleted };

    } catch (err) {

        console.error("[SETTLE-UPDATE] Failed to stamp COE record:", err.message);

        // Non-fatal – return defaults so caller doesn't crash
        return { ui_updated: false, prodCompleted: false };

    }

};