const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Leave = require("../models/Leave");

async function testLeaves() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Testing Leave Management logic...");

    let emp = await Employee.findOne({ status: "Active" });
    let LeaveModel = Leave;

    if (!emp) {
      const { getTenantConnection } = require("../utils/tenantManager");
      const tenantConn = await getTenantConnection("rsr");
      const TenantEmployee = tenantConn.model("Employee", Employee.schema);
      LeaveModel = tenantConn.model("Leave", Leave.schema);
      emp = await TenantEmployee.findOne({ status: "Active" });
    }

    if (!emp) {
      console.log("⚠️ No active employee found for leave test.");
      process.exit(0);
    }

    // 1. Create a test leave request
    const testLeave = new LeaveModel({
      employeeId: emp._id,
      department: emp.department || "IT",
      employeeName: `${emp.firstName} ${emp.lastName}`,
      leaveType: "Casual",
      fromDate: "2026-08-01",
      toDate: "2026-08-02",
      totalDays: 2,
      reason: "Automated System Integration Test",
      status: "PENDING"
    });
    await testLeave.save();
    console.log(`✅ Leave application created for ${emp.firstName} (ID: ${testLeave._id})`);

    // 2. Simulate HR Approval
    testLeave.status = "APPROVED";
    testLeave.hrRemark = "Approved via System Test";
    await testLeave.save();
    console.log(`✅ Leave ID ${testLeave._id} updated to APPROVED.`);

    // 3. Fetch leaves summary
    const myLeaves = await LeaveModel.find({ employeeId: emp._id });
    console.log(`✅ Total leave applications for ${emp.firstName}: ${myLeaves.length}`);

    // Cleanup test leave
    await LeaveModel.findByIdAndDelete(testLeave._id);
    console.log("✅ Test leave cleaned up.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Leave test error:", err);
    process.exit(1);
  }
}

testLeaves();
