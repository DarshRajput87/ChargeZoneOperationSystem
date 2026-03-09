const axios = require("axios");

// Import existing payload builder
const { buildPayload } = require("../cdr-recovery/cdr.service");

const POST_URL = "https://api.chargecloud.net/ocpi/emsp/2.2/cdrs";


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