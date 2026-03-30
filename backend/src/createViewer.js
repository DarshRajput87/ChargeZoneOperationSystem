require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./modules/auth/auth.model");

console.log("MONGO_URI:", process.env.MONGO_URI); // debug check

async function createViewer() {
  await mongoose.connect(process.env.MONGO_URI);

  const hashed = await bcrypt.hash("Viewer@123", 10);

  // Check if viewer already exists
  const existing = await User.findOne({ email: "viewer@chargezone.co.in" });
  if (existing) {
    console.log("Viewer already exists");
    process.exit();
  }

  await User.create({
    name: "COE Viewer",
    email: "viewer@chargezone.co.in",
    password: hashed,
    role: "VIEWER",
  });

  console.log("Viewer created");
  process.exit();
}

createViewer();
