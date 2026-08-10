// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");
const crypto = require("crypto");
const { sendEmail } = require('../utils/email');

router.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.render("auth/login", {
    company: req.query.company || "",
    success_msg: req.query.success || "",
    error: req.query.error || ""
  });
});

router.post("/login", async (req, res) => {
  const { tenantId, username, password } = req.body;
  const lowercaseTenantId = tenantId ? tenantId.toLowerCase().trim() : "";

  try {
    if (!lowercaseTenantId) {
      if (req.headers.accept?.includes('application/json') || req.body.format === 'json') {
        return res.status(400).json({ error: "Please enter your Company ID" });
      }
      return res.render("auth/login", { error: "Please enter your Company ID", company: "" });
    }

    req.session.tenantId = lowercaseTenantId;

    const { getTenantConnection } = require("../utils/tenantManager");
    let tenantConn;
    try {
      tenantConn = await getTenantConnection(lowercaseTenantId);
    } catch (dbErr) {
      req.session.tenantId = undefined;
      const isConnectionError = dbErr.name === 'MongoNetworkError' || 
                                dbErr.name === 'MongooseError' ||
                                dbErr.message.includes('connect') || 
                                dbErr.message.includes('buffering timed out') ||
                                mongoose.connection.readyState === 0 ||
                                mongoose.connection.readyState === 3;

      const errorMsg = isConnectionError 
        ? "Could not connect to cloud database, check your internet connection."
        : `Company ID '${tenantId}' not found or inactive.`;

      if (req.headers.accept?.includes('application/json') || req.body.format === 'json') {
        return res.status(isConnectionError ? 503 : 404).json({ error: errorMsg });
      }
      return res.render("auth/login", { error: errorMsg, company: tenantId });
    }

    const UserModel = tenantConn.model("User", User.schema);
    const EmployeeModel = tenantConn.model("Employee", Employee.schema);

    const user = await UserModel.findOne({ username });

    if (!user) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      return res.render("auth/login", { error: "Invalid credentials", company: tenantId });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      return res.render("auth/login", { error: "Invalid credentials", company: tenantId });
    }

    req.session.userId = user._id; // User model ID
    req.session.employeeId = user.employeeId; // Linked Employee ID

    // Check Employee Status
    const employee = await EmployeeModel.findById(user.employeeId);
    if (!employee || employee.status !== "Active") {
      req.session.destroy();
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: "Access Denied: Your account is inactive. Please contact HR." });
      }
      return res.render("auth/login", { error: "Access Denied: Your account is inactive. Please contact HR.", company: tenantId });
    }

    if (req.headers.accept?.includes('application/json')) {
      const cookieSignature = require('cookie-signature');
      const signedSid = 's:' + cookieSignature.sign(req.sessionID, process.env.SESSION_SECRET || "rsr_hrms_secret");
      return res.json({ success: true, employeeId: employee._id, employeeName: employee.firstName, tenantId: lowercaseTenantId, sessionId: signedSid });
    }
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    const isConnectionError = err.name === 'MongoNetworkError' || 
                              err.name === 'MongooseError' ||
                              err.message.includes('connect') || 
                              err.message.includes('buffering timed out') ||
                              mongoose.connection.readyState === 0 ||
                              mongoose.connection.readyState === 3;

    const errorMsg = isConnectionError 
      ? "Could not connect to cloud database, check your internet connection."
      : "System connection error. Please check your internet and try again.";

    if (req.headers.accept?.includes('application/json')) {
      return res.status(isConnectionError ? 503 : 500).json({ error: errorMsg });
    }
    res.render("auth/login", { error: errorMsg, company: tenantId || "" });
  }
});

// Change Password Page
router.get("/change-password", (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");
  res.render("auth/change-password");
});

// Process Change Password
router.post("/change-password", async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';

  if (!req.session.userId) {
    if (isJson) return res.status(401).json({ error: "Unauthorized" });
    return res.redirect("/auth/login");
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    if (isJson) return res.status(400).json({ error: "New passwords do not match" });
    return res.render("auth/change-password", { error: "New passwords do not match" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      if (isJson) return res.status(401).json({ error: "Unauthorized" });
      return res.redirect("/auth/login");
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      if (isJson) return res.status(400).json({ error: "Incorrect current password" });
      return res.render("auth/change-password", { error: "Incorrect current password" });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    if (isJson) return res.json({ success: true, message: "Password updated successfully" });
    res.redirect("/dashboard?passwordUpdated=true");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "An error occurred while updating your password." });
    res.render("auth/change-password", { error: "An error occurred while updating your password. Please try again." });
  }
});


// Forgot Password Page
router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password");
});

// Process Forgot Password
router.post("/forgot-password", async (req, res) => {
  const email = req.body.email.toLowerCase();
  try {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.render("auth/forgot-password", { error: "No account with that email address exists." });
    }

    const user = await User.findOne({ employeeId: employee._id });
    if (!user) {
      return res.render("auth/forgot-password", { error: "System error: User credentials not found." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Build reset URL and send via Resend
    const resetUrl = `${req.protocol}://${req.headers.host}/auth/reset-password/${token}`;

    await sendEmail({
      to: email,
      subject: 'RSR Aviation HRMS - Password Reset Request',
      html: `
        <p>You are receiving this because you (or someone else) requested a password reset for your account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>Or copy this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you did not request this, ignore this email — your password will remain unchanged.</p>
      `,
      text: `Password reset link: ${resetUrl}\n\nExpires in 1 hour. If you did not request this, ignore this email.`
    });

    res.render("auth/forgot-password", { success: "A password reset link has been sent to " + email + "." });

  } catch (err) {
    console.error(err);
    res.render("auth/forgot-password", { error: "Error processing request." });
  }
});

// Reset Password Page
router.get("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render("auth/forgot-password", { error: "Password reset token is invalid or has expired." });
    }

    res.render("auth/reset-password", { token: req.params.token });
  } catch (err) {
    console.error(err);
    res.redirect("/auth/forgot-password");
  }
});

// Process Reset Password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render("auth/forgot-password", { error: "Password reset token is invalid or has expired." });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.render("auth/reset-password", { error: "Passwords do not match.", token: req.params.token });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.render("auth/login", { error: "Success! Your password has been changed." });
  } catch (err) {
    console.error(err);
    res.render("auth/reset-password", { error: "Error resetting password. Please try again.", token: req.params.token });
  }
});

module.exports = router;
