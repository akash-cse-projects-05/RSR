const express = require("express");
const router = express.Router();
const Goal = require("../models/Goal");
const Appraisal = require("../models/Appraisal");
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
// EMPLOYEE GOALS
// ----------------------------------------------------

// GET /performance/my-goals
// GET /performance/my-goals
router.get("/performance/my-goals", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const goals = await Goal.find({ employeeId: req.session.employeeId }).sort({ targetDate: 1 });
    if (isJson) {
      return res.json({ success: true, goals });
    }
    res.render("employee/goals", { goals });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to fetch goals" });
    res.status(500).send("Error loading goals");
  }
});

// POST /performance/my-goals/add
router.post("/performance/my-goals/add", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { title, description, targetDate, keyResults } = req.body;
  try {
    if (!title || !targetDate) {
      if (isJson) return res.status(400).json({ error: "Title and target date are required" });
      return res.redirect("/performance/my-goals?error=missing_fields");
    }

    // Parse key results
    let formattedKeyResults = [];
    if (keyResults) {
      const krs = Array.isArray(keyResults) ? keyResults : [keyResults];
      formattedKeyResults = krs.filter(Boolean).map(text => ({ text, completed: false }));
    }

    const goal = await Goal.create({
      employeeId: req.session.employeeId,
      title,
      description,
      targetDate: new Date(targetDate),
      keyResults: formattedKeyResults
    });

    if (isJson) {
      return res.json({ success: true, goal });
    }
    res.redirect("/performance/my-goals");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to create goal" });
    res.redirect("/performance/my-goals?error=failed_to_create");
  }
});

// POST /performance/my-goals/update-progress/:id
router.post("/performance/my-goals/update-progress/:id", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { progress, status, completedKrs } = req.body;
  try {
    const goal = await Goal.findOne({ _id: req.params.id, employeeId: req.session.employeeId });
    if (!goal) {
      if (isJson) return res.status(404).json({ error: "Goal not found" });
      return res.redirect("/performance/my-goals?error=not_found");
    }

    if (progress !== undefined) goal.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
    if (status) goal.status = status;

    // Optional: toggle completed state of key results
    if (completedKrs && Array.isArray(completedKrs)) {
      goal.keyResults.forEach(kr => {
        kr.completed = completedKrs.includes(kr._id.toString());
      });
    }

    await goal.save();

    if (isJson) {
      return res.json({ success: true, goal });
    }
    res.redirect("/performance/my-goals");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to update goal" });
    res.redirect("/performance/my-goals?error=failed_to_update");
  }
});

// ----------------------------------------------------
// EMPLOYEE SELF APPRAISALS
// ----------------------------------------------------

// GET /performance/my-appraisals
router.get("/performance/my-appraisals", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    const appraisals = await Appraisal.find({ employeeId: req.session.employeeId }).sort({ createdAt: -1 });
    if (isJson) {
      return res.json({ success: true, appraisals });
    }
    res.render("employee/appraisal", { appraisals });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to fetch appraisals" });
    res.status(500).send("Error loading appraisals page");
  }
});

// POST /performance/my-appraisals/submit/:id
router.post("/performance/my-appraisals/submit/:id", requireAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { selfRating, selfComments } = req.body;
  try {
    const appraisal = await Appraisal.findOne({ _id: req.params.id, employeeId: req.session.employeeId });
    if (!appraisal) {
      if (isJson) return res.status(404).json({ error: "Appraisal request not found" });
      return res.redirect("/performance/my-appraisals?error=not_found");
    }

    appraisal.selfRating = selfRating ? parseInt(selfRating, 10) : null;
    appraisal.selfComments = selfComments;
    appraisal.status = "Manager-Review";
    await appraisal.save();

    if (isJson) {
      return res.json({ success: true, appraisal });
    }
    res.redirect("/performance/my-appraisals");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to submit self-appraisal" });
    res.redirect("/performance/my-appraisals?error=failed_to_submit");
  }
});

// ----------------------------------------------------
// HR PERFORMANCE OPERATIONS
// ----------------------------------------------------

// GET /hr/appraisals - Review cycle dashboard
router.get("/hr/appraisals", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
  try {
    let appraisalQuery = {};
    let employeeQuery = { status: "Active" };

    if (req.session.role !== "HR" && req.session.employeeId) {
      const managedEmployees = await Employee.find({ reportingManager: req.session.employeeId });
      const managedIds = managedEmployees.map(e => e._id);
      appraisalQuery = { employeeId: { $in: managedIds } };
      employeeQuery = { status: "Active", reportingManager: req.session.employeeId };
    }

    const appraisals = await Appraisal.find(appraisalQuery).populate("employeeId").sort({ createdAt: -1 });
    const employees = await Employee.find(employeeQuery).sort({ firstName: 1 });
    
    if (isJson) {
      return res.json({ success: true, appraisals, employees });
    }
    res.render("hr/appraisals", { appraisals, employees });
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to load appraisals" });
    res.status(500).send("Error loading appraisals");
  }
});

// POST /hr/appraisals/cycle/create - Create standard appraisal requests for all active employees
router.post("/hr/appraisals/cycle/create", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { cycleName } = req.body;
  try {
    if (!cycleName) {
      if (isJson) return res.status(400).json({ error: "Cycle name is required" });
      return res.redirect("/hr/appraisals?error=missing_cycle_name");
    }

    let employeeQuery = { status: "Active" };
    if (req.session.role !== "HR" && req.session.employeeId) {
      employeeQuery.reportingManager = req.session.employeeId;
    }

    const employees = await Employee.find(employeeQuery);
    const createdAppraisals = [];

    for (const emp of employees) {
      // Avoid duplicate appraisal cycles for the same employee
      const existing = await Appraisal.findOne({ employeeId: emp._id, cycleName });
      if (!existing) {
        const app = await Appraisal.create({
          employeeId: emp._id,
          cycleName,
          status: "Self-Appraisal"
        });
        createdAppraisals.push(app);
      }
    }

    if (isJson) {
      return res.json({ success: true, message: `Created appraisal requests for ${createdAppraisals.length} employees` });
    }
    res.redirect("/hr/appraisals");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to launch appraisal cycle" });
    res.redirect("/hr/appraisals?error=failed_to_launch");
  }
});

// POST /hr/appraisals/review/:id - Submit manager rating and complete review
router.post("/hr/appraisals/review/:id", hrAuth, async (req, res) => {
  const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json') || req.body.format === 'json';
  const { managerRating, managerComments } = req.body;
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) {
      if (isJson) return res.status(404).json({ error: "Appraisal not found" });
      return res.redirect("/hr/appraisals?error=not_found");
    }

    appraisal.managerId = req.session.employeeId;
    appraisal.managerRating = managerRating ? parseInt(managerRating, 10) : null;
    appraisal.managerComments = managerComments;
    appraisal.status = "Completed";
    await appraisal.save();

    if (isJson) {
      return res.json({ success: true, appraisal });
    }
    res.redirect("/hr/appraisals");
  } catch (err) {
    console.error(err);
    if (isJson) return res.status(500).json({ error: "Failed to review appraisal" });
    res.redirect("/hr/appraisals?error=failed_to_review");
  }
});

module.exports = router;
