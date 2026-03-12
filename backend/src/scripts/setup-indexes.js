const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

async function setupIndexes() {
    console.log("Connecting to Database...");
    const dbUri = process.env.MONGO_URI;
    if (!dbUri) {
        console.error("MONGO_URI is missing from .env");
        process.exit(1);
    }

    await mongoose.connect(dbUri, { dbName: "ChargeZoneOperationEngine" });
    const db = mongoose.connection.db;
    console.log("✓ Connected to COE Database.");

    try {
        console.log("Creating indexes for ocpi_emsp_faulty_session...");
        await db.collection("ocpi_emsp_faulty_session").createIndex(
            { still_exist: 1, partyId: 1, created_at: -1 },
            { name: "faulty_session_pagination_idx", background: true }
        );
        console.log("✓ ocpi_emsp_faulty_session index created!");

        console.log("Creating indexes for ocpi_emsp_in_progressbooking...");
        await db.collection("ocpi_emsp_in_progressbooking").createIndex(
            { partyId: 1, status: 1, updatedAt: -1 },
            { name: "inprogress_pagination_idx", background: true }
        );

        // Adding index for the aggregation grouping to speed up aggregation scans
        await db.collection("ocpi_emsp_in_progressbooking").createIndex(
            { partyId: 1 },
            { name: "inprogress_agg_partyId_idx", background: true }
        );
        console.log("✓ ocpi_emsp_in_progressbooking indexes created!");

        console.log("\n🎉 All indexes successfully created for 1M+ scalability.");
    } catch (err) {
        console.error("❌ Error creating indexes:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from DB.");
        process.exit(0);
    }
}

setupIndexes();
