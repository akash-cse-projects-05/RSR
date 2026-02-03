const express = require("express");
const router = express.Router();
const Regularization = require("../models/Regularization");
const Attendance = require("../models/Attendence");
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');

// Submit a regularization request
// filepath: routes/regularization.js
router.get("/", async (req, res) => {
  const employeeId = req.session.employeeId;
  const requests = await Regularization.find({ employeeId }).sort({ createdAt: -1 });
  res.render("regularization/index", { requests });
});


router.post("/request", async (req, res) => {
  const { date, reason } = req.body;
  const employeeId = req.session.employeeId;

  // Check if already marked attendance
  const attendance = await Attendance.findOne({ employeeId, date });
  if (attendance) return res.status(400).send("Attendance already marked for this date.");

  // Check if already requested
  const existing = await Regularization.findOne({ employeeId, date });
  if (existing) return res.status(400).send("Already requested for this date.");

  // Count previous requests (limit to 3)
  const count = await Regularization.countDocuments({ employeeId });
  if (count >= 3) return res.status(400).send("Regularization limit reached.");

  await Regularization.create({ employeeId, date, reason });
  res.send("Regularization request submitted.");
});

// (Optional) HR can approve/reject requests
router.post("/review/:id", async (req, res) => {
  const { status } = req.body; // "Approved" or "Rejected"
  const reg = await Regularization.findById(req.params.id);
  if (!reg) return res.status(404).send("Request not found");
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
  res.send("Status updated.");
});


//hr route to get all the regularization requests
router.get("/hr", async (req, res) => {
  // Optionally, check if user is HR here
  const requests = await Regularization.find().populate("employeeId").sort({ createdAt: -1 });
  res.render("regularization/hr", { requests });
});

module.exports = router;









