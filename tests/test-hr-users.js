const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");
const { getTenantConnection } = require("../utils/tenantManager");

async function checkHR() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let hrEmployees = await Employee.find({ department: "HR" });
    let UserModel = User;

    if (hrEmployees.length === 0) {
      const tenantConn = await getTenantConnection("rsr");
      const TenantEmployeeModel = tenantConn.model("Employee", Employee.schema);
      UserModel = tenantConn.model("User", User.schema);
      hrEmployees = await TenantEmployeeModel.find({ department: "HR" });
    }

    console.log("✅ HR Employees found:", hrEmployees.length);
    for (const emp of hrEmployees) {
      const user = await UserModel.findOne({ employeeId: emp._id });
      console.log(`Employee: ${emp.firstName} ${emp.lastName}, Code: ${emp.employeeCode}, Username: ${user ? user.username : 'NO USER RECORD'}`);
    }
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
checkHR();
