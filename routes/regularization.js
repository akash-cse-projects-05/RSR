const express = require("express");
const router = express.Router();
const Regularization = require("../models/Regularization");
const Attendance = require("../models/Attendence");
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');

// Submit a regularization request
router.get("/", async (req, res) => {
  try {
    const employeeId = req.session.employeeId;
    const requests = await Regularization.find({ employeeId }).sort({ createdAt: -1 });
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ requests });
    }
    res.render("regularization/index", { requests });
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: "Failed to load requests" });
    }
    res.status(500).send("Error loading page");
  }
});

router.post("/request", async (req, res) => {
  try {
    const { date, reason } = req.body;
    const employeeId = req.session.employeeId;

    // Check if already marked attendance
    const attendance = await Attendance.findOne({ employeeId, date });
    if (attendance) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ error: "Attendance already marked for this date." });
      }
      return res.status(400).send("Attendance already marked for this date.");
    }

    // Check if already requested
    const existing = await Regularization.findOne({ employeeId, date });
    if (existing) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ error: "Already requested for this date." });
      }
      return res.status(400).send("Already requested for this date.");
    }

    // Count previous requests (limit to 3)
    const count = await Regularization.countDocuments({ employeeId });
    if (count >= 3) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ error: "Regularization limit reached." });
      }
      return res.status(400).send("Regularization limit reached.");
    }

    const created = await Regularization.create({ employeeId, date, reason });
    if (req.headers.accept?.includes('application/json') || req.body.format === 'json') {
      return res.json({ success: true, request: created });
    }
    res.redirect('/regularization/hr');
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: err.message });
    }
    res.status(500).send("Error processing request");
  }
});

// HR can approve/reject requests
router.post("/review/:id", async (req, res) => {
  try {
    const { status } = req.body; // "Approved" or "Rejected"
    const reg = await Regularization.findById(req.params.id);
    if (!reg) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(404).json({ error: "Request not found" });
      }
      return res.status(404).send("Request not found");
    }
    reg.status = status;
    await reg.save();

    if (status === "Approved") {
      // Deduct salary for regularization (treat as LOP)
      const employee = await Employee.findById(reg.employeeId);
      if (employee) {
        const dateObj = new Date(reg.date);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        const payslip = await Payslip.findOne({ employee: employee._id, month, year });
        if (payslip) {
          const perDay = payslip.basicSalary / 31;
          payslip.deductions += perDay;
          payslip.netPay -= perDay;
          payslip.deductionDetails = payslip.deductionDetails || [];
          payslip.deductionDetails.push({
            type: 'REGULARIZATION',
            label: `Regularization (Loss of Pay) for ${reg.date}`,
            amount: perDay
          });
          await payslip.save();
        }
      }
    }
    
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, request: reg });
    }
    res.redirect('/regularization/hr');
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: err.message });
    }
    res.status(500).send("Error reviewing request");
  }
});

// hr route to get all the regularization requests
router.get("/hr", async (req, res) => {
  try {
    const requests = await Regularization.find().populate("employeeId").sort({ createdAt: -1 });
    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.json({ requests });
    }
    res.render("regularization/hr", { requests });
  } catch (err) {
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ error: "Failed to load requests" });
    }
    res.status(500).send("Error loading page");
  }
});

module.exports = router;









