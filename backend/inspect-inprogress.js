require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const mongoose = require("mongoose");

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "ChargeZoneOperationEngine" });
    const db = mongoose.connection.db;
    const docs = await db.collection("ocpi_emsp_in_progressbooking").find({}).limit(3).toArray();
    console.log(JSON.stringify(docs, null, 2));
    await mongoose.disconnect();
})();
