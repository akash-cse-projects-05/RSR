const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendence");

async function testAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Testing Attendance API logic...");

    let emp = await Employee.findOne({ status: "Active" });
    let AttendanceModel = Attendance;

    if (!emp) {
      const { getTenantConnection } = require("../utils/tenantManager");
      const tenantConn = await getTenantConnection("rsr");
      const TenantEmployee = tenantConn.model("Employee", Employee.schema);
      AttendanceModel = tenantConn.model("Attendance", Attendance.schema);
      emp = await TenantEmployee.findOne({ status: "Active" });
    }

    if (!emp) {
      console.log("⚠️ No active employee found for attendance test.");
      process.exit(0);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    
    // Simulate Punch In
    let record = await AttendanceModel.findOne({ employeeId: emp._id, date: todayStr });
    if (!record) {
      record = new AttendanceModel({
        employeeId: emp._id,
        date: todayStr,
        punchInTime: new Date(),
        punchInAddress: "Test Office HQ, Bangalore",
        status: "PUNCHED_IN"
      });
      await record.save();
      console.log(`✅ Punch In recorded for ${emp.firstName} at ${record.punchInAddress}`);
    } else {
      console.log(`✅ Existing attendance record found for ${emp.firstName}: ${record.status}`);
    }

    // Verify Attendance query
    const todayRecords = await AttendanceModel.find({ date: todayStr });
    console.log(`✅ Today Total Attendance Records: ${todayRecords.length}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Attendance test error:", err);
    process.exit(1);
  }
}

testAttendance();
