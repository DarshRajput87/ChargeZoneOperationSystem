require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./modules/auth/auth.model");

console.log("MONGO_URI:", process.env.MONGO_URI); // debug check

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const hashed = await bcrypt.hash("Admin@123", 10);

  await User.create({
    name: "COE Admin",
    email: "admin@chargezone.co.in",
    password: hashed,
    role: "ADMIN",
  });

  console.log("Admin created");
  process.exit();
}

createAdmin();