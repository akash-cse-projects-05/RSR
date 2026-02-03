// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Employee = require("../models/Employee");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

router.get("/login", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.render("auth/login");
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.render("auth/login", { error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render("auth/login", { error: "Invalid credentials" });
    }

    req.session.userId = user._id; // User model ID
    req.session.employeeId = user.employeeId; // Linked Employee ID

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Change Password Page
router.get("/change-password", (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");
  res.render("auth/change-password");
});

// Process Change Password
router.post("/change-password", async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.render("auth/change-password", { error: "New passwords do not match" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/auth/login");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.render("auth/change-password", { error: "Incorrect current password" });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.redirect("/dashboard?passwordUpdated=true");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
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

    const resetUrl = `http://${req.headers.host}/auth/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || "Gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const mailOptions = {
      to: email,
      from: process.env.SMTP_EMAIL,
      subject: "RSR Aviation - Password Reset",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
        `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
        `${resetUrl}\n\n` +
        `If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    await transporter.sendMail(mailOptions);

    res.render("auth/forgot-password", { success: "An email has been sent to " + email + " with further instructions." });

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
    res.status(500).send("Error resetting password");
  }
});

module.exports = router;
