const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Training = require("../models/Training");

async function testTraining() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Testing Training LMS API & DB Logic...");

    let emp = await Employee.findOne({ status: "Active" });
    let TrainingModel = Training;

    if (!emp) {
      const { getTenantConnection } = require("../utils/tenantManager");
      const tenantConn = await getTenantConnection("rsr");
      const TenantEmployee = tenantConn.model("Employee", Employee.schema);
      TrainingModel = tenantConn.model("Training", Training.schema);
      emp = await TenantEmployee.findOne({ status: "Active" });
    }

    if (!emp) {
      console.log("⚠️ No active employee found for training test.");
      process.exit(0);
    }

    // 1. Create a training module
    const testCourse = new TrainingModel({
      title: "Data Privacy & GDPR 2026",
      description: "Mandatory annual compliance course.",
      category: "Compliance",
      targetDepartment: "ALL",
      contentType: "Document",
      contentUrl: "https://example.com/gdpr-compliance.pdf",
      durationMinutes: 20,
      assignedEmployees: [{ employeeId: emp._id, status: "Pending" }]
    });
    await testCourse.save();
    console.log(`✅ Training course created: "${testCourse.title}" (ID: ${testCourse._id})`);

    // 2. Mark complete
    const record = testCourse.assignedEmployees.find(a => a.employeeId.toString() === emp._id.toString());
    if (record) {
      record.status = "Completed";
      record.completedAt = new Date();
    }
    await testCourse.save();
    console.log(`✅ Training course ID ${testCourse._id} marked as COMPLETED for ${emp.firstName}`);

    // Cleanup
    await TrainingModel.findByIdAndDelete(testCourse._id);
    console.log("✅ Test training course cleaned up.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Training test error:", err);
    process.exit(1);
  }
}

testTraining();
