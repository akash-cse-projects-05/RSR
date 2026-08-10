const express = require("express");
const router = express.Router();
const Shift = require("../models/Shift");
const Roster = require("../models/Roster");
const Employee = require("../models/Employee");

// Middleware to protect HR routes
function hrAuth(req, res, next) {
  if (!req.session.userId || req.session.role !== "HR") {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
    if (isJson) {
      return res.status(401).json({ error: "Unauthorized. HR session required." });
    }
    return res.redirect("/hr/hr-login");
  }
  next();
}

// ----------------------------------------------------
// SHIFT CONFIGURATION ENDPOINTS
// ----------------------------------------------------

// GET /hr/shifts - List all shifts
router.get("/shifts", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const shifts = await Shift.find().sort({ name: 1 });
    if (isJson) {
      return res.json({ success: true, shifts });
    }
    res.render("hr/shifts", { shifts });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to fetch shifts" });
    res.status(500).send("Error loading shifts");
  }
});

// POST /hr/shifts/add - Add new shift
router.post("/shifts/add", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { name, startTime, endTime, gracePeriod, breakDuration } = req.body;
  try {
    if (!name || !startTime || !endTime) {
      if (isJson) return res.status(400).json({ error: "Name, start time, and end time are required" });
      return res.redirect("/hr/shifts?error=missing_fields");
    }
    const newShift = await Shift.create({
      name,
      startTime,
      endTime,
      gracePeriod: gracePeriod ? parseInt(gracePeriod, 10) : 15,
      breakDuration: breakDuration ? parseInt(breakDuration, 10) : 60
    });
    if (isJson) {
      return res.json({ success: true, message: "Shift created successfully", shift: newShift });
    }
    res.redirect("/hr/shifts");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to add shift" });
    res.redirect("/hr/shifts?error=failed_to_add");
  }
});

// POST /hr/shifts/toggle/:id - Toggle active/inactive status
router.post("/shifts/toggle/:id", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      if (isJson) return res.status(404).json({ error: "Shift not found" });
      return res.redirect("/hr/shifts?error=not_found");
    }
    shift.status = shift.status === "Active" ? "Inactive" : "Active";
    await shift.save();
    if (isJson) {
      return res.json({ success: true, status: shift.status });
    }
    res.redirect("/hr/shifts");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to toggle status" });
    res.redirect("/hr/shifts?error=failed_to_toggle");
  }
});

// ----------------------------------------------------
// ROSTER CALENDAR ENDPOINTS
// ----------------------------------------------------

// GET /hr/roster - Render Roster scheduler calendar layout
router.get("/roster", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const employees = await Employee.find({ status: "Active" }).sort({ firstName: 1 });
    const shifts = await Shift.find({ status: "Active" }).sort({ name: 1 });
    
    // Roster lists for this month/week
    const startOfWeek = new Date();
    startOfWeek.setHours(0,0,0,0);
    // Find rosters starting within next 30 days or past 7 days
    const searchStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
    const searchEnd = new Date(startOfWeek.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const rosters = await Roster.find({
      startDate: { $gte: searchStart },
      endDate: { $lte: searchEnd }
    }).populate("shiftId");

    if (isJson) {
      return res.json({ success: true, employees, shifts, rosters });
    }
    res.render("hr/roster", { employees, shifts, rosters });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to load roster" });
    res.status(500).send("Error loading roster scheduler");
  }
});

// POST /hr/roster/assign - Assign shift to employee
router.post("/roster/assign", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { employeeId, shiftId, startDate, endDate } = req.body;
  try {
    if (!employeeId || !shiftId || !startDate || !endDate) {
      if (isJson) return res.status(400).json({ error: "All fields are required" });
      return res.redirect("/hr/roster?error=missing_fields");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      if (isJson) return res.status(400).json({ error: "Start date cannot exceed end date" });
      return res.redirect("/hr/roster?error=invalid_dates");
    }

    // Overwrite existing rosters for the employee within the date range
    await Roster.deleteMany({
      employeeId,
      $or: [
        { startDate: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } }
      ]
    });

    const newRoster = await Roster.create({
      employeeId,
      shiftId,
      startDate: start,
      endDate: end,
      createdBy: req.session.employeeId
    });

    if (isJson) {
      return res.json({ success: true, message: "Roster assigned successfully", roster: newRoster });
    }
    res.redirect("/hr/roster");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to assign roster" });
    res.redirect("/hr/roster?error=failed_to_assign");
  }
});

module.exports = router;
