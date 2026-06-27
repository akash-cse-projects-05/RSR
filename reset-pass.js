require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function reset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ username: "HR9" });
    if (user) {
      user.password = "admin123";
      await user.save();
      console.log("Password for HR9 reset to admin123 successfully.");
    } else {
      console.log("HR9 not found in database.");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
reset();
