const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Ticket = require("../models/Ticket");

async function testTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Testing Support Ticket API & DB Logic...");

    let emp = await Employee.findOne({ status: "Active" });
    let TicketModel = Ticket;

    if (!emp) {
      const { getTenantConnection } = require("../utils/tenantManager");
      const tenantConn = await getTenantConnection("rsr");
      const TenantEmployee = tenantConn.model("Employee", Employee.schema);
      TicketModel = tenantConn.model("Ticket", Ticket.schema);
      emp = await TenantEmployee.findOne({ status: "Active" });
    }

    if (!emp) {
      console.log("⚠️ No active employee found for ticket test.");
      process.exit(0);
    }

    // 1. Create a support ticket
    const testTicket = new TicketModel({
      employeeId: emp._id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      targetDepartment: "IT",
      category: "Software License",
      subject: "VS Code Extension Authorization",
      description: "Need approval for developer extensions.",
      priority: "Medium",
      status: "Open"
    });
    await testTicket.save();
    console.log(`✅ Support ticket created for ${emp.firstName} (ID: ${testTicket._id})`);

    // 2. Update Ticket Status
    testTicket.status = "In Progress";
    testTicket.comments.push({
      postedBy: "IT Administrator",
      role: "Manager",
      text: "Reviewing software licensing compliance."
    });
    await testTicket.save();
    console.log(`✅ Support ticket ID ${testTicket._id} status updated to: ${testTicket.status}`);

    // Cleanup
    await TicketModel.findByIdAndDelete(testTicket._id);
    console.log("✅ Test support ticket cleaned up.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Ticket test error:", err);
    process.exit(1);
  }
}

testTickets();
