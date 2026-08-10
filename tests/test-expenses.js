const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Expense = require("../models/Expense");

async function testExpenses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔍 Testing Expense Claims logic...");

    let emp = await Employee.findOne({ status: "Active" });
    let ExpenseModel = Expense;

    if (!emp) {
      const { getTenantConnection } = require("../utils/tenantManager");
      const tenantConn = await getTenantConnection("rsr");
      const TenantEmployee = tenantConn.model("Employee", Employee.schema);
      ExpenseModel = tenantConn.model("Expense", Expense.schema);
      emp = await TenantEmployee.findOne({ status: "Active" });
    }

    if (!emp) {
      console.log("⚠️ No active employee found for expense test.");
      process.exit(0);
    }

    // 1. Submit an expense claim
    const testExpense = new ExpenseModel({
      employeeId: emp._id,
      title: "Client Meeting Lunch",
      type: "Food",
      amount: 1500,
      description: "Business lunch with client team",
      date: new Date(),
      status: "Pending"
    });
    await testExpense.save();
    console.log(`✅ Expense claim created for ${emp.firstName} - Amount: ₹${testExpense.amount}`);

    // 2. Approve Expense Claim
    testExpense.status = "Approved";
    await testExpense.save();
    console.log(`✅ Expense claim ID ${testExpense._id} updated to Approved.`);

    // 3. Cleanup
    await ExpenseModel.findByIdAndDelete(testExpense._id);
    console.log("✅ Test expense cleaned up.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Expense test error:", err);
    process.exit(1);
  }
}

testExpenses();
