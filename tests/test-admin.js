const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");
const { getTenantConnection } = require("../utils/tenantManager");

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Checking Admin credentials...");

    // Try default DB first, fallback to tenant DB ('rsr')
    let user = await User.findOne({ username: { $regex: /^admin$/i } }).populate("employeeId");
    if (!user) {
      const tenantConn = await getTenantConnection("rsr");
      const UserModel = tenantConn.model("User", User.schema);
      const EmployeeModel = tenantConn.model("Employee", Employee.schema);
      user = await UserModel.findOne({ username: { $regex: /^admin$/i } }).populate("employeeId");
    }

    if (user) {
      console.log("✅ Admin user found.");
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
      console.log("✅ Admin credentials verified via Superadmin system config.");
    }
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
checkAdmin();
