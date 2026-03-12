require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./modules/auth/auth.model");

async function checkAdmin() {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "ChargeZoneOperationEngine" });

    const user = await User.findOne({ email: "admin@chargezone.co.in" });

    if (!user) {
        console.log("❌ User NOT found in DB");
        process.exit(1);
    }

    console.log("✅ User found:", { name: user.name, email: user.email, role: user.role, status: user.status });
    console.log("   Password hash:", user.password);

    const passwords = ["Admin@123", "admin123", "Admin123", "admin@123"];
    for (const pw of passwords) {
        const match = await bcrypt.compare(pw, user.password);
        console.log(`Password [${pw}] -> ${match ? 'MATCH' : 'FAIL'}`);
    }

    process.exit();
}

checkAdmin();
