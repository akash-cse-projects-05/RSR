const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Timesheet = require("../models/Timesheet");
const Employee = require("../models/Employee");

// Middleware to protect Employee routes
function requireAuth(req, res, next) {
  if (!req.session.userId || !req.session.employeeId) {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
    if (isJson) return res.status(401).json({ error: "Unauthorized. Session required." });
    return res.redirect("/auth/login");
  }
  next();
}

// Middleware to protect HR and Manager routes
async function hrAuth(req, res, next) {
  if (!req.session.userId) {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
    if (isJson) return res.status(401).json({ error: "Unauthorized. Session required." });
    return res.redirect("/auth/login");
  }

  // Allow if role is HR
  if (req.session.role === "HR") {
    return next();
  }

  // Allow if employee's designation is MANAGER
  if (req.session.employeeId) {
    try {
      const employee = await Employee.findById(req.session.employeeId);
      if (employee && employee.designation === "MANAGER") {
        return next();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  if (isJson) return res.status(403).json({ error: "Forbidden. HR or Manager access required." });
  return res.redirect("/dashboard?error=access_denied");
}

// ----------------------------------------------------
// EMPLOYEE TIMESHEETS
// ----------------------------------------------------

// GET /timesheets/my-timesheets
router.get("/timesheets/my-timesheets", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
      if (isJson) return res.status(404).json({ error: "Employee profile not found" });
      return res.redirect("/auth/login");
    }

    const projects = await Project.find({
      status: "Active",
      departments: employee.department
    }).sort({ name: 1 });

    const timesheets = await Timesheet.find({ employeeId: req.session.employeeId })
      .populate("projectId")
      .sort({ date: -1 });

    if (isJson) {
      return res.json({ success: true, projects, timesheets });
    }
    res.render("employee/timesheet", { projects, timesheets });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to fetch timesheets" });
    res.status(500).send("Error loading timesheets page");
  }
});

// POST /timesheets/my-timesheets/log
router.post("/timesheets/my-timesheets/log", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { projectId, date, hoursWorked, description } = req.body;
  try {
    if (!projectId || !date || !hoursWorked || !description) {
      if (isJson) return res.status(400).json({ error: "All fields are required" });
      return res.redirect("/timesheets/my-timesheets?error=missing_fields");
    }

    const timesheet = await Timesheet.create({
      employeeId: req.session.employeeId,
      projectId,
      date: new Date(date),
      hoursWorked: parseFloat(hoursWorked),
      description
    });

    if (isJson) {
      return res.json({ success: true, timesheet });
    }
    res.redirect("/timesheets/my-timesheets");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to log timesheet" });
    res.redirect("/timesheets/my-timesheets?error=failed_to_log");
  }
});

// ----------------------------------------------------
// HR PROJECT BILLING
// ----------------------------------------------------

// GET /hr/timesheets
router.get("/hr/timesheets", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    let projectQuery = {};
    let timesheetQuery = {};

    if (req.session.role !== "HR" && req.session.employeeId) {
      const manager = await Employee.findById(req.session.employeeId);
      if (manager) {
        // Managers only see projects in their department
        projectQuery = { departments: manager.department };
        const managedEmployees = await Employee.find({ reportingManager: req.session.employeeId });
        timesheetQuery = { employeeId: { $in: managedEmployees.map(e => e._id) } };
      }
    }

    const projects = await Project.find(projectQuery).sort({ name: 1 });
    const timesheets = await Timesheet.find(timesheetQuery)
      .populate("employeeId")
      .populate("projectId")
      .sort({ date: -1 });

    if (isJson) {
      return res.json({ success: true, projects, timesheets });
    }
    res.render("hr/timesheets", { projects, timesheets });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to load timesheets dashboard" });
    res.status(500).send("Error loading timesheets dashboard");
  }
});

// POST /hr/timesheets/project/add
router.post("/hr/timesheets/project/add", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { name, client, description, deadline, departments } = req.body;
  try {
    if (!name || !client) {
      if (isJson) return res.status(400).json({ error: "Name and Client are required" });
      return res.redirect("/hr/timesheets?error=missing_fields");
    }

    let parsedDepts = [];
    if (departments) {
      parsedDepts = Array.isArray(departments) ? departments : [departments];
    }

    // Default to creator's department if empty and creator is a Manager
    if (parsedDepts.length === 0 && req.session.role !== "HR" && req.session.employeeId) {
      const manager = await Employee.findById(req.session.employeeId);
      if (manager) {
        parsedDepts = [manager.department];
      }
    }

    const project = await Project.create({
      name,
      client,
      description,
      deadline: deadline ? new Date(deadline) : null,
      departments: parsedDepts
    });

    if (isJson) {
      return res.json({ success: true, project });
    }
    res.redirect("/hr/timesheets");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to create project" });
    res.redirect("/hr/timesheets?error=failed_to_create");
  }
});

// POST /hr/timesheets/approve/:id
router.post("/hr/timesheets/approve/:id", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      if (isJson) return res.status(404).json({ error: "Timesheet not found" });
      return res.redirect("/hr/timesheets?error=not_found");
    }

    timesheet.status = "Approved";
    await timesheet.save();

    if (isJson) {
      return res.json({ success: true, timesheet });
    }
    res.redirect("/hr/timesheets");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to approve timesheet" });
    res.redirect("/hr/timesheets?error=failed_to_approve");
  }
});

module.exports = router;
