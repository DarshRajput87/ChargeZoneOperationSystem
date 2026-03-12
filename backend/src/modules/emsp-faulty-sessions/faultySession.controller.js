const axios = require("axios");

const FaultySessionService =
    require("./faultySession.service");


/* ─────────────────────────────────────────────
   GET FAULTY SESSIONS
───────────────────────────────────────────── */

exports.getFaultySessions = async (req, res) => {

    try {

        if (!global.coeDb) {
            return res.status(500).json({
                success: false,
                error: "COE DB not ready"
            });
        }

        const service =
            new FaultySessionService(global.coeDb);

        const result =
            await service.getSessions(req.query);

        res.json({
            success: true,
            data: result.data,
            total: result.total,
            nextCursor: result.nextCursor
        });

    } catch (err) {

        console.error("FAULTY_SESSION_ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};


/* ─────────────────────────────────────────────
   SUMMARY
───────────────────────────────────────────── */

exports.getSummary = async (req, res) => {

    try {

        if (!global.coeDb) {
            return res.status(500).json({
                success: false,
                error: "COE DB not ready"
            });
        }

        const service =
            new FaultySessionService(global.coeDb);

        const result =
            await service.getSummary();

        res.json({
            success: true,
            data: result
        });

    } catch (err) {

        console.error("FAULTY_SUMMARY_ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};


/* ─────────────────────────────────────────────
   PUSH FAULTY SESSION (SETTLE BUTTON)
───────────────────────────────────────────── */

exports.pushFaultySession = async (req, res) => {

    try {

        if (!global.coeDb) {
            return res.status(500).json({
                success: false,
                error: "COE DB not ready"
            });
        }

        const { bookingId } = req.params;

        const collection =
            global.coeDb.collection("ocpi_emsp_faulty_session");

        const doc =
            await collection.findOne({
                bookingId
            });

        if (!doc) {

            return res.status(404).json({
                success: false,
                error: "Booking not found"
            });

        }

        const tenantId = doc.tenant;

        const payload = [
            {
                booking_id: bookingId
            }
        ];

        const url =
            `https://api.chargecloud.net/ocpi/emsp/2.2/ocpifaultysession/${tenantId}`;

        const response =
            await axios.post(
                url,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OCPI_TOKEN}`,
                        "Content-Type": "application/json"
                    }
                }
            );

        res.json({
            success: true,
            message: "Faulty session pushed",
            response: response.data
        });

    } catch (err) {

        console.error("FAULTY_PUSH_ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });

    }

};