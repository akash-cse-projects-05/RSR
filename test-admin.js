require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Employee = require("./models/Employee");

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ username: "Admin" }).populate("employeeId");
    if (user) {
      console.log("Admin user found.");
      console.log("Username:", user.username);
      if (user.employeeId) {
        console.log("Employee Name:", user.employeeId.firstName, user.employeeId.lastName);
        console.log("Employee Department:", user.employeeId.department);
        console.log("Employee Designation:", user.employeeId.designation);
        console.log("Employee Status:", user.employeeId.status);
      } else {
        console.log("No linked employee record!");
      }
    } else {
      console.log("Admin user not found in DB!");
    }
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
checkAdmin();
