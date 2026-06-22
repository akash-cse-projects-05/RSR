require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Employee = require("./models/Employee");

async function checkHR() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find employees in HR department
    const hrEmployees = await Employee.find({ department: "HR" });
    console.log("HR Employees found:", hrEmployees.length);
    for (const emp of hrEmployees) {
      const user = await User.findOne({ employeeId: emp._id });
      console.log(`Employee: ${emp.firstName} ${emp.lastName}, Code: ${emp.employeeCode}, Username: ${user ? user.username : 'NO USER RECORD'}`);
    }
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
checkHR();
