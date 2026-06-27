const express = require("express");
const router = express.Router();
const Tenant = require("../models/master/Tenant");
const { getTenantConnection } = require("../utils/tenantManager");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay Client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// GET: Register Company Page
router.get("/register-company", (req, res) => {
  res.render("auth/register", { razorpayKeyId: process.env.RAZORPAY_KEY_ID });
});

// POST: Create Razorpay Order
router.post("/create-order", async (req, res) => {
  try {
    const { plan } = req.body;
    let amount = 999; // Default Starter Plan
    if (plan === "Growth") amount = 2499;
    else if (plan === "Enterprise") amount = 4999;

    const options = {
      amount: amount * 100, // Amount in paise (INR)
      currency: "INR",
      receipt: `rcpt_tenant_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID,
      planName: plan
    });
  } catch (err) {
    console.error("[Razorpay Order Creation Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Process Company Registration with Payment Verification
router.post("/register-company", async (req, res) => {
  const {
    companyName,
    tenantId,
    adminFirstName,
    adminLastName,
    adminEmail,
    adminCode,
    adminPassword,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    selectedPlan
  } = req.body;

  try {
    // 1. Validate Tenant Slug uniqueness in Master database
    const lowercaseTenantId = tenantId.toLowerCase().trim();
    const existingTenant = await Tenant.findOne({ tenantId: lowercaseTenantId });
    if (existingTenant) {
      return res.render("auth/register", {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        error: `Company ID '${tenantId}' is already taken. Please choose another.`
      });
    }

    // 2. Cryptographically verify Razorpay Payment Signature
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.render("auth/register", {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        error: "Missing payment references. Payment is required to register."
      });
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("[Payment Signature Mismatch]: Signature verification failed.");
      return res.render("auth/register", {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        error: "Payment verification failed. Invalid transaction signature."
      });
    }

    // 3. Create Tenant record in Master registry database (set active status & subscription fields)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30-day subscription cycle

    const tenant = new Tenant({
      companyName,
      tenantId: lowercaseTenantId,
      adminEmail: adminEmail.toLowerCase().trim(),
      status: "active",
      subscriptionPlan: selectedPlan || "Starter",
      paymentStatus: "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      subscriptionExpiry: expiryDate
    });
    await tenant.save();

    // 4. Establish dynamic connection to the new tenant's database
    const tenantConn = await getTenantConnection(lowercaseTenantId);

    // 5. Import model proxies and compile schemas on the new tenant connection dynamically
    const Employee = require("../models/Employee");
    const User = require("../models/User");

    const EmployeeModel = tenantConn.model("Employee", Employee.schema);
    const UserModel = tenantConn.model("User", User.schema);

    // 6. Seed the initial HR Administrator Employee record in the tenant DB
    const adminEmployee = new EmployeeModel({
      employeeCode: adminCode.toUpperCase().trim(),
      firstName: adminFirstName,
      lastName: adminLastName,
      dob: new Date("1990-01-01"), // default placeholder
      email: adminEmail.toLowerCase().trim(),
      phoneNumber: "0000000000",
      department: "HR",
      designation: "MANAGER",
      employmentType: "Full-Time",
      joiningDate: new Date(),
      status: "Active",
      createdByHR: true
    });
    await adminEmployee.save();

    // 7. Seed the linked User credentials record in the tenant DB
    const adminUser = new UserModel({
      employeeId: adminEmployee._id,
      username: adminCode.toUpperCase().trim(),
      password: adminPassword, // pre-save hook handles hashing
      isFirstLogin: false
    });
    await adminUser.save();

    console.log(`✅ Tenant '${lowercaseTenantId}' registered, verified via Razorpay, and database seeded successfully!`);

    // 8. Redirect to login page with a success message
    res.redirect(`/auth/login?success=Workspace '${companyName}' successfully deployed under the '${tenant.subscriptionPlan}' plan. You can now log in using Company ID '${lowercaseTenantId}' and username '${adminCode}'.`);

  } catch (err) {
    console.error("Error during company registration and payment integration:", err);
    res.render("auth/register", {
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      error: "An error occurred during registration and deployment: " + err.message
    });
  }
});

module.exports = router;
